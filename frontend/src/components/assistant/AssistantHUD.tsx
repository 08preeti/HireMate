"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAssistant } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import { AssistantOrb } from "./AssistantOrb";

export function AssistantHUD() {
  const { role, user } = useAuth();
  const {
    isOpen,
    orbState,
    messages,
    activeTranscript,
    continuousVoice,
    isMuted,
    isListening,
    isSpeaking,
    autoplayBlocked,
    jarvisVoice,
    voiceState,
    greeting,
    weather,
    pendingConfirmation,
    closeAssistant,
    toggleMute,
    toggleContinuousVoice,
    startVoiceGreeting,
    startListening,
    stopListening,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    speakText,
    stopSpeaking,
  } = useAssistant();

  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll history when toggled
  useEffect(() => {
    if (showHistory && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [showHistory, messages]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput("");
    await sendMessage(msg);
  };

  const handleMicClick = () => {
    // Interruption / barge-in: If assistant is currently speaking, stop speech immediately
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Find latest conversation turn for Siri/Gemini voice-first display
  const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const latestAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const latestAction = latestAssistantMsg?.action;

  // Real location of the user (from profile, weather, or live context)
  const userLocation = (user as any)?.location || weather?.city || "";

  // Dynamic suggested voice chips based on role and actual context (no hardcoded locations)
  const quickSuggestions =
    role === "employer"
      ? [
          "Review applicants",
          "Show active jobs",
          "Help me post a job",
          "Compare candidate profiles",
        ]
      : [
          "Show jobs near me",
          "Check my applications",
          "Mera experience 3 saal kar do",
          "Today's weather",
        ];

  return (
    <div
      role="region"
      aria-label="HireMate JARVIS Voice Assistant"
      className="fixed top-14 right-3 sm:right-6 z-[1000] w-[400px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl bg-slate-950/95 border border-cyan-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(0,240,255,0.2)] backdrop-blur-2xl text-slate-100 overflow-hidden font-sans transition-all duration-300 animate-fade-in"
    >
      {/* ── Top Futuristic HUD Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-cyan-500/20 select-none">
        <div className="flex items-center gap-2.5">
          <AssistantOrb state={orbState} size={30} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[13px] tracking-widest bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                JARVIS
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/40 uppercase tracking-wider">
                {role === "employer" ? "Contractor Recruiter" : "Personal Companion"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isListening
                    ? "bg-emerald-400 animate-ping"
                    : isSpeaking
                    ? "bg-sky-400 animate-pulse"
                    : "bg-cyan-400"
                }`}
              />
              <span className="capitalize text-slate-300">{orbState}</span>
              <span className="text-slate-600">•</span>
              <span
                className="font-semibold text-sky-300"
                title="Alisha Voice (Neural AI Voice • Free & Unlimited)"
              >
                {jarvisVoice?.name || "Alisha"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400/80">Hi · Mr · En</span>
            </div>
          </div>
        </div>

        {/* Top Control Icons */}
        <div className="flex items-center gap-1.5">
          {/* Barge-in Stop Button */}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              title="Interrupt speech (Barge-in)"
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/25 border border-rose-500/50 text-rose-300 hover:bg-rose-500/40 transition-colors cursor-pointer animate-pulse"
            >
              Stop ⏹
            </button>
          )}

          {/* Continuous Voice Toggle Pill */}
          <button
            type="button"
            onClick={toggleContinuousVoice}
            title={continuousVoice ? "Disable Continuous Voice" : "Enable Hands-free Continuous Voice"}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer border ${
              continuousVoice
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
            }`}
          >
            {continuousVoice ? "🎙️ Auto" : "🎙️ Push"}
          </button>

          {/* Toggle History Log Drawer */}
          {messages.length > 2 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              title="Toggle previous conversation log"
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                showHistory
                  ? "bg-cyan-950 text-cyan-300 border-cyan-500/50"
                  : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-cyan-300"
              }`}
            >
              📜 Log ({messages.length})
            </button>
          )}

          {/* Mute Audio Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? "Unmute Voice" : "Mute Voice"}
            aria-label={isMuted ? "Unmute Voice" : "Mute Voice"}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80"
            }`}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          {/* Close Assistant */}
          <button
            type="button"
            onClick={closeAssistant}
            title="Minimize Assistant"
            aria-label="Close Assistant"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Browser Autoplay Fallback Banner (Requirement 1) ── */}
      {autoplayBlocked && !isMuted && (
        <div className="mx-3.5 my-2 p-2.5 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-blue-950/90 border border-cyan-400/50 shadow-xl flex items-center justify-between animate-fade-in select-none">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">🔊</span>
            <div>
              <div className="text-[11px] font-bold text-cyan-200">JARVIS Voice Ready</div>
              <div className="text-[9.5px] text-slate-400">Audio playback waiting for your tap</div>
            </div>
          </div>
          <button
            type="button"
            onClick={startVoiceGreeting}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[11px] shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>▶ Start Voice</span>
          </button>
        </div>
      )}

      {/* ── Collapsible History Drawer ── */}
      {showHistory && (
        <div
          ref={historyRef}
          className="max-h-[180px] overflow-y-auto px-4 py-2.5 bg-slate-950/90 border-b border-cyan-500/20 space-y-2 text-xs scrollbar-none"
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Session History
          </div>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-2 rounded-lg text-[11px] leading-relaxed ${
                m.role === "user"
                  ? "bg-cyan-950/40 text-cyan-200 border border-cyan-800/30 ml-4"
                  : m.role === "system"
                  ? "bg-slate-900/60 text-amber-300/80 border border-amber-900/30 text-center italic"
                  : "bg-slate-900/70 text-slate-300 border border-slate-800 mr-4"
              }`}
            >
              <div className="text-[9.5px] font-bold text-slate-400 mb-0.5">
                {m.role === "user" ? "🗣️ You" : m.role === "system" ? "⚙️ System" : "🤖 JARVIS"}
              </div>
              <div>{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Central Acoustic Waveform Stage (Siri / Gemini Core) ── */}
      <div className="px-5 pt-3 pb-2 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-slate-900/40 to-transparent">
        {/* State-specific Waveform or Quantum Visualizer */}
        {isListening ? (
          <div className="flex flex-col items-center gap-2 py-1 w-full animate-fade-in">
            {/* Dynamic Sound Ripple Ring */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-14 h-14 rounded-full border border-emerald-400/40 animate-ping" />
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <span className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>

            {/* Hearing Subtitle Ticker */}
            <div className="text-center w-full px-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Listening to your voice...
              </div>
              <div className="text-xs text-emerald-200 italic font-medium truncate mt-0.5">
                {activeTranscript ? `“${activeTranscript}”` : "Speak in Hindi, Marathi, or English"}
              </div>
            </div>
          </div>
        ) : isSpeaking ? (
          <div className="flex flex-col items-center gap-2 py-1 w-full animate-fade-in">
            {/* 7-Band Dynamic Soundwave Equalizer */}
            <div className="flex items-center justify-center gap-1.5 h-8">
              <span className="w-1 h-3 bg-cyan-400 rounded-full animate-[pulse_0.4s_infinite]" />
              <span className="w-1 h-6 bg-sky-300 rounded-full animate-[pulse_0.6s_infinite]" />
              <span className="w-1 h-8 bg-cyan-400 rounded-full animate-[pulse_0.3s_infinite]" />
              <span className="w-1 h-5 bg-sky-400 rounded-full animate-[pulse_0.5s_infinite]" />
              <span className="w-1 h-7 bg-cyan-300 rounded-full animate-[pulse_0.35s_infinite]" />
              <span className="w-1 h-4 bg-sky-300 rounded-full animate-[pulse_0.45s_infinite]" />
              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-[pulse_0.55s_infinite]" />
            </div>

            <div className="text-[10.5px] text-cyan-300/90 font-medium flex items-center gap-1.5">
              <span>JARVIS Speaking</span>
              <span className="text-[9.5px] text-slate-400">(tap anywhere to interrupt)</span>
            </div>
          </div>
        ) : orbState === "thinking" ? (
          <div className="flex flex-col items-center gap-2 py-1 w-full animate-fade-in">
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-indigo-400 animate-spin flex items-center justify-center shadow-[0_0_15px_rgba(129,140,248,0.4)]">
              <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping" />
            </div>
            <div className="text-[11px] font-semibold text-indigo-300 tracking-wide">
              Analyzing request with JARVIS intelligence...
            </div>
          </div>
        ) : orbState === "executing" ? (
          <div className="flex flex-col items-center gap-2 py-1 w-full animate-fade-in">
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-emerald-400 animate-[spin_1.2s_linear_infinite] flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.5)]">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] font-semibold text-emerald-300 tracking-wide">
              Executing action on HireMate...
            </div>
          </div>
        ) : (
          <div className="h-1 w-12 rounded-full bg-cyan-500/20" />
        )}
      </div>

      {/* ── Active Dialogue Stage (The Siri / Gemini Voice Card) ── */}
      <div className="px-4 pb-3 space-y-3 max-h-[380px] overflow-y-auto scrollbar-none">
        {/* User's Current Voice Inquiry Pill */}
        {latestUserMsg && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/20 text-xs text-cyan-200 shadow-sm animate-fade-in">
            <span className="text-[11px]">🗣️</span>
            <span className="font-medium text-slate-300">You:</span>
            <span className="font-semibold text-cyan-100 truncate flex-1">
              {latestUserMsg.content}
            </span>
          </div>
        )}

        {/* JARVIS Spoken Response */}
        {latestAssistantMsg && (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-cyan-500/30 p-3.5 shadow-xl space-y-2 relative overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/15">
              <span className="text-[10.5px] font-bold text-cyan-400 tracking-wider flex items-center gap-1.5 uppercase">
                <span>🤖 JARVIS Response</span>
              </span>
              <button
                type="button"
                onClick={() => speakText(latestAssistantMsg.content)}
                title="Replay Voice Audio"
                className="text-slate-400 hover:text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>🔊 Replay</span>
              </button>
            </div>

            <div className="text-[13px] leading-relaxed text-slate-100 font-normal whitespace-pre-line">
              {latestAssistantMsg.content}
            </div>
          </div>
        )}

        {/* ── Contextual Action Card 1: Profile Diff Card (Worker) ── */}
        {(pendingConfirmation?.action === "update_profile" ||
          latestAction?.type === "update_profile") && (
          <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-950/25 p-3.5 shadow-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>👤 Profile Update Verification</span>
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                CONFIRMATION
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-1">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[9.5px] text-slate-400 block font-medium">Current Value</span>
                <span className="text-rose-400 font-semibold line-through text-sm block mt-0.5">
                  {pendingConfirmation?.details?.oldValue ||
                    latestAction?.details?.oldValue ||
                    "Not set"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                <span className="text-[9.5px] text-emerald-300 block font-medium">New Value</span>
                <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                  {pendingConfirmation?.details?.newValue ||
                    latestAction?.details?.newValue ||
                    "Updated"}
                </span>
              </div>
            </div>

            {pendingConfirmation && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={confirmPendingAction}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
                >
                  ✓ Confirm & Update Profile
                </button>
                <button
                  type="button"
                  onClick={cancelPendingAction}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Contextual Action Card 2: Candidate Comparison Card (Employer) ── */}
        {latestAction?.type === "compare_candidates" && latestAction.data?.compared && (
          <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-3.5 shadow-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚖️ Candidate Analysis & Intelligence</span>
              </span>
              {latestAction.data.recommended && (
                <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                  TOP: {latestAction.data.recommended}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {latestAction.data.candidates?.map((c: any, idx: number) => {
                const isRec = c.name === latestAction?.data?.recommended;
                const displaySkills = Array.isArray(c.skills)
                  ? c.skills.join(", ")
                  : typeof c.skills === "string"
                  ? c.skills
                  : c.skills?.en || "General Worker";
                const displayLocation = typeof c.location === "string" ? c.location : c.location?.en || "Site";

                return (
                  <div
                    key={c.id || idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isRec
                        ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-100"
                        : "bg-slate-950/70 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-sm">
                        <span>{c.name}</span>
                        {isRec && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold">
                            TOP CHOICE
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5">
                        {displaySkills} • {displayLocation}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-300">{c.experience}</div>
                      <div className="text-[10px] text-slate-400">⭐ {c.rating} / 5</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {latestAction.data.reason && (
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-200 leading-snug">
                💡 <strong>JARVIS Opinion:</strong> {latestAction.data.reason}
              </div>
            )}

            {latestAction.data.recommended && (
              <button
                type="button"
                onClick={() => sendMessage(`Accept ${latestAction.data.recommended}`)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
              >
                Hire {latestAction.data.recommended} with JARVIS
              </button>
            )}
          </div>
        )}

        {/* ── Contextual Action Card 3: Job Matching Opportunities (Worker) ── */}
        {latestAction?.type === "search_jobs" && latestAction.data?.jobs?.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
              {userLocation ? `Matching Opportunities near ${userLocation}` : "Matching Opportunities"}
            </div>
            {latestAction.data.jobs.slice(0, 3).map((job: any) => (
              <div
                key={job.id}
                className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-3 shadow-lg space-y-2 hover:border-cyan-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white truncate max-w-[200px]">
                    {job.title}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    ₹{job.dailyWage}/day
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-400 flex items-center justify-between">
                  <span>📍 {job.location}</span>
                  <span>👥 {job.remainingVacancies} open</span>
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sendMessage(`Apply for job ${job.id}`)}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Apply with JARVIS
                  </button>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs no-underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Generic Approval Barrier for other actions ── */}
        {pendingConfirmation && pendingConfirmation.action !== "update_profile" && (
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-950/30 p-3.5 shadow-2xl space-y-3 animate-pulse">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <span>⚠️ Explicit Approval Required</span>
            </div>
            <div className="text-xs text-slate-100 font-medium leading-snug">
              {pendingConfirmation.summary}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={confirmPendingAction}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
              >
                ✓ Confirm & Execute
              </button>
              <button
                type="button"
                onClick={cancelPendingAction}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-900 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dynamic Suggested Action Chips (Role & context based, no scrollbar) ── */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {quickSuggestions.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => sendMessage(query)}
            className="shrink-0 text-[10.5px] px-3 py-1.5 rounded-full bg-slate-900 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-500/50 text-cyan-200 transition-colors cursor-pointer shadow-sm"
          >
            {query}
          </button>
        ))}
      </div>

      {/* ── Voice-First Dock (Siri / Iron Man Core) ── */}
      <div className="p-3.5 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-950 border-t border-cyan-500/20 flex flex-col items-center gap-2.5">
        <div className="flex items-center justify-between w-full px-2">
          {/* Discrete Keyboard Input Toggle */}
          <button
            type="button"
            onClick={() => setShowTextInput((prev) => !prev)}
            title="Toggle Keyboard Input"
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
              showTextInput
                ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-cyan-300 hover:border-slate-700"
            }`}
          >
            <span>⌨️</span>
            <span>{showTextInput ? "Voice" : "Type"}</span>
          </button>

          {/* Central Pulsing Siri / ARC Reactor Mic Button */}
          <div className="relative flex items-center justify-center">
            {isListening && (
              <div className="absolute -inset-2.5 rounded-full border-2 border-emerald-400/60 animate-ping" />
            )}
            <button
              type="button"
              onClick={handleMicClick}
              aria-label={
                isSpeaking
                  ? "Stop speech"
                  : isListening
                  ? "Stop listening"
                  : "Start speaking to JARVIS"
              }
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-90 cursor-pointer ${
                isSpeaking
                  ? "bg-sky-600 text-white shadow-[0_0_25px_rgba(56,189,248,0.7)] animate-pulse"
                  : isListening
                  ? "bg-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-pulse"
                  : "bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 text-white shadow-[0_0_20px_rgba(0,240,255,0.45)] hover:brightness-110"
              }`}
            >
              {isSpeaking ? (
                <span className="text-base font-bold">⏹</span>
              ) : isListening ? (
                <span className="w-4 h-4 rounded-full bg-white animate-pulse" />
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Weather / Location Pill */}
          {weather ? (
            <div className="text-[10px] text-right text-slate-400">
              <span className="font-extrabold text-cyan-300 text-[11px]">
                {weather.temperature}°C
              </span>
              <div>{weather.city || userLocation || "Live"}</div>
            </div>
          ) : (
            <div className="text-[10px] text-right text-slate-500">
              {userLocation || "Live"}
            </div>
          )}
        </div>

        {/* Collapsible Discrete Text Input for Quiet Spaces */}
        {showTextInput && (
          <form
            onSubmit={handleSend}
            className="w-full flex items-center gap-2 pt-1 animate-fade-in"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask in Hindi, Marathi, or English..."
              className="flex-1 bg-slate-900 border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-md"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
