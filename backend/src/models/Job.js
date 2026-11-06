import mongoose from "mongoose";
const multiLangField = {
  en: { type: String, default: "" },
  hi: { type: String, default: "" },
  mr: { type: String, default: "" },
};


const jobSchema = new mongoose.Schema(
  {
    jobTitle: multiLangField,

    description: multiLangField,

    skills: multiLangField,

    location: multiLangField,


    latitude: {
      type: Number,
    },

    longitude: {
      type: Number,
    },

    salary: {
      type: Number,
      required: true,
    },

    //
    paymentMethod: {
      type: String,
      default: "Cash"
   },



    isUrgent: {
      type: Boolean,
      default: false,
    },

    // Shown to workers on job cards/details (the "Call" button uses contactInfo).
    companyName: {
      type: String,
      default: "",
    },

    contactInfo: {
      type: String,
      default: "",
    },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },

    category: { type: String, default: "" },

    jobType: { type: String, enum: ["one_day", "multi_day", "part_time", "full_time", "contract"] },

    experience: { type: String, default: "" },

    salaryUnit: { type: String, enum: ["hour", "day", "week", "month"] },

    paymentDetails: { type: String, default: "" },

    // The employer's own job description. `description` (what workers read) is composed from it and the fields below.
    summary: { type: String },

    shift: { type: String, enum: ["day", "night", "half"] },

    workSchedule: { type: String, default: "" },

    startDate: { type: Date },

    duration: { type: String, default: "" },

    workInstructions: { type: String, default: "" },

    gateNote: { type: String, default: "" },

    perkItems: { type: [String], default: undefined },

    overtimeRate: { type: Number, default: 0 },

    addressLine: { type: String, default: "" },

    city: { type: String, default: "" },

    state: { type: String, default: "" },

    postalCode: { type: String, default: "" },

    closedAt: { type: Date },

    completedAt: { type: Date },

    // Bumped on every employer edit; makes "job updated" notifications one-per-edit.
    revision: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["active", "closed", "filled", "completed"],
      default: "active",
    },

    // Total workers needed. Jobs created before this field existed count as 1.
    vacancies: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Vacancies currently held by applications (accepted / confirmed / on_the_way / arrived / completed).
    // Only changed by vacancyService with atomic updates.
    filledPositions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;

