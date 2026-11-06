import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    skills: String,
    location: String,
    gender: { type: String, enum: ["male", "female", ""], default: "" },

    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    currentLocation: { lat: Number, lng: Number },
    about: { type: String, default: "" },
    experienceYears: { type: Number, min: 0, max: 60 },
    experienceDetails: { type: String, default: "" },
    serviceAreas: { type: [String], default: [] },
    availability: {
      isAvailable: { type: Boolean, default: true },
      days: { type: [String], default: [] },
      from: { type: String, default: "" },
      to: { type: String, default: "" },
    },

    // OTP stored in DB — survives server restarts/spin-downs
    otp: String,
    otpExpires: Date,
  },
  { timestamps: true },
);

export default mongoose.model("Worker", workerSchema);
