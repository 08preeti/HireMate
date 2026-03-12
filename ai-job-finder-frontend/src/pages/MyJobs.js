import React, { useEffect, useState } from "react";

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

}