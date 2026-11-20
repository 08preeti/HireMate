"use client";

import { usePathname } from "next/navigation";
import { useAssistant } from "@/context/AssistantProvider";
import { useAuth } from "@/context/AuthContext";
import { useL } from "@/hooks/useL";
import AssistantOrb from "./AssistantOrb";
import AssistantPanel from "./AssistantPanel";

// Full-screen pages with their own chrome (map navigation, onboarding) and the sign-in screens stay clear of the assistant.
const HIDDEN_PREFIXES = ["/navigate", "/onboarding", "/worker-login", "/worker-register", "/employer-login", "/employer-register"];

export default function HireMateAssistant() {
  const { authenticated, role } = useAuth();
  const pathname = usePathname();
  const { open, setOpen, orbState } = useAssistant();
  const { L } = useL();

  if (!authenticated || pathname === "/" || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // WorkerShell draws its own fixed chrome (top bar and bottom tabs at z-900, the "Need Help?" pill at z-880 in the
  // bottom-right corner). The orb sits above that chrome (z-920, still under menus/dialogs) and, for workers, stacks
  // above the pill instead of on top of it. Employer pages keep the original corner position.
  const worker = role === "worker";
  const orbPos = worker ? "bottom-[9.25rem] right-4 sm:right-6 lg:bottom-[5.75rem]" : "bottom-20 right-4 sm:bottom-6 sm:right-6";

  return (
    <>
      {open && <AssistantPanel />}
      <div className={`fixed z-[920] ${orbPos}`}>
        <AssistantOrb
          state={orbState}
          open={open}
          onClick={() => setOpen(!open)}
          label={open ? L("Close assistant", "असिस्टेंट बंद करें", "असिस्टंट बंद करा") : L("Open HireMate assistant", "हायरमेट असिस्टेंट खोलें", "हायरमेट असिस्टंट उघडा")}
        />
      </div>
    </>
  );
}