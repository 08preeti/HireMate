"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FiAlertCircle, FiInbox } from "react-icons/fi";
import { useL } from "@/hooks/useL";

export const CARD = "rounded-2xl border border-[#e6ecf5] bg-white shadow-[0_2px_10px_rgba(20,50,110,0.05)]";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-bold tracking-tight text-[#0b1b3d] sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mb-0 mt-2 text-[15px] text-[#5b6a88]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">{children}</div>;
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  const { L } = useL();
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={L("Loading", "लोड हो रहा है", "लोड होत आहे")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${CARD} animate-pulse p-6`}>
          <div className="h-5 w-1/3 rounded bg-[#e9eef7]" />
          <div className="mt-3 h-4 w-1/2 rounded bg-[#eef2f9]" />
          <div className="mt-5 h-10 rounded-xl bg-[#f3f6fb]" />
        </div>
      ))}
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { L } = useL();
  return (
    <div role="alert" className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}>
      <FiAlertCircle size={32} className="text-[#d6203a]" aria-hidden="true" />
      <p className="m-0 text-[15px] font-semibold text-[#0b1b3d]">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="cursor-pointer rounded-lg bg-[#1f6bff] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1859d6]">
          {L("Try again", "फिर कोशिश करें", "पुन्हा प्रयत्न करा")}
        </button>
      )}
    </div>
  );
}

export function EmptyPanel({ message, hint, actionHref, actionLabel }: { message: string; hint?: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#cfd8e8] bg-white p-10 text-center">
      <FiInbox size={30} className="text-[#8a96ae]" aria-hidden="true" />
      <p className="m-0 text-[15.5px] font-semibold text-[#0b1b3d]">{message}</p>
      {hint && <p className="m-0 text-[13.5px] text-[#5b6a88]">{hint}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-3 rounded-xl bg-[#1f6bff] px-5 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-[#1859d6]">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function SectionCard({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section className={`${CARD} p-5 sm:p-6`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 text-[18px] font-bold text-[#0b1b3d]">{title}</h2>
        {href && linkLabel && (
          <Link href={href} className="text-[13.5px] font-semibold text-[#1a4fc4] no-underline hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={n <= Math.round(value) ? "fill-[#f5b301] text-[#f5b301]" : "fill-none text-[#d5dbe8]"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}
