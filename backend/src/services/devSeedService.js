import Employer from "../models/Employer.js";
import Job from "../models/Job.js";
import Worker from "../models/Worker.js";
import bcrypt from "bcryptjs";

const DEMO_JOBS = [
  {
    jobTitle: { en: "Painter", hi: "पेंटर", mr: "रंगारी" },
    description: { en: "Exterior and interior wall painting work for residential house." },
    skills: { en: "Painting, Wall Putty", hi: "पेंटिंग", mr: "रंगकाम" },
    location: { en: "Govind Nagar Road, Govind Nagar, Nashik, Maharashtra" },
    salary: 850,
    dailyWage: 850,
    vacancies: 2,
    filledPositions: 0,
    latitude: 19.9885,
    longitude: 73.7845,
    status: "active",
  },
  {
    jobTitle: { en: "Mason (Mistri)", hi: "राजमिस्त्री", mr: "गवंडी" },
    description: { en: "Brick work and plastering for commercial site." },
    skills: { en: "Masonry, Plaster", hi: "राजमिस्त्री", mr: "गवंडी" },
    location: { en: "Untwadi Rd, Nashik, Maharashtra" },
    salary: 950,
    dailyWage: 950,
    vacancies: 3,
    filledPositions: 0,
    latitude: 19.9920,
    longitude: 73.7780,
    status: "active",
  },
  {
    jobTitle: { en: "Electrician", hi: "इलेक्ट्रीशियन", mr: "इलेक्ट्रिशियन" },
    description: { en: "Home wiring and switchboard replacement." },
    skills: { en: "Wiring, Electrical", hi: "वायरिंग", mr: "वायरिंग" },
    location: { en: "Gangapur Road, Nashik, Maharashtra" },
    salary: 900,
    dailyWage: 900,
    vacancies: 1,
    filledPositions: 0,
    latitude: 20.0115,
    longitude: 73.7622,
    status: "active",
  },
  {
    jobTitle: { en: "Carpenter", hi: "बढ़ई", mr: "सुतार" },
    description: { en: "Furniture repair and kitchen cabinet assembly." },
    skills: { en: "Carpentry, Woodwork", hi: "बढ़ई", mr: "सुतार" },
    location: { en: "Parijat Nagar, Nashik, Maharashtra" },
    salary: 900,
    dailyWage: 900,
    vacancies: 1,
    filledPositions: 0,
    latitude: 19.9950,
    longitude: 73.7710,
    status: "active",
  },
];

export async function seedDevelopmentData() {
  try {
    // 1. Create Demo Employer if none exists
    let employer = await Employer.findOne({ email: "demo@hiremate.com" });
    if (!employer) {
      const hash = await bcrypt.hash("demo1234", 10);
      employer = await Employer.create({
        companyName: "HireMate Demo Builders",
        name: "Demo Employer",
        email: "demo@hiremate.com",
        phone: "9876543210",
        password: hash,
        location: "Nashik, Maharashtra",
      });
      console.log("   ✅ Seeded demo employer: demo@hiremate.com / demo1234");
    }

    // 2. Create Demo Worker if none exists
    let worker = await Worker.findOne({ phone: "9876501234" });
    if (!worker) {
      worker = await Worker.create({
        name: "Ramesh Pawar",
        phone: "9876501234",
        skills: "Painter, Mason",
        location: "Nashik, Maharashtra",
        rating: 4.8,
        totalReviews: 12,
      });
      console.log("   ✅ Seeded demo worker: Ramesh Pawar (9876501234)");
    }

    // 3. Seed active jobs if database is empty
    const count = await Job.countDocuments({ status: "active" });
    if (count === 0) {
      for (const j of DEMO_JOBS) {
        await Job.create({ ...j, employer: employer._id });
      }
      console.log(`   ✅ Seeded ${DEMO_JOBS.length} demo active jobs in Nashik`);
    }
  } catch (err) {
    console.warn("   ⚠️ Dev data seeding skipped:", err.message);
  }
}
