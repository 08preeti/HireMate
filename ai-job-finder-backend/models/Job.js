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

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;

