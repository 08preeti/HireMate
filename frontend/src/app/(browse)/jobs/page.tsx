import { Suspense } from "react";
import Jobs from "@/features/jobs/Jobs";

// useSearchParams (the top-bar search sends people here as /jobs?q=…) needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Jobs />
    </Suspense>
  );
}