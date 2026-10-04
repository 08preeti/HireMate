// Run this once to add sample jobs for the presentation
// Command: node seed.js
// Run from: ai-job-finder-backend/

import mongoose from "mongoose";
import dotenv from "dotenv";
import Job from "./models/Job.js";
import Employer from "./models/employerModel.js";
import bcrypt from "bcryptjs";

dotenv.config();

const SAMPLE_JOBS = [
  {
    jobTitle: { en: "Cook", hi: "रसोइया", mr: "स्वयंपाकी" },
    description: { en: "Need an experienced cook for a restaurant. Morning shift 7am-2pm.", hi: "रेस्टोरेंट के लिए अनुभवी रसोइया चाहिए।", mr: "हॉटेलसाठी अनुभवी स्वयंपाकी हवा." },
    skills: { en: "Cooking, Kitchen", hi: "खाना बनाना", mr: "स्वयंपाक" },
    location: { en: "Nashik, Maharashtra", hi: "नासिक, महाराष्ट्र", mr: "नाशिक, महाराष्ट्र" },
    latitude: 19.9975,  longitude: 73.7898,
    salary: 800, paymentMethod: "Cash", isUrgent: true, status: "active",
  },
  {
    jobTitle: { en: "Electrician", hi: "इलेक्ट्रीशियन", mr: "इलेक्ट्रिशियन" },
    description: { en: "Home wiring work needed. 2-3 days job.", hi: "घर की वायरिंग का काम चाहिए।", mr: "घराचे वायरिंग काम हवे." },
    skills: { en: "Wiring, Electrical", hi: "वायरिंग", mr: "वायरिंग" },
    location: { en: "Nashik Road, Nashik", hi: "नासिक रोड, नासिक", mr: "नाशिक रोड, नाशिक" },
    latitude: 19.9716, longitude: 73.8014,
    salary: 1000, paymentMethod: "UPI", isUrgent: false, status: "active",
  },
  {
    jobTitle: { en: "Driver", hi: "ड्राइवर", mr: "चालक" },
    description: { en: "Need driver for school van. Monday to Saturday.", hi: "स्कूल वैन के लिए ड्राइवर चाहिए।", mr: "शाळेच्या व्हॅनसाठी चालक हवा." },
    skills: { en: "Driving, LMV License", hi: "ड्राइविंग", mr: "वाहन चालवणे" },
    location: { en: "Trimbakeshwar Road, Nashik", hi: "त्र्यंबकेश्वर रोड, नासिक", mr: "त्र्यंबकेश्वर रोड, नाशिक" },
    latitude: 19.9321, longitude: 73.8427,
    salary: 15000, paymentMethod: "UPI", isUrgent: false, status: "active",
  },
  {
    jobTitle: { en: "Plumber", hi: "प्लम्बर", mr: "प्लंबर" },
    description: { en: "Bathroom fitting and pipeline work.", hi: "बाथरूम फिटिंग और पाइपलाइन काम।", mr: "बाथरूम फिटिंग आणि पाइपलाइन काम." },
    skills: { en: "Plumbing, Pipe fitting", hi: "प्लंबिंग", mr: "प्लंबिंग" },
    location: { en: "Gangapur Road, Nashik", hi: "गंगापुर रोड, नासिक", mr: "गंगापूर रोड, नाशिक" },
    latitude: 20.0112, longitude: 73.7734,
    salary: 900, paymentMethod: "Cash", isUrgent: true, status: "active",
  },
  {
    jobTitle: { en: "Security Guard", hi: "सुरक्षा गार्ड", mr: "सुरक्षारक्षक" },
    description: { en: "Night shift security guard needed for warehouse.", hi: "गोदाम के लिए रात की पाली में गार्ड चाहिए।", mr: "गोदामासाठी रात्री पाळीत गार्ड हवा." },
    skills: { en: "Security, Night shift", hi: "सुरक्षा", mr: "सुरक्षा" },
    location: { en: "MIDC Satpur, Nashik", hi: "MIDC सातपुर, नासिक", mr: "MIDC सातपूर, नाशिक" },
    latitude: 19.9876, longitude: 73.7654,
    salary: 12000, paymentMethod: "UPI", isUrgent: false, status: "active",
  },
  {
    jobTitle: { en: "Painter", hi: "पेंटर", mr: "रंगारी" },
    description: { en: "Wall painting for 3BHK flat. 4-5 days work.", hi: "3BHK फ्लैट की दीवारों की पेंटिंग।", mr: "3BHK फ्लॅटच्या भिंतींचे रंगकाम." },
    skills: { en: "Painting, Wall finish", hi: "पेंटिंग", mr: "रंगकाम" },
    location: { en: "Dwarka, Nashik", hi: "द्वारका, नासिक", mr: "द्वारका, नाशिक" },
    latitude: 20.0023, longitude: 73.8123,
    salary: 700, paymentMethod: "Cash", isUrgent: false, status: "active",
  },
  {
    jobTitle: { en: "House Maid", hi: "घरेलू काम", mr: "घरकाम" },
    description: { en: "Daily cleaning and cooking for family of 4.", hi: "4 लोगों के परिवार के लिए सफाई और खाना।", mr: "4 जणांच्या कुटुंबासाठी सफाई आणि स्वयंपाक." },
    skills: { en: "Cleaning, Cooking", hi: "सफाई, खाना", mr: "सफाई, स्वयंपाक" },
    location: { en: "Panchavati, Nashik", hi: "पंचवटी, नासिक", mr: "पंचवटी, नाशिक" },
    latitude: 20.0058, longitude: 73.7914,
    salary: 6000, paymentMethod: "Cash", isUrgent: true, status: "active",
  },
  {
    jobTitle: { en: "Delivery Boy", hi: "डिलीवरी बॉय", mr: "डिलिव्हरी बॉय" },
    description: { en: "Parcel delivery on bike. Own bike required.", hi: "बाइक पर पार्सल डिलीवरी। खुद की बाइक जरूरी।", mr: "बाइकवर पार्सल डिलिव्हरी. स्वतःची बाइक आवश्यक." },
    skills: { en: "Bike riding, Delivery", hi: "बाइक चलाना", mr: "बाइक चालवणे" },
    location: { en: "College Road, Nashik", hi: "कॉलेज रोड, नासिक", mr: "कॉलेज रोड, नाशिक" },
    latitude: 20.0156, longitude: 73.7876,
    salary: 500, paymentMethod: "Cash", isUrgent: true, status: "active",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create a demo employer if not exists
    let employer = await Employer.findOne({ email: "demo@hiremate.com" });
    if (!employer) {
      const hash = await bcrypt.hash("demo1234", 10);
      employer = await Employer.create({
        companyName: "HireMate Demo",
        email: "demo@hiremate.com",
        password: hash,
      });
      console.log("✅ Demo employer created");
      console.log("   Email: demo@hiremate.com");
      console.log("   Password: demo1234");
    }

    // Check if jobs already exist
    const existingCount = await Job.countDocuments({ status: "active" });
    if (existingCount >= 5) {
      console.log(`ℹ️  ${existingCount} jobs already exist. Skipping seed.`);
      console.log("   Delete existing jobs first if you want to reseed.");
      process.exit(0);
    }

    // Add sample jobs
    for (const jobData of SAMPLE_JOBS) {
      await Job.create({ ...jobData, employer: employer._id });
    }

    console.log(`✅ ${SAMPLE_JOBS.length} sample jobs added!`);
    console.log("\n📱 Your app now has demo data for the presentation.");
    console.log("🔗 Live URL: https://hiremate-brown.vercel.app");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

seed();