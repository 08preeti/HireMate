"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorMessage message="Something went wrong." onRetry={reset} />;
}
