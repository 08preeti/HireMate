import jwt from "jsonwebtoken";
import Employer from "../models/employerModel.js";

const authEmployer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employer = await Employer.findById(decoded.id).select("-password");

    if (!employer) {
      return res.status(401).json({ message: "Employer not found" });
    }

    req.employer = employer;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authEmployer;
