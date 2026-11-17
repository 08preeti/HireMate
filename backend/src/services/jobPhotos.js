import { HttpError } from "../utils/httpError.js";

export const MAX_JOB_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 600 * 1024; // per photo, after decoding (the form shrinks photos to ~150 KB first)

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const KEEP = /^existing:(\d{1,2})$/;

// The first bytes of a real file decide its type; the declared type is never trusted.
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/**
 * Checks the photos part of a job body. Each item is either a new photo as a data URL, or
 * "existing:<n>" (keep the n-th photo the job already has; only meaningful when editing).
 * Returns a cleaned list of { keep: n } | { contentType, data: Buffer }.
 */
export function parsePhotoInput(value) {
  if (!Array.isArray(value)) throw new HttpError(400, "Photos must be a list", { field: "photos", errors: { photos: "Photos must be a list" } });
  const bad = (message) => new HttpError(400, message, { field: "photos", errors: { photos: message } });
  if (value.length > MAX_JOB_PHOTOS) throw bad(`You can add up to ${MAX_JOB_PHOTOS} photos`);

  return value.map((item) => {
    if (typeof item !== "string") throw bad("Each photo must be an image");
    const keep = KEEP.exec(item);
    if (keep) return { keep: Number(keep[1]) };
    const m = DATA_URL.exec(item);
    if (!m) throw bad("Photos must be JPG, PNG or WebP images");
    const data = Buffer.from(m[2], "base64");
    if (data.length > MAX_PHOTO_BYTES) throw bad("One of the photos is too large. Please choose a smaller image");
    const real = sniff(data);
    if (!real) throw bad("One of the files is not a valid image");
    return { contentType: real, data };
  });
}

/** Turns parsed items into the stored list, resolving "keep" against the photos the job has now. */
export function resolvePhotos(items, existing = []) {
  return items.map((p) => {
    if (p.keep === undefined) return { contentType: p.contentType, data: p.data };
    const old = existing[p.keep];
    if (!old) throw new HttpError(400, "A photo you kept no longer exists. Reload and try again.", { field: "photos", errors: { photos: "A kept photo no longer exists" } });
    return { contentType: old.contentType, data: old.data };
  });
}