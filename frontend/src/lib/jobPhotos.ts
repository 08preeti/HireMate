import { API_URL } from "@/config/env";

export const MAX_JOB_PHOTOS = 4;
const TARGET_BYTES = 450 * 1024; // the server accepts up to 600 KB per photo

/** URL of one job photo. `version` (the job's revision) makes the browser fetch it again after an edit. */
export const jobPhotoUrl = (jobId: string, index: number, version?: number): string =>
  `${API_URL}/api/jobs/${jobId}/photos/${index}${version !== undefined ? `?v=${version}` : ""}`;

export const jobPhotoUrls = (job: { _id: string; photoCount?: number; revision?: number }): string[] =>
  Array.from({ length: Math.min(job.photoCount ?? 0, MAX_JOB_PHOTOS) }, (_, i) => jobPhotoUrl(job._id, i, job.revision));

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

/**
 * Shrinks a photo from the phone camera (often 4–8 MB) to a ~1280px JPEG of a few hundred KB, in the
 * browser, so posting works on slow mobile data. Returns a data URL. Throws a message fit to show the user.
 */
export async function compressImage(file: File, maxSide = 1280): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  let img: HTMLImageElement;
  try {
    img = await load(file); // the browser applies the camera's rotation itself
  } catch {
    throw new Error("This photo could not be read. Please use a JPG or PNG image.");
  }
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process photos.");
  ctx.fillStyle = "#fff"; // PNGs with transparency would turn black as JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.82;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length * 0.75 > TARGET_BYTES && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  return out;
}