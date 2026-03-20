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


/*import { useEffect, useState } from "react";
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

} */


import { useEffect, useState } from "react";
import axios from "axios";

export default function WorkerProfile() {

  const [worker, setWorker] = useState(null);
  const [location, setLocation] = useState("");

  const savedWorker = JSON.parse(localStorage.getItem("worker"));

  // 1️⃣ Fetch worker (ONLY once)
useEffect(() => {

  if (savedWorker) {
    axios.get(
      `http://localhost:5000/api/workers/profile/${savedWorker._id}`
    )
    .then(res => {
      setWorker(res.data);
    })
    .catch(err => console.log(err));
  }

}, [savedWorker]);


// 2️⃣ Set location when worker loads
const [isLocationSet, setIsLocationSet] = useState(false);

useEffect(() => {
  if (worker && !isLocationSet) {
    setLocation(worker.location);
    setIsLocationSet(true);
  }
}, [worker, isLocationSet]);


  const updateLocation = async () => {

    try {

      const res = await axios.put(
        `http://localhost:5000/api/workers/update/${savedWorker._id}`,
        { location }
      );

      setWorker(res.data);

      // ✅ update localStorage also
      localStorage.setItem("worker", JSON.stringify(res.data));

      alert("Location updated successfully!");

    } catch (err) {

      console.log(err);
      alert("Update failed");

    }

  };


  if (!savedWorker) {
    return <h2 style={{ padding: "20px" }}>No Worker Found</h2>;
  }

  if (!worker) {
    return <h2 style={{ padding: "20px" }}>Loading...</h2>;
  }


  return (

    <div style={{ padding: "30px" }}>

      <h2>Worker Profile</h2>

      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        width: "350px"
      }}>

        <p><b>Name:</b> {worker.name}</p>
        <p><b>Skills:</b> {worker.skills}</p>

        {/* 🔥 EDITABLE LOCATION */}
        <p><b>Location:</b></p>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter new location"
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "10px"
          }}
        />

        <button
          onClick={updateLocation}
          style={{
            padding: "8px 15px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Update Location
        </button>

        <p style={{ marginTop: "10px" }}>
          <b>Phone:</b> {worker.phone}
        </p>

        <hr />

        <p><b>⭐ Rating:</b> {worker.rating}</p>
        <p><b>📝 Reviews:</b> {worker.totalReviews}</p>

      </div>

    </div>

  );

}