"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAssistant } from "@/context/AssistantContext";
import { AssistantOrb } from "./AssistantOrb";
import { EnvironmentCard } from "./EnvironmentCard";
import { AssistantConfirmationModal } from "./AssistantConfirmationModal";

export function AssistantPanel() {
  const {
    isOpen,
    isMinimized,
    orbState,
    messages,
    activeTranscript,
    continuousVoice,
    isMuted,
    isListening,
    isSpeaking,
    weather,
    briefing,
    pendingConfirmation,
    closeAssistant,
    toggleMinimize,
    toggleContinuousVoice,
    toggleMute,
    startListening,
    stopListening,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    loadDailyBriefing,
    loadWeather,
    speakText,
    stopSpeaking,
  } = useAssistant();

  const [input, setInput] = useState("");
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTranscript, pendingConfirmation]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const handleChipClick = async (query: string) => {
    await sendMessage(query);
  };

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-2 rounded-full bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl animate-fade-in">
        <AssistantOrb state={orbState} size={40} onClick={toggleMinimize} />
        <div className="cursor-pointer pr-3" onClick={toggleMinimize}>
          <div className="text-xs font-bold text-cyan-300">HireMate JARVIS</div>
          <div className="text-[10px] text-slate-400 capitalize">{orbState}...</div>
        </div>
        <button
          type="button"
          onClick={closeAssistant}
          className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-full bg-slate-800"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[420px] max-w-[440px] h-[640px] max-h-[85vh] flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(0,240,255,0.15)] backdrop-blur-2xl text-slate-100 overflow-hidden animate-fade-in font-sans">
      {/* Top Futuristic Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-cyan-500/20 select-none">
        <div className="flex items-center gap-2.5">
          <AssistantOrb state={orbState} size={32} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                HIREMATE JARVIS
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                AI Companion
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Voice & Context Active</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* Continuous Voice Mode Toggle */}
          <button
            type="button"
            onClick={toggleContinuousVoice}
            title={continuousVoice ? "Continuous Voice: ON" : "Continuous Voice: OFF"}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              continuousVoice
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                : "hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            🎙️
          </button>

          {/* Mute Audio Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? "Unmute Assistant Voice" : "Mute Assistant Voice"}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              isMuted ? "bg-rose-500/20 text-rose-300" : "hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={toggleMinimize}
            title="Minimize"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          >
            —
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={closeAssistant}
            title="Close"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Weather Header Ribbon */}
      {weather && (
        <div className="px-3 pt-2">
          <div
            onClick={() => setShowWeatherDetail((p) => !p)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <EnvironmentCard weather={weather} compact={!showWeatherDetail} onRefresh={loadWeather} />
          </div>
        </div>
      )}

      {/* Main Message Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <AssistantOrb state="idle" size={64} className="mb-4" />
            <h3 className="font-bold text-base text-slate-200 mb-1">How can I assist you today?</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Ask about local jobs, today&apos;s weather, wage standards, or speak naturally in Hindi, English, or Marathi.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          const isSys = m.role === "system";

          if (isSys) {
            return (
              <div key={m.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-center text-slate-400 italic">
                {m.content}
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md ${
                  isUser
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-none"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                }`}
              >
                <div>{m.content}</div>

                {/* Speak replay button on assistant messages */}
                {!isUser && (
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <span>JARVIS</span>
                    <button
                      type="button"
                      onClick={() => speakText(m.content)}
                      className="hover:text-cyan-400 cursor-pointer flex items-center gap-1"
                      title="Read aloud"
                    >
                      🔊 Speak
                    </button>
                  </div>
                )}
              </div>

              {/* Render Search Results Cards if present */}
              {m.action?.type === "search_jobs" && m.action?.data?.jobs?.length > 0 && (
                <div className="w-full mt-2 space-y-2">
                  <div className="text-[11px] font-semibold text-cyan-300">Matching Opportunities:</div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {m.action.data.jobs.map((job: any) => (
                      <div
                        key={job.id}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-100">{job.title}</span>
                          <span className="font-extrabold text-emerald-400">₹{job.dailyWage}/day</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mb-2">
                          <span>📍 {job.location}</span>
                          <span>•</span>
                          <span>{job.remainingVacancies} open</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium"
                          >
                            View Job
                          </Link>
                          <button
                            type="button"
                            onClick={() => sendMessage(`Apply for ${job.title} at ${job.location}`)}
                            className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold"
                          >
                            Apply with JARVIS
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Inline Confirmation Card if waiting for user confirmation */}
        {pendingConfirmation && (
          <AssistantConfirmationModal
            confirmation={pendingConfirmation}
            onConfirm={confirmPendingAction}
            onCancel={cancelPendingAction}
            isExecuting={orbState === "action"}
          />
        )}

        {/* Live Audio Speech Recognition Preview */}
        {isListening && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center gap-2.5 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="flex-1">
              <span className="font-semibold text-emerald-400">Listening: </span>
              <span className="text-slate-200 italic">
                {activeTranscript || "Speak now..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Query Chips */}
      <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          "Show jobs near me",
          "Today's weather",
          "My applications",
          "Daily briefing",
          "Post a job",
        ].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 whitespace-nowrap transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Bottom Controls & Input */}
      <div className="p-3 bg-slate-900/90 border-t border-cyan-500/20 backdrop-blur-md">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Big Voice Microphone Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Stop listening" : "Start voice listening"}
            aria-label="Voice input"
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              isListening
                ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)] animate-bounce"
                : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak or type (English, हिंदी, मराठी)..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
