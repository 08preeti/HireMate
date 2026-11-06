"use client";

import { useParams } from "next/navigation";
import PostJobs from "./PostJobs";

export default function EditJob() {
  const params = useParams<{ id: string }>();
  return <PostJobs jobId={params.id} />;
}
