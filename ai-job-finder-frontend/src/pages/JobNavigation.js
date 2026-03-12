// import { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import {
// MapContainer,
// TileLayer,
// Marker,
// Popup,
// useMap
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-routing-machine";


// /* ROUTE COMPONENT */

// function Routing({ workerLocation, destination, setRouteInfo }) {

// const map = useMap();

// useEffect(()=>{

// if(!workerLocation || !destination) return;

// const control = L.Routing.control({

// waypoints:[
// L.latLng(workerLocation.lat,workerLocation.lng),
// L.latLng(destination.lat,destination.lng)
// ],

// lineOptions:{
// styles:[{color:"#0066ff",weight:5}]
// },

// addWaypoints:false,
// draggableWaypoints:false,
// fitSelectedRoutes:true,
// show:false

// })
// .on("routesfound",function(e){

// const route = e.routes[0];
// const distance = (route.summary.totalDistance/1000).toFixed(1);
// const time = (route.summary.totalTime/60).toFixed(0);

// setRouteInfo({distance,time});

// })
// .addTo(map);

// return ()=>{
// map.removeControl(control);
// };

// },[workerLocation,destination,map,setRouteInfo]);

// return null;

// }



// export default function JobNavigation(){

// const [searchParams] = useSearchParams();

// const lat = searchParams.get("lat");
// const lng = searchParams.get("lng");
// const address = searchParams.get("address");

// const [workerLocation,setWorkerLocation] = useState(null);
// const [routeInfo,setRouteInfo] = useState(null);



// /* LIVE GPS */

// const startTracking = () => {

//   navigator.geolocation.watchPosition((pos)=>{
//     setWorkerLocation({
//       lat:pos.coords.latitude,
//       lng:pos.coords.longitude
//     });
//   });

// };


// if(!lat || !lng) return <p>Loading...</p>;

// const destination = {
// lat:parseFloat(lat),
// lng:parseFloat(lng)
// };



// return(

// <div style={{height:"100vh",position:"relative"}}>

// {/* MAP */}

// {!workerLocation && (
//   <div style={{padding:"10px",background:"#fff"}}>
//     <button
//       onClick={startTracking}
//       style={{
//         padding:"10px 15px",
//         background:"#0066ff",
//         color:"white",
//         border:"none",
//         borderRadius:"8px"
//       }}
//     >
//       Enable Live Location
//     </button>
//   </div>
// )}



// <MapContainer
// center={[destination.lat,destination.lng]}
// zoom={13}
// style={{height:"100%",width:"100%"}}
// >

// <TileLayer
// url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
// />

// {/* WORKER MARKER */}

// {workerLocation && (

// <Marker position={[
// workerLocation.lat,
// workerLocation.lng
// ]}>
// <Popup>🚶 You</Popup>
// </Marker>

// )}

// {/* DESTINATION */}

// <Marker position={[
// destination.lat,
// destination.lng
// ]}>
// <Popup>📍 Job Location</Popup>
// </Marker>


// {/* ROUTE */}

// {workerLocation && (

// <Routing
// workerLocation={workerLocation}
// destination={destination}
// setRouteInfo={setRouteInfo}
// />

// )}

// </MapContainer>



// {/* UBER STYLE BOTTOM CARD */}

// <div style={{
// position:"absolute",
// bottom:"0",
// left:"0",
// right:"0",
// background:"white",
// padding:"20px",
// borderTopLeftRadius:"20px",
// borderTopRightRadius:"20px",
// boxShadow:"0 -4px 15px rgba(0,0,0,0.2)"
// }}>

// <h3 style={{marginBottom:"5px"}}>
// 📍 {address}
// </h3>

// {routeInfo ? (

// <>
// <p>
// 🛣 Distance: <b>{routeInfo.distance} km</b>
// </p>

// <p>
// ⏱ ETA: <b>{routeInfo.time} mins</b>
// </p>
// </>

// ):(

// <p>Calculating route...</p>

// )}

// <a
// href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
// target="_blank"
// rel="noreferrer"
// style={{
// display:"block",
// marginTop:"10px",
// background:"#0066ff",
// color:"white",
// textAlign:"center",
// padding:"12px",
// borderRadius:"10px",
// textDecoration:"none",
// fontWeight:"bold"
// }}
// >

// Start Navigation

// </a>

// </div>

// </div>

// );

// }  




import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";

function RoutingMachine({ workerLocation, destination, setRouteInfo }) {

  const map = useMap();
  const routingRef = useRef(null);

  useEffect(() => {

    if (!workerLocation || !destination) return;

    if (routingRef.current) {
      map.removeControl(routingRef.current);
    }

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(workerLocation.lat, workerLocation.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      lineOptions: {
        styles: [{ color: "#0066ff", weight: 6 }]
      },
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1"
      })
    }).addTo(map);

    routingControl.on("routesfound", function (e) {

      const route = e.routes[0];

      const distanceKm = (route.summary.totalDistance / 1000).toFixed(2);
      const timeMin = Math.round(route.summary.totalTime / 60);

      setRouteInfo({
        distance: distanceKm,
        time: timeMin
      });

      /* VOICE NAVIGATION */
      const firstInstruction = route.instructions[0]?.text;
      if (firstInstruction) {
        const speech = new SpeechSynthesisUtterance(firstInstruction);
        window.speechSynthesis.speak(speech);
      }

    });

    routingRef.current = routingControl;

    return () => {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
      }
    };

  }, [workerLocation, destination, map, setRouteInfo]);

  return null;
}

export default function JobNavigation() {

  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));
  const address = params.get("address");

  const destination = { lat, lng };

  const [workerLocation, setWorkerLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState({
    distance: null,
    time: null
  });

  const startTracking = () => {

  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.watchPosition(
    async (pos) => {

      const newLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      setWorkerLocation(newLocation);

      // 🔥 Send live location to backend
      const worker = JSON.parse(localStorage.getItem("worker"));

      if (worker) {
        await fetch("http://localhost:5000/api/workers/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId: worker._id,
            lat: newLocation.lat,
            lng: newLocation.lng
          })
        });
      }

    },
    (error) => {
      alert("Please allow location access");
      console.log(error);
    },
    {
      enableHighAccuracy: true
    }
  );
};

  return (
    <div style={{ height: "100vh" }}>

      {!workerLocation && (
        <div style={{ padding: "10px" }}>
          <button
            onClick={startTracking}
            style={{
              padding: "10px 20px",
              background: "#0066ff",
              color: "white",
              border: "none",
              borderRadius: "8px"
            }}
          >
            Start Navigation
          </button>
        </div>
      )}

      {/* DISTANCE & TIME PANEL */}
      {routeInfo.distance && (
        <div style={{
          position: "absolute",
          top: "70px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          padding: "10px 20px",
          borderRadius: "10px",
          zIndex: 1000,
          boxShadow: "0 3px 10px rgba(0,0,0,0.2)"
        }}>
          🚗 {routeInfo.distance} km | ⏱ {routeInfo.time} mins
        </div>
      )}

      <MapContainer
        center={[lat, lng]}
        zoom={13}
        style={{ height: "100%" }}
      >

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Destination */}
        <Marker position={[lat, lng]}>
          <Popup>{address}</Popup>
        </Marker>

        {/* Worker */}
        {workerLocation && (
          <Marker position={[workerLocation.lat, workerLocation.lng]}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {workerLocation && (
          <RoutingMachine
            workerLocation={workerLocation}
            destination={destination}
            setRouteInfo={setRouteInfo}
          />
        )}

      </MapContainer>

    </div>
  );
}