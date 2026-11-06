"use client";

import dynamic from "next/dynamic";
import Loader from "@/components/ui/Loader";

// Leaflet touches `window` when it is imported, so this screen is client-only.
export const JobNavigationLazy = dynamic(() => import("./JobNavigation"), { ssr: false, loading: () => <Loader /> });
