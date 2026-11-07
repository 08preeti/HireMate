"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map only ever renders in the browser.
const MapViewLazy = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" aria-hidden="true" />,
});

export default MapViewLazy;
