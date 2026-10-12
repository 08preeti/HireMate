"use client";

import dynamic from "next/dynamic";
import Loader from "@/components/ui/Loader";

// Leaflet touches `window` when it is imported, so these screens are client-only.
export const EmployerDashboardLazy = dynamic(() => import("./EmployerDashboard"), { ssr: false, loading: () => <Loader /> });
export const PostJobLazy = dynamic(() => import("./PostJobs"), { ssr: false, loading: () => <Loader /> });
