import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white border-t mt-10">
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-600 flex justify-between items-center">
        <div>© {new Date().getFullYear()} HireMate</div>
        <div className="flex gap-4">
          <a className="hover:underline" href="#">Privacy</a>
          <a className="hover:underline" href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
