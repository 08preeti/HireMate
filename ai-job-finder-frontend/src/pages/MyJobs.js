/*import React, { useEffect, useState } from "react";
export default function MyJobs(){
const [jobs,setJobs] = useState([]);
useEffect(()=>{
const worker =
JSON.parse(localStorage.getItem("worker"));
if(!worker) return;
fetch(
`http://localhost:5000/api/workers/my-jobs/${worker.phone}`
)
.then(res=>res.json())
.then(data=>setJobs(data));
},[]);
if(jobs.length===0)
return(
<p className="text-center mt-10">
No Jobs Applied Yet
</p>
);
return(
<div className="max-w-4xl mx-auto mt-10">
<h2 className="text-2xl font-bold mb-6">
My Jobs
</h2>
{jobs.map(j=>(
<div
key={j._id}
className="bg-white p-5 shadow rounded mb-4"
>
<h3 className="font-bold">
{j.job?.jobTitle?.en || j.job?.jobTitle}
</h3>
<p>
📍 {j.job?.location?.en || j.job?.location}
</p>
<p>
💰 ₹{j.job?.salary}
</p>
<hr className="my-3"/>
<p>
Status:
{j.isCompleted
?
" Completed ⭐"
:
" Applied"}
</p>
{j.isCompleted && (
<p>
⭐ {j.rating}/5
</p>
)}
</div>
))}
</div>
);
}   */




//---------------------
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function MyJobs() {
  const [jobs, setJobs]   = useState([]);
  const { language }      = useLanguage();
  const t                 = translations[language];

  useEffect(() => {
    const worker = JSON.parse(localStorage.getItem("worker"));
    if (!worker) return;
    fetch(`${BASE}/api/workers/my-jobs/${worker.phone}`)
      .then((r) => r.json())
      .then((data) => setJobs(data))
      .catch(() => {});
  }, []);

  if (jobs.length === 0) return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 16 }}>
      {t.noJobsApplied}
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 16px", fontFamily: "sans-serif" }}>
      <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20, color: "#006491" }}>
        {t.myJobs}
      </h2>

      {jobs.map((j) => (
        <div key={j._id} style={{ background: "#fff", padding: 18, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,.08)", marginBottom: 12, border: "1px solid #f0f0f0" }}>
          <h3 style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 16 }}>
            {j.job?.jobTitle?.[language] || j.job?.jobTitle?.en}
          </h3>
          <p style={{ margin: "4px 0", color: "#6b7280", fontSize: 14 }}>
            📍 {j.job?.location?.[language] || j.job?.location?.en}
          </p>
          <p style={{ margin: "4px 0", fontWeight: 700, color: "#E8002A", fontSize: 14 }}>
            ₹{j.job?.salary}
          </p>
          <hr style={{ margin: "10px 0", border: "none", borderTop: "1px solid #f0f0f0" }} />
          <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
            {t.statusLabel}: {j.isCompleted ? t.completed : t.applied}
          </p>
          {j.isCompleted && j.rating && (
            <p style={{ margin: "4px 0", fontSize: 13, color: "#f59e0b" }}>
              ⭐ {j.rating}/5
            </p>
          )}
        </div>
      ))}
    </div>
  );
}