import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-10 text-center font-plain">
      <div className="text-[18px] font-bold text-gray-700 mb-3">Page not found</div>
      <Link href="/" className="text-brand font-semibold no-underline">
        ← Back to home
      </Link>
    </div>
  );
}
