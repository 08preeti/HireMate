import { useState } from "react";
import axios from "axios";
import "./PostJobs.css";

export default function PostJobs() {
  const [formData, setFormData] = useState({
jobTitle: "",
companyName: "",
location: "",
salary: "",
skills: "",
description: "",
contactInfo: "",
isUrgent: false,
paymentMethod: ""   // ✅ ADD THIS
});


  // ✅ THIS WAS MISSING
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");

    // 🔥 GET LAT LNG FROM LOCATION
    const geoRes = await axios.get(
  "https://nominatim.openstreetmap.org/search",
  {
    params: {
      q: formData.location,
      format: "json",
      limit: 1
    }
  }
);

    if (geoRes.data.length === 0) {
      alert("Location not found");
      console.log("Geocode result:", geoRes.data);
      return;
    }

    const latitude = parseFloat(geoRes.data[0].lat);
    const longitude = parseFloat(geoRes.data[0].lon);

    // 🔥 SEND LAT LNG TO BACKEND
    await axios.post(
      "http://localhost:5000/api/jobs",
      {
        ...formData,
        latitude,
        longitude
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    alert("Job posted successfully ✅");

  } catch (err) {
    console.error(err);
    alert("Failed to post job");
  }
};

  return (
    <div className="post-job-page">
      <h2>Post a Job</h2>

       <form className="post-job-card" onSubmit={handleSubmit}>
       <select
  className="job-dropdown"
  onChange={(e) =>
    setFormData({ ...formData, jobTitle: e.target.value })
  }
>

<option value="">Select Job Type (Optional)</option>

{/* Home Services */}
<option value="Electrician">Electrician</option>
<option value="Plumber">Plumber</option>
<option value="Carpenter">Carpenter</option>
<option value="Painter">Painter</option>
<option value="AC Technician">AC Technician</option>
<option value="Mechanic">Mechanic</option>
<option value="Mobile Repair Technician">Mobile Repair Technician</option>

{/* Driving & Delivery */}
<option value="Driver">Driver</option>
<option value="Auto Driver">Auto Driver</option>
<option value="Truck Driver">Truck Driver</option>
<option value="Delivery Boy">Delivery Boy</option>

{/* House Work */}
<option value="House Maid">House Maid</option>
<option value="Cleaner">Cleaner</option>
<option value="Cook">Cook</option>
<option value="Babysitter">Babysitter</option>

{/* Construction */}
<option value="Construction Worker">Construction Worker</option>
<option value="Mason">Mason</option>
<option value="Welder">Welder</option>
<option value="Tile Worker">Tile Worker</option>
<option value="Steel Fixer">Steel Fixer</option>

{/* Shop Work */}
<option value="Shop Helper">Shop Helper</option>
<option value="Sales Boy">Sales Boy</option>
<option value="Cashier">Cashier</option>
<option value="Store Assistant">Store Assistant</option>

{/* Security & Service */}
<option value="Security Guard">Security Guard</option>
<option value="Watchman">Watchman</option>
<option value="Gardener">Gardener</option>

{/* Hotel Work */}
<option value="Waiter">Waiter</option>
<option value="Kitchen Helper">Kitchen Helper</option>
<option value="Hotel Staff">Hotel Staff</option>

{/* Factory Work */}
<option value="Factory Worker">Factory Worker</option>
<option value="Packing Worker">Packing Worker</option>
<option value="Machine Operator">Machine Operator</option>

{/* General */}
<option value="Helper">Helper</option>
<option value="Labour">Labour</option>

</select>
       



        <input name="jobTitle" placeholder="Job Title" value={formData.jobTitle} onChange={handleChange} required />
        <input name="companyName" placeholder="Company / Name" value={formData.companyName} onChange={handleChange} required />
        <input name="location" placeholder="Location" value={formData.location} onChange={handleChange} required />
        <input name="salary" placeholder="Salary" value={formData.salary} onChange={handleChange} required />
        <input name="skills" placeholder="Skills" value={formData.skills} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />


        <select
name="paymentMethod"
className="job-dropdown"
value={formData.paymentMethod}
onChange={handleChange}
>

<option value="">Select Payment Method</option>

<option value="Cash">💵 Cash</option>

<option value="UPI">📱 UPI</option>

<option value="After Work">🤝 After Work</option>

</select>
        <input name="contactInfo" placeholder="Contact Info" value={formData.contactInfo} onChange={handleChange} required /> 
       

        
        <div style={{ marginTop: "10px" }}>
          <label>
            <input
              type="checkbox"
              name="isUrgent"
              checked={formData.isUrgent}
              onChange={(e) =>
                setFormData({ ...formData, isUrgent: e.target.checked })
              }
             />
             🚨 Urgent Hiring
           </label>
          </div>



        <button type="submit" className="post-job-btn">Post Job</button>
      </form>
    </div>
  );
}
