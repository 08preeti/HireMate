import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "job_match",
  "application_submitted",
  "application_accepted",
  "application_declined",
  "application_completed",
  "new_application",
  "worker_on_the_way",
  "worker_arrived",
  "worker_completed",
  "offer_confirmed",
  "offer_rejected",
  "application_withdrawn",
  "application_cancelled",
  "job_closed",
  "job_updated",
  "job_filled",
  "completion_requested",
  "completion_approved",
  "completion_rejected",
  "review_received",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ["worker", "employer"], required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    // One notification per (recipient, event): makes retries and repeated actions harmless.
    dedupeKey: { type: String, required: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ recipient: 1, role: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
Notification.on("index", (err) => {
  if (err) console.error("[notifications] index build failed:", err.message);
});

export default Notification;
