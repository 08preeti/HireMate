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
    applicantName: String,
    applicantContact: String,
    message: String,
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);

