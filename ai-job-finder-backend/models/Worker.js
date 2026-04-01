/*import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
{
  name: String,
  phone: String,
  skills: String,
  location: String,

  rating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  },

  currentLocation: {
    let: Number,
    lan: Number
  }
},
{ timestamps: true }
);


export default mongoose.model("Worker", workerSchema);  */


//----------------------------
import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    skills: String,
    location: String,

    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // ✅ FIXED: was { let: Number, lan: Number } — typos
    currentLocation: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Worker", workerSchema);
