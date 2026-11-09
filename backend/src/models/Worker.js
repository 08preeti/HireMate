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
    notificationPrefs: {
      jobMatches: { type: Boolean, default: true },
    },
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
    otpAttempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

workerSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });

const Worker = mongoose.model("Worker", workerSchema);

Worker.on("index", (err) => {
  if (err) console.error("[workers] unique phone index failed (duplicate phone numbers already exist?):", err.message);
});

export default Worker;
