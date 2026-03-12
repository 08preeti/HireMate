import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";


export default function Jobs({ t }) {
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();


  const { language } = useLanguage();

  const getJobIcon = (title) => {

 if (!title) return "💼";

 const t = title.toLowerCase();

 if (t.includes("electric")) return "⚡";
 if (t.includes("driver")) return "🚗";
 if (t.includes("plumber")) return "🔧";
 if (t.includes("cleaner")) return "🧹";
 if (t.includes("cook")) return "🍳";
 if (t.includes("security")) return "🛡️";
 if (t.includes("helper")) return "👷";
 if (t.includes("delivery")) return "📦";
 if (t.includes("painter")) return "🎨";
 if (t.includes("carpenter")) return "🪚";
 if (t.includes("maid")) return "🏠";

 return "💼";

};


  useEffect(() => {
  axios      
.get("http://localhost:5000/api/jobs")
.then(async (res) => {

 const jobsData = res.data;

 for(let job of jobsData){

 try{

 const r = await axios.get(
 `http://localhost:5000/api/applications/rating/${job.companyName || "Unknown"}`
 );

 job.rating = r.data.rating;
 job.totalReviews = r.data.total;

 }
 catch(e){

 job.rating = 0;
 job.totalReviews = 0;

 }

 }

 setJobs(jobsData);

})
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "30px" }}>
      <h2>{t.availableJobs}</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {jobs.map((job) => (
  <div
    key={job._id}
    style={{
      width: "350px",
      background: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    }}
  >

    {job.isUrgent && (
      <span
        style={{
          background: "red",
          color: "white",
          padding: "5px 10px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "bold",
          display: "inline-block",
          marginBottom: "10px"
        }}
      >
        🚨Urgent
      </span>
    )}

    {/*<h3>{job.jobTitle?.[language]}</h3> */}
    <h3>
      {getJobIcon(job.jobTitle?.[language])} {job.jobTitle?.[language]}
    </h3>



    <p>{job.location?.[language]}</p>

    <p><b>Skills:</b> {job.skills?.[language]}</p>


     {job.rating > 0 && (

<p>

⭐ {job.rating} Rating
({job.totalReviews} reviews)

</p>

)}
    <p><b>Salary:</b> ₹{job.salary}</p>

    <p><b>Payment:</b> {job.paymentMethod}</p>

    <button
      style={{
        background: "#2563eb",
        color: "#fff",
        padding: "8px 16px",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        marginTop: "10px"
      }}
      onClick={() => navigate(`/jobs/${job._id}`)}
    >
      View Details
    </button>

  </div>
))}
      </div>
    </div>
  );
}