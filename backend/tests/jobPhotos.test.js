import test from "node:test";
import assert from "node:assert/strict";
import { parsePhotoInput, resolvePhotos, MAX_JOB_PHOTOS } from "../src/services/jobPhotos.js";
import { parseJobInput } from "../src/validators/jobValidators.js";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50, 2)]);
const url = (type, buf) => `data:${type};base64,${buf.toString("base64")}`;

test("accepts real jpeg/png data URLs and existing: tokens", () => {
  const out = parsePhotoInput([url("image/jpeg", JPEG), url("image/png", PNG), "existing:0"]);
  assert.equal(out[0].contentType, "image/jpeg");
  assert.equal(out[1].contentType, "image/png");
  assert.deepEqual(out[2], { keep: 0 });
});

test("the real file type wins over the declared one", () => {
  const [p] = parsePhotoInput([url("image/jpeg", PNG)]);
  assert.equal(p.contentType, "image/png");
});

test("rejects non-images, wrong formats, SVG and non-strings", () => {
  assert.throws(() => parsePhotoInput([url("image/jpeg", Buffer.from("<script>alert(1)</script>"))]), /not a valid image/);
  assert.throws(() => parsePhotoInput(["data:image/svg+xml;base64,PHN2Zy8+"]), /JPG, PNG or WebP/);
  assert.throws(() => parsePhotoInput(["https://evil.test/x.jpg"]), /JPG, PNG or WebP/);
  assert.throws(() => parsePhotoInput([42]), /must be an image/);
  assert.throws(() => parsePhotoInput("nope"), /must be a list/);
});

test("limits the number and the size of photos", () => {
  assert.throws(() => parsePhotoInput(Array(MAX_JOB_PHOTOS + 1).fill(url("image/jpeg", JPEG))), /up to 4/);
  const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(700 * 1024)]);
  assert.throws(() => parsePhotoInput([url("image/jpeg", big)]), /too large/);
});

test("resolvePhotos keeps, reorders and drops existing photos", () => {
  const existing = [{ contentType: "image/jpeg", data: JPEG }, { contentType: "image/png", data: PNG }];
  const out = resolvePhotos([{ keep: 1 }, { keep: 0 }], existing);
  assert.equal(out[0].contentType, "image/png");
  assert.equal(out[1].contentType, "image/jpeg");
  assert.throws(() => resolvePhotos([{ keep: 5 }], existing), /no longer exists/);
});

test("job validator passes photos through and reports bad ones against the photos field", () => {
  const body = { jobTitle: "Mason", location: "Nashik", salary: 800, photos: [url("image/jpeg", JPEG)] };
  assert.equal(parseJobInput(body).photos.length, 1);
  assert.equal(parseJobInput({ jobTitle: "Mason", location: "Nashik", salary: 800 }).photos, undefined);
  assert.throws(() => parseJobInput({ ...body, photos: ["bad"] }), (e) => e.status === 400 && e.extra.field === "photos");
});