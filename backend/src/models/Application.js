
import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
{
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },

  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employer",
    required: true,
  },

  // 🔹 ADD THIS (you were missing worker link)
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker"
  },

  applicantName: String,
  applicantContact: String,
  message: String,

  // ⭐ Rating System
  rating: Number,
  review: String,

  // ⭐ Job Status Flow
  status: {
    type: String,
    enum: ["accepted", "on_the_way", "arrived", "completed"],
    default: "accepted"
  },

  isCompleted: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

export default mongoose.model("Application", applicationSchema);