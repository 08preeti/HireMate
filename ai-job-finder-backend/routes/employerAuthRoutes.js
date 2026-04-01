/*import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Employer from "../models/employerModel.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { companyName, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await Employer.create({
    companyName,
    email,
    password: hashedPassword
  });

  res.json({ success: true });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const employer = await Employer.findOne({ email });
  if (!employer)
    return res.status(401).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, employer.password);
  if (!isMatch)
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: employer._id }, process.env.JWT_SECRET);

  res.json({
    token,
    employer: { companyName: employer.companyName }
  });
});

export default router; */


//--------------------
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Employer from "../models/employerModel.js";

const router = express.Router();

// POST /api/employer/register
router.post("/register", async (req, res) => {
  try {
    const { companyName, email, password } = req.body;

    if (!companyName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // ✅ FIXED: check for duplicate email before creating
    const existing = await Employer.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Employer.create({ companyName, email, password: hashedPassword });

    res.json({ success: true, message: "Registered successfully" });
  } catch (err) {
    // ✅ FIXED: was no try/catch — any DB error crashed the server
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// POST /api/employer/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const employer = await Employer.findOne({ email });
    if (!employer) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, employer.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ FIXED: was missing expiresIn — tokens never expired before
    const token = jwt.sign(
      { id: employer._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      employer: {
        _id: employer._id,
        companyName: employer.companyName,
        email: employer.email,
      },
    });
  } catch (err) {
    // ✅ FIXED: was no try/catch
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

export default router;
