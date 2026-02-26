import express from "express";
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

export default router;
