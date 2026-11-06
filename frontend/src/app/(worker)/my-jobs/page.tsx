import { redirect } from "next/navigation";

// "My Jobs" became "My Applications" (applications), "Active Work" and "Work History".
export default function Page() {
  redirect("/my-applications");
}
