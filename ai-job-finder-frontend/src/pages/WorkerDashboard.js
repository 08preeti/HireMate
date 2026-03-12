import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

export default function WorkerDashboard() {

  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [workerLocation, setWorkerLocation] = useState(null);

  const worker = JSON.parse(localStorage.getItem("worker"));

  /* ==============================
     LOAD DATA
  ============================== */

  useEffect(() => {

    if (!worker || !workerLocation) return;

    /* JOB ALERTS */
    // fetch(
      //`http://localhost:5000/api/workers/job-alerts/${worker.location}`
   // ) 


   fetch(
      `http://localhost:5000/api/workers/job-alerts?lat=${workerLocation.lat}&lng=${workerLocation.lng}`
   )
      .then(res => res.json())
      .then(data => {
          console.log("Job alerts data:", data);
          setAlerts(data);
      })
      .catch(err => console.log("Job alerts error:", err));


      /*.then(res => res.json())
      .then(data => {
      .then(data => setAlerts(data))
         console.log("Job alerts data:", data);
         setAlerts(data);
      }
      .catch(err => console.log("Job alerts error:", err));  */
        


    /* JOB HISTORY */
    fetch(
      `http://localhost:5000/api/workers/job-history/${worker._id}`
    )
      .then(res => res.json())
      .then(data => setJobs(data))
      .catch(err => console.log("Job history error:", err));

  }, [worker, workerLocation]);

  /* ==============================
     ENABLE GPS (USER CLICK)
  ============================== */

  const enableGPS = () => {

    navigator.geolocation.watchPosition(

      (position) => {

        setWorkerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

      },

      (error) => {
        console.log("GPS error:", error);
      },

      {
        enableHighAccuracy: true
      }

    );

  };

  /* ==============================
     DISTANCE CALCULATION
  ============================== */

  const getDistance = (lat1, lon1, lat2, lon2) => {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return (R * c).toFixed(1);
  };

  /* ==============================
     ACCEPT JOB
  ============================== */

  const acceptJob = async (job) => {

    try {

      await fetch(
        "http://localhost:5000/api/workers/accept-job",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId: worker._id,
            jobId: job._id
          })
        }
      );

      alert("Job Accepted ✅");

      navigate(
        `/navigate?lat=${job.latitude}&lng=${job.longitude}&address=${job.location?.en}`
      );

    } catch (err) {
      console.error("Accept job error:", err);
    }

  };

  /* ==============================
     UI
  ============================== */

  return (

    <div style={{ padding: "20px" }}>

      <h2>Worker Dashboard 🚀</h2>

      {/* ENABLE GPS BUTTON */}

      <button
        onClick={enableGPS}
        style={{
          padding: "10px",
          background: "blue",
          color: "white",
          border: "none",
          marginTop: "10px",
          cursor: "pointer"
        }}
      >
        Enable Live Location 📍
      </button>

      {/* ================= JOB ALERTS ================= */}

      <h3 style={{ marginTop: "20px" }}>
        🔔 New Jobs Near You
      </h3>

      {alerts.length === 0 ? (
        <p>No New Jobs</p>
      ) : (
        alerts.map(job => {

          const distance =
            workerLocation && job.latitude && job.longitude
              ? getDistance(
                  workerLocation.lat,
                  workerLocation.lng,
                  job.latitude,
                  job.longitude
                )
              : "...";

          return (
            <div
              key={job._id}
              style={{
                border: "1px solid #ddd",
                margin: "10px 0",
                padding: "10px",
                background: "#fff"
              }}
            >
              <p><b>{job.jobTitle?.en}</b></p>
              <p>📍 {job.location?.en}</p>
              <p>📏 {distance} km away</p>
              <p>💰 ₹{job.salary}</p>

              <button
                onClick={() => acceptJob(job)}
                style={{
                  marginTop: "10px",
                  padding: "8px 15px",
                  background: "green",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Accept Job
              </button>
            </div>
          );
        })
      )}

      {/* ================= MAP ================= */}

      {workerLocation && alerts.length > 0 && (

        <MapContainer
          center={[workerLocation.lat, workerLocation.lng]}
          zoom={13}
          style={{
            height: "450px",
            marginTop: "20px"
          }}
        >

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Worker Marker */}

          <Marker
            position={[
              workerLocation.lat,
              workerLocation.lng
            ]}
          >
            <Popup>🚶 Worker Location</Popup>
          </Marker>

          {/* Job Markers */}

          {Array.isArray(alerts) && alerts.map(job => (

            job.latitude && job.longitude && (

              <Marker
                key={job._id}
                position={[
                  job.latitude,
                  job.longitude
                ]}
              >
                <Popup>
                  <b>{job.jobTitle?.en}</b>
                  <br />
                  📍 {job.location?.en}
                </Popup>
              </Marker>

            )

          ))}

        </MapContainer>

      )}


      <h3 style={{ marginTop: "20px" }}>
        My Job History
      </h3>

      {jobs.length === 0 ? (
        <p>No Jobs Yet</p>
      ) : (
        jobs.map(job => (
          <div
            key={job._id}
            style={{
              border: "1px solid #ddd",
              margin: "10px 0",
              padding: "10px"
            }}
          >
            <p>
              <b>Job:</b> {job.job?.jobTitle?.en}
            </p>
            <p>
              <b>Location:</b> {job.job?.location?.en}
            </p>
            <p>
              <b>Salary:</b> ₹{job.job?.salary}
            </p>
          </div>
        ))
      )}

    </div>

  );

}