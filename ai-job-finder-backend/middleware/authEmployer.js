/*  import jwt from "jsonwebtoken";
import Employer from "../models/employerModel.js";

const authEmployer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.employer = await Employer.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authEmployer;  */


import jwt from "jsonwebtoken";
import Employer from "../models/employerModel.js";

const authEmployer = async (req, res, next) => {
  try {
    console.log("AUTH HEADER:", req.headers.authorization);

    const token = req.headers.authorization?.split(" ")[1];
    console.log("TOKEN:", token);

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED:", decoded);

    const employer = await Employer.findById(decoded.id);
    console.log("EMPLOYER FOUND:", employer);

    if (!employer) {
      return res.status(401).json({ message: "Employer not found" });
    }

    req.employer = employer;
    next();
  } catch (error) {
    console.log("JWT ERROR:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authEmployer;
