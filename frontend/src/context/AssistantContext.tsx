"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import { announceAssistantDataChanged } from "@/lib/assistantEvents";
import {
  fetchGreeting,
  fetchDailyBriefing,
  fetchWeather,
  sendMessageToAssistant,
  executeAssistantAction,
} from "@/services/assistantApi";
import type {
  AssistantGreeting,
  AssistantMessage,
  AssistantOrbState,
  ConfirmationPayload,
  DailyBriefing,
  WeatherData,
} from "@/types/assistant";

// Web Speech types
interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  onresult: ((e: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
};

/**
 * Select the highest quality modern, natural JARVIS AI voice from available browser synthesizers.
 * Avoids legacy robotic Windows Desktop SAPI5 voices (David/Mark) and prefers natural, neural, Google UK/US,
 * or Microsoft Natural online voices.
 */
function getBestJarvisVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetPrefix = lang === "hi" ? "hi" : lang === "mr" ? "mr" : "en";
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(targetPrefix));

  if (targetPrefix === "en") {
    // 1. Quintessential British/UK English male or Google UK (classic Iron Man JARVIS tone)
    const jarvisUk = langVoices.find(
      (v) =>
        /Google UK English Male/i.test(v.name) ||
        (/uk english/i.test(v.name) && /male/i.test(v.name)) ||
        (/en-GB/i.test(v.lang) && /natural|neural|online/i.test(v.name) && !/female/i.test(v.name)),
    );
    if (jarvisUk) return jarvisUk;

    // 2. Modern Microsoft Natural Online AI voices (Ryan, Christopher, Guy, Andrew, Brian)
    const naturalMale = langVoices.find(
      (v) =>
        /natural|neural|online/i.test(v.name) &&
        /(ryan|christopher|guy|andrew|brian|george|arthur|oliver)/i.test(v.name),
    );
    if (naturalMale) return naturalMale;

    // 3. Modern Google English or any neural voice (not legacy desktop)
    const modernEn = langVoices.find(
      (v) =>
        (/google/i.test(v.name) && !/desktop/i.test(v.name)) ||
        /natural|neural/i.test(v.name),
    );
    if (modernEn) return modernEn;

    // 4. Indian English natural voice
    const inEn = langVoices.find((v) => /en-IN/i.test(v.lang) && !/desktop/i.test(v.name));
    if (inEn) return inEn;
  } else if (targetPrefix === "hi") {
    // Modern natural Hindi voice
    const modernHi = langVoices.find(
      (v) =>
        /madhur|swara|natural|neural/i.test(v.name) ||
        /google/i.test(v.name),
    );
    if (modernHi) return modernHi;
  } else if (targetPrefix === "mr") {
    // Modern natural Marathi voice
    const modernMr = langVoices.find(
      (v) =>
        /manohar|aarohi|natural|neural/i.test(v.name) ||
        /google/i.test(v.name),
    );
    if (modernMr) return modernMr;
  }

  // Fallback to any non-legacy desktop voice in that language
  return (
    langVoices.find((v) => !/desktop/i.test(v.name)) ||
    langVoices[0] ||
    voices.find((v) => /natural|neural|google/i.test(v.name)) ||
    null
  );
}

interface AssistantContextValue {
  isOpen: boolean;
  isMinimized: boolean;
  orbState: AssistantOrbState;
  messages: AssistantMessage[];
  activeTranscript: string;
  continuousVoice: boolean;
  isMuted: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  autoplayBlocked: boolean;
  greeting: AssistantGreeting | null;
  weather: WeatherData | null;
  briefing: DailyBriefing | null;
  pendingConfirmation: ConfirmationPayload | null;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  toggleMinimize: () => void;
  toggleContinuousVoice: () => void;
  toggleMute: () => void;
  startVoiceGreeting: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendMessage: (text: string) => Promise<void>;
  confirmPendingAction: () => Promise<void>;
  cancelPendingAction: () => void;
  loadDailyBriefing: () => Promise<void>;
  loadWeather: () => Promise<void>;
  speakText: (text: string, options?: { isGreeting?: boolean }) => void;
  stopSpeaking: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, role, user } = useAuth();
  const { language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [orbState, setOrbState] = useState<AssistantOrbState>("idle");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [activeTranscript, setActiveTranscript] = useState("");
  const [continuousVoice, setContinuousVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const [greeting, setGreeting] = useState<AssistantGreeting | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationPayload | null>(null);

  const recogRef = useRef<RecognitionLike | null>(null);
  const coordsRef = useRef<{ latitude?: number; longitude?: number }>({});
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const welcomedUserIdRef = useRef<string | null>(null);
  const pendingTranscriptRef = useRef<string>("");
  const transcriptDispatchedRef = useRef<boolean>(false);
  const speakTextRef = useRef<(text: string, options?: { isGreeting?: boolean }) => void>(() => {});

  // Read preferences from localStorage on client
  useEffect(() => {
    try {
      const savedMute = localStorage.getItem("hm_jarvis_muted");
      if (savedMute) setIsMuted(savedMute === "true");
      const savedContinuous = localStorage.getItem("hm_jarvis_continuous");
      if (savedContinuous) setContinuousVoice(savedContinuous === "true");
    } catch {}
  }, []);

  // Request browser geolocation once authenticated
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coordsRef.current = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        },
        () => {},
        { timeout: 8000 },
      );
    }
  }, [authenticated]);

  // Stop speaking helper with barge-in support
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    if (orbState === "speaking") {
      setOrbState("idle");
    }
  }, [orbState]);

  // Send message internal
  const sendMessageInternal = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setOrbState("thinking");

      try {
        const res = await sendMessageToAssistant({
          message: text.trim(),
          context: {
            currentRoute: pathname,
            latitude: coordsRef.current.latitude,
            longitude: coordsRef.current.longitude,
          },
        });

        const assistantMsg: AssistantMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          timestamp: new Date().toISOString(),
          action: res.action,
          suggestedQueries: res.suggestedQueries,
          error: res.error,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Client-side Autonomous Navigation & Form Prefill
        if (res.action?.route) {
          router.push(res.action.route);
        } else if (res.action?.clientAction?.route) {
          router.push(res.action.clientAction.route);
        }
        if (res.action?.prefill && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hiremate:prefill-job", { detail: res.action.prefill }));
        }

        // If action requires explicit confirmation
        if (res.action?.requiresConfirmation) {
          setPendingConfirmation(res.action as ConfirmationPayload);
          setOrbState("confirmation");
        } else if (res.action) {
          setOrbState("executing");
          setTimeout(() => setOrbState("success"), 1200);
          setTimeout(() => setOrbState("idle"), 2500);
        } else {
          setOrbState("idle");
        }

        // Speak assistant response
        speakTextRef.current(res.reply);
      } catch (err: any) {
        const errorMsg: AssistantMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "I am having trouble communicating with the server right now. Please try again.",
          timestamp: new Date().toISOString(),
          error: err.message,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setOrbState("error");
        speakTextRef.current("I encountered a connection error. Please try again.");
        setTimeout(() => setOrbState("idle"), 3000);
      }
    },
    [pathname, router],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      await sendMessageInternal(text);
    },
    [sendMessageInternal],
  );

  // Safely commit and dispatch voice transcript so spoken commands are never discarded
  const commitTranscript = useCallback((textOverride?: string) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const rawToSend = (textOverride || pendingTranscriptRef.current).trim();
    // Clean trailing dots / punctuation that Web Speech API auto-appends
    const toSend = rawToSend.replace(/[.,!?;:]+$/g, "").trim() || rawToSend;
    if (toSend && !transcriptDispatchedRef.current) {
      transcriptDispatchedRef.current = true;
      pendingTranscriptRef.current = "";
      setActiveTranscript("");
      try {
        recogRef.current?.abort();
      } catch {}
      setIsListening(false);
      setOrbState("thinking");
      sendMessageInternal(toSend);
    }
  }, [sendMessageInternal]);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const currentText = pendingTranscriptRef.current.trim();
    if (currentText && !transcriptDispatchedRef.current) {
      commitTranscript(currentText);
      return;
    }
    try {
      recogRef.current?.stop();
    } catch {}
    setIsListening(false);
    setActiveTranscript("");
    if (orbState === "listening") {
      setOrbState("idle");
    }
  }, [orbState, commitTranscript]);

  // Pre-load synthesis voices so natural neural voices are available on first speech turn
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Text-To-Speech function with modern natural neural voice selection
  const speakText = useCallback(
    (text: string, options?: { isGreeting?: boolean }) => {
      if (isMuted || typeof window === "undefined" || !window.speechSynthesis || !text) return;

      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);

      // Select highest quality modern natural voice matching language
      const bestVoice = getBestJarvisVoice(language);
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
      }
      utterance.rate = 1.05; // Modern, crisp, energetic assistant tempo
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setOrbState("speaking");
        setAutoplayBlocked(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setOrbState("idle");
        // In continuous voice mode, resume listening after speech ends
        if (continuousVoice && isOpen) {
          setTimeout(() => {
            startListeningInternal();
          }, 400);
        }
      };

      utterance.onerror = (e: any) => {
        setIsSpeaking(false);
        setOrbState("idle");
        if (options?.isGreeting || e?.error === "not-allowed") {
          setAutoplayBlocked(true);
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
        // Autoplay check for greetings: if browser blocks audio without gesture
        if (options?.isGreeting) {
          setTimeout(() => {
            if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
              setAutoplayBlocked(true);
            }
          }, 350);
        }
      } catch {
        if (options?.isGreeting) setAutoplayBlocked(true);
      }
    },
    [isMuted, language, continuousVoice, isOpen],
  );

  speakTextRef.current = speakText;

  // Internal start listening (voice-first, explicit user action)
  const startListeningInternal = useCallback(() => {
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    // Barge-in: immediately stop assistant speech when listening starts
    stopSpeaking();

    try {
      recogRef.current?.abort();
    } catch {}

    pendingTranscriptRef.current = "";
    transcriptDispatchedRef.current = false;

    const recog = new Ctor();
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;
    recog.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";

    recog.onstart = () => {
      setIsListening(true);
      setOrbState("listening");
      setActiveTranscript("");
      transcriptDispatchedRef.current = false;
    };

    recog.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const heard = (final || interim).trim();
      if (heard) {
        pendingTranscriptRef.current = heard;
        setActiveTranscript(heard);
      }

      // Reset silence timer on voice activity
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (final.trim()) {
        commitTranscript(final.trim());
      } else if (interim.trim()) {
        // Auto-finalize if user pauses speaking for 800ms
        silenceTimerRef.current = setTimeout(() => {
          commitTranscript(interim.trim());
        }, 800);
      }
    };

    recog.onerror = () => {
      if (pendingTranscriptRef.current.trim() && !transcriptDispatchedRef.current) {
        commitTranscript();
      } else {
        setIsListening(false);
        setOrbState("idle");
      }
    };

    recog.onend = () => {
      if (pendingTranscriptRef.current.trim() && !transcriptDispatchedRef.current) {
        commitTranscript();
      } else {
        setIsListening(false);
        if (orbState === "listening") {
          setOrbState("idle");
        }
      }
    };

    recogRef.current = recog;
    try {
      recog.start();
    } catch {
      setIsListening(false);
    }
  }, [language, stopSpeaking, orbState, commitTranscript]);

  const startListening = useCallback(() => {
    startListeningInternal();
  }, [startListeningInternal]);

  // Execute confirmed pending action
  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    setOrbState("executing");

    try {
      const res = await executeAssistantAction(
        pendingConfirmation.action,
        pendingConfirmation.details,
      );

      const confirmMsg: AssistantMessage = {
        id: `conf-${Date.now()}`,
        role: "system",
        content: `Action executed successfully: ${res.result?.message || pendingConfirmation.title}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, confirmMsg]);
      setPendingConfirmation(null);
      setOrbState("success");

      // Notify open pages and refresh models
      if (pendingConfirmation.action === "update_profile") {
        announceAssistantDataChanged({ area: "profile", worker: res.result?.profile });
      } else if (pendingConfirmation.action === "create_job_post" || pendingConfirmation.action === "post_job") {
        announceAssistantDataChanged({ area: "jobs" });
      }

      speakText(res.result?.message || "Action confirmed and executed successfully.");
      setTimeout(() => setOrbState("idle"), 2000);
    } catch (err: any) {
      setOrbState("error");
      const errMsg: AssistantMessage = {
        id: `err-conf-${Date.now()}`,
        role: "system",
        content: `Failed to execute: ${err.message}`,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
      setMessages((prev) => [...prev, errMsg]);
      speakText(`Error: ${err.message}`);
      setTimeout(() => setOrbState("idle"), 3000);
    }
  }, [pendingConfirmation, speakText]);

  const cancelPendingAction = useCallback(() => {
    setPendingConfirmation(null);
    setOrbState("idle");
    const cancelMsg: AssistantMessage = {
      id: `canc-${Date.now()}`,
      role: "system",
      content: "Action cancelled.",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, cancelMsg]);
    speakText("Action cancelled.");
  }, [speakText]);

  // Load weather
  const loadWeather = useCallback(async () => {
    try {
      const w = await fetchWeather(coordsRef.current);
      setWeather(w);
    } catch {}
  }, []);

  // Load daily briefing
  const loadDailyBriefing = useCallback(async () => {
    try {
      setOrbState("thinking");
      const b = await fetchDailyBriefing(coordsRef.current);
      setBriefing(b);
      setOrbState("idle");
      if (b.voiceBriefing) {
        speakText(b.voiceBriefing);
      }
    } catch {
      setOrbState("error");
      setTimeout(() => setOrbState("idle"), 2000);
    }
  }, [speakText]);

  // 1. Automatically initiate the welcome experience on login or dashboard load
  useEffect(() => {
    if (!authenticated || !user) {
      setGreeting(null);
      setBriefing(null);
      setMessages([]);
      welcomedUserIdRef.current = null;
      return;
    }

    const currentUserId = (user as any)._id || (user as any).id || role;
    if (welcomedUserIdRef.current === currentUserId) {
      // Welcome already initiated for this user session
      return;
    }
    welcomedUserIdRef.current = currentUserId;

    let isSubscribed = true;
    fetchGreeting(coordsRef.current)
      .then((g) => {
        if (!isSubscribed) return;
        setGreeting(g);
        if (g.weather) setWeather(g.weather);

        // Add greeting message to dialog history
        setMessages((prev) => {
          if (prev.length === 0) {
            return [
              {
                id: `greet-${Date.now()}`,
                role: "assistant",
                content: g.spokenGreeting,
                timestamp: g.timestamp,
                suggestedQueries: g.suggestedActions.map((a) => a.query),
              },
            ];
          }
          return prev;
        });

        // Automatically open the assistant welcome view
        setIsOpen(true);
        setOrbState("greeting");

        // Attempt voice greeting
        if (!isMuted) {
          speakText(g.spokenGreeting, { isGreeting: true });
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [authenticated, user, role, isMuted, speakText]);

  // Start voice greeting on explicit user unlock
  const startVoiceGreeting = useCallback(() => {
    setAutoplayBlocked(false);
    if (greeting?.spokenGreeting) {
      speakText(greeting.spokenGreeting);
    }
  }, [greeting, speakText]);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
    stopSpeaking();
    stopListening();
  }, [stopSpeaking, stopListening]);

  const toggleAssistant = useCallback(() => {
    if (isOpen) {
      closeAssistant();
    } else {
      openAssistant();
    }
  }, [isOpen, closeAssistant, openAssistant]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const toggleContinuousVoice = useCallback(() => {
    setContinuousVoice((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hm_jarvis_continuous", String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hm_jarvis_muted", String(next));
      } catch {}
      if (next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  const value: AssistantContextValue = {
    isOpen,
    isMinimized,
    orbState,
    messages,
    activeTranscript,
    continuousVoice,
    isMuted,
    isListening,
    isSpeaking,
    autoplayBlocked,
    greeting,
    weather,
    briefing,
    pendingConfirmation,
    openAssistant,
    closeAssistant,
    toggleAssistant,
    toggleMinimize,
    toggleContinuousVoice,
    toggleMute,
    startVoiceGreeting,
    startListening,
    stopListening,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    loadDailyBriefing,
    loadWeather,
    speakText,
    stopSpeaking,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}
