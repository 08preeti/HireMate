import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    skills: String,
    location: String
  },
  { timestamps: true }
);

export default mongoose.model("Worker", workerSchema);
