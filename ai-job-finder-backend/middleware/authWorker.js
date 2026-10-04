import jwt from "jsonwebtoken";

// Verifies the worker's JWT (issued on OTP verification / registration) and
// attaches the decoded payload ({ id, phone }) to req.workerAuth.
// Route handlers are responsible for checking that the resource being
// accessed (a profile id, a phone number, etc.) belongs to req.workerAuth.
const authWorker = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.workerAuth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authWorker;
