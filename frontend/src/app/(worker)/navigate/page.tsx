import { Suspense } from "react";
import { JobNavigationLazy } from "@/features/worker/lazy";
import Loader from "@/components/ui/Loader";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <JobNavigationLazy />
    </Suspense>
  );
}
