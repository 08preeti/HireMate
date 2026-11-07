
import mongoose from "mongoose";

export const TIMELINE_EVENTS = ["submitted", "reviewed", "accepted", "declined", "confirmed", "rejected", "withdrawn", "cancelled", "on_the_way", "arrived", "completion_requested", "completion_rejected", "completed"];

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

  // Employer's rating of the worker (set once, after the work is completed).
  rating: Number,
  review: String,
  ratedAt: Date,

  // Worker's rating of the employer (set once, after the work is completed).
  employerRating: Number,
  employerReview: String,
  employerRatedAt: Date,

  // Set when the worker asks the employer to verify the work as finished; cleared when the employer rejects it.
  completionRequestedAt: Date,
  completionRejection: {
    _id: false,
    reason: String,
    at: Date,
  },
  completedAt: Date,
  cancellationReason: String,

  // ⭐ Job Status Flow: pending → accepted | declined (employer decides; "accepted" = offer sent),
  // accepted → confirmed | rejected (worker answers the offer), then
  // confirmed → on_the_way → arrived (worker), then arrived → completed once the employer verifies the worker's completion request.
  // withdrawn (worker) / cancelled (employer) end an application; they release its vacancy.
  status: {
    type: String,
    enum: ["pending", "declined", "accepted", "confirmed", "rejected", "on_the_way", "arrived", "completed", "withdrawn", "cancelled"],
    default: "pending"
  },

  isCompleted: {
    type: Boolean,
    default: false
  },

  // Real, server-timestamped history of what happened to this application (shown to both sides).
  // Written only by applicationService together with each status change.
  timeline: [
    {
      _id: false,
      event: { type: String, enum: TIMELINE_EVENTS, required: true },
      at: { type: Date, default: Date.now },
      by: { type: String, enum: ["worker", "employer"], required: true },
      note: String,
    },
  ],

  // Worker's explicit, per-application consent to share live GPS with the employer.
  // Off by default; only honoured while the job is confirmed / on the way / arrived.
  locationConsent: {
    type: Boolean,
    default: false
  },

  locationConsentAt: Date,

  // Only the LATEST reported position is kept (overwritten on every update, never appended).
  // Removed when sharing stops, the work ends, or consent expires.
  liveLocation: {
    _id: false,
    lat: Number,
    lng: Number,
    accuracy: Number,
    recordedAt: Date,
    updatedAt: Date,
  },

},
{ timestamps: true }
);

applicationSchema.pre("validate", function () {
  if (this.isNew && !this.timeline.length) this.timeline.push({ event: "submitted", by: "worker", at: new Date() });
});

// One application per worker per job, enforced by the database (the service check alone can race).
applicationSchema.index({ job: 1, worker: 1 }, { unique: true, partialFilterExpression: { worker: { $exists: true } } });

applicationSchema.index({ "liveLocation.updatedAt": 1 }, { sparse: true });

const Application = mongoose.model("Application", applicationSchema);
Application.on("index", (err) => {
  if (err) console.error("[applications] index build failed (duplicate applications already exist?):", err.message);
});

export default Application;