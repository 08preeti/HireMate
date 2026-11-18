// Puts a photo on every job that has none, choosing the picture by the job's trade.
//
// 1. Put your pictures in  backend/job-photos/  named after the trade (see TRADES below), e.g.
//      concrete.jpg  driver.jpg  cook.jpg  security.jpg  cleaning.jpg  electrician.jpg ...
//    and one  default.jpg  that is used for any job whose trade has no picture.
//    JPG / PNG / WebP, each under 500 KB.
// 2. Preview:   node scripts/setJobPhotos.js --dry-run
// 3. Apply:     node scripts/setJobPhotos.js
//    Add --force to also replace photos that jobs already have.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";

const DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "job-photos",
);
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// picture name -> words in the job title / skills that mean this trade (first match wins)
export const TRADES = [
  ["concrete", /concrete|\bslab\b|\bcement\b|\brmc\b/],
  ["mason", /mason|bricklayer|plaster|tile|\btiling\b/],
  ["electrician", /electric|wiring|weld/],
  ["plumber", /plumb|pipe fit/],
  ["painter", /paint/],
  ["carpenter", /carpent|furniture|woodwork/],
  ["mechanic", /mechanic|garage|repair/],
  ["driver", /driver|\bcab\b|\bcar\b|\btruck\b|\bauto\b|rickshaw|\btempo\b/],
  ["delivery", /deliver|courier|\bloader\b|\bloading\b|warehouse/],
  [
    "cook",
    /\bcook\b|\bchef\b|kitchen|waiter|restaurant|catering|\btea\b|\bdhaba\b/,
  ],
  ["security", /security|guard|watchman/],
  ["cleaning", /clean|sweep|\bmaid\b|housekeep|\bhouse\b|\bjanitor\b/],
  ["gardener", /garden|\bmali\b|landscap/],
  ["helper", /helper|labou?r|construction|\bcoolie\b/],
];

/** Which picture name suits this job ("default" when no trade matches). */
export function tradeFor(job) {
  const text = [job.jobTitle?.en, job.skills?.en, job.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return TRADES.find(([, re]) => re.test(text))?.[0] ?? "default";
}

function findFile(name) {
  for (const ext of EXTENSIONS) {
    const file = path.join(DIR, name + ext);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  if (!fs.existsSync(DIR)) {
    console.error(
      `❌ Folder not found: ${DIR}\n   Create it and put your pictures there (see the top of this file).`,
    );
    process.exit(1);
  }

  // Imported here so the matching rules above can be tested without a database.
  const { connectDB } = await import("../src/config/db.js");
  const { default: Job } = await import("../src/models/Job.js");
  const { parsePhotoInput, resolvePhotos } =
    await import("../src/services/jobPhotos.js");

  const cache = new Map(); // picture name -> stored photo (or null)
  const load = (name) => {
    if (cache.has(name)) return cache.get(name);
    const file = findFile(name);
    let photo = null;
    if (file) {
      const ext = path.extname(file).toLowerCase();
      const type =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      try {
        [photo] = resolvePhotos(
          parsePhotoInput([
            `data:${type};base64,${fs.readFileSync(file).toString("base64")}`,
          ]),
        );
      } catch (e) {
        const kb = Math.round(fs.statSync(file).size / 1024);
        console.warn(
          `⚠️  ${path.basename(file)} (${kb} KB) skipped: ${e.message}. Keep each picture under 500 KB (resize it at squoosh.app).`,
        );
      }
    }
    cache.set(name, photo);
    return photo;
  };

  await connectDB(); // same database as the server (never "test")
  const jobs = await Job.find(
    force
      ? {}
      : { $or: [{ photoCount: 0 }, { photoCount: { $exists: false } }] },
  ).select("jobTitle skills category photoCount");
  console.log(
    `${jobs.length} job(s) ${force ? "to update" : "without photos"}${dry ? " (dry run, nothing is saved)" : ""}\n`,
  );

  let set = 0;
  let skipped = 0;
  for (const job of jobs) {
    const trade = tradeFor(job);
    const wanted = load(trade) ? trade : "default";
    const photo = load(wanted);
    const title = job.jobTitle?.en || String(job._id);
    if (!photo) {
      skipped++;
      console.log(
        `– ${title}: no picture for "${trade}" (add ${trade}.jpg or default.jpg), skipped`,
      );
      continue;
    }
    console.log(`✓ ${title} → ${wanted}`);
    if (!dry)
      await Job.updateOne(
        { _id: job._id },
        { $set: { photos: [photo], photoCount: 1 }, $inc: { revision: 1 } },
      );
    set++;
  }

  console.log(
    `\nDone: ${set} ${dry ? "would be set" : "set"}, ${skipped} skipped.`,
  );
  await mongoose.disconnect();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
