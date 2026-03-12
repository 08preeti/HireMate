/*  import React from "react";

export default function WorkerProfile() {

const worker = JSON.parse(localStorage.getItem("worker"));

if (!worker) {
return <h2 style={{padding:"20px"}}>No Worker Found</h2>;
}

return (

<div style={{padding:"30px"}}>

<h2>Worker Profile</h2>

<div style={{
background:"#fff",
padding:"20px",
borderRadius:"8px",
boxShadow:"0 0 10px rgba(0,0,0,0.1)",
width:"350px"
}}>

<p><b>Name:</b> {worker.name}</p>

<p><b>Skills:</b> {worker.skills}</p>

<p><b>Location:</b> {worker.location}</p>

<p><b>Phone:</b> {worker.contact}</p>

<p><b>Phone:</b> {worker.phone || worker.contact}</p>

</div>

</div>

);

}   */


import { useEffect, useState } from "react";
import axios from "axios";

export default function WorkerProfile() {

const [worker,setWorker] = useState(null);

const savedWorker = JSON.parse(localStorage.getItem("worker"));

useEffect(()=>{

if(savedWorker){

axios.get(
`http://localhost:5000/api/workers/profile/${savedWorker._id}`
)

.then(res=>{
setWorker(res.data);
})

.catch(err=>{
console.log(err);
});

}

},[savedWorker]);


if(!savedWorker){
return <h2 style={{padding:"20px"}}>No Worker Found</h2>;
}


if(!worker){
return <h2 style={{padding:"20px"}}>Loading...</h2>;
}


return(

<div style={{padding:"30px"}}>

<h2>Worker Profile</h2>

<div style={{

background:"#fff",
padding:"20px",
borderRadius:"8px",
boxShadow:"0 0 10px rgba(0,0,0,0.1)",
width:"350px"

}}>

<p><b>Name:</b> {worker.name}</p>

<p><b>Skills:</b> {worker.skills}</p>

<p><b>Location:</b> {worker.location}</p>

<p><b>Phone:</b> {worker.phone}</p>

<hr/>

<p><b>⭐ Rating:</b> {worker.rating}</p>

<p><b>📝 Reviews:</b> {worker.totalReviews}</p>

</div>

</div>

);

}