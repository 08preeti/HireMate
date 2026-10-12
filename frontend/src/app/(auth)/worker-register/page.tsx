import { redirect } from "next/navigation";

// Worker signup happens in the OTP flow on /worker-login (new numbers complete their profile there).
// The old form posted to /api/workers/register without verifying the phone number.
export default function Page() {
  redirect("/worker-login");
}
