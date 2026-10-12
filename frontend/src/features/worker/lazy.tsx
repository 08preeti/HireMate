"use client";

import dynamic from "next/dynamic";
import Loader from "@/components/ui/Loader";

// Leaflet touches `window` when it is imported, so these screens are client-only.
export const WorkerDashboardLazy = dynamic(() => import("./WorkerDashboard"), { ssr: false, loading: () => <Loader /> });
export const JobNavigationLazy = dynamic(() => import("./JobNavigation"), { ssr: false, loading: () => <Loader /> });
