"use client";


import { useState, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";

// Maps spoken words to skill values
const VOICE_SKILL_MAP: Record<string, string> = {
  // Hindi
  "पेंटर": "Painter", "रंगाई": "Painter", "पेंट": "Painter",
  "बिजली": "Electrician", "इलेक्ट्रीशियन": "Electrician", "वायरिंग": "Electrician",
  "प्लम्बर": "Plumber", "पाइप": "Plumber", "नल": "Plumber",
  "रसोइया": "Cook", "खाना": "Cook", "बावर्ची": "Cook", "कुक": "Cook",
  "ड्राइवर": "Driver", "गाड़ी": "Driver", "वाहन": "Driver",
  "बढ़ई": "Carpenter", "लकड़ी": "Carpenter", "फर्नीचर": "Carpenter",
  "सफाई": "Cleaner", "झाड़ू": "Cleaner", "सफाईकर्मी": "Cleaner",
  "गार्ड": "Security Guard", "सुरक्षा": "Security Guard",
  "माली": "Gardener", "बगीचा": "Gardener",
  "डिलीवरी": "Delivery Boy", "पार्सल": "Delivery Boy",
  "मैकेनिक": "Mechanic", "मरम्मत": "Mechanic",
  "राजमिस्त्री": "Mason", "निर्माण": "Mason", "मजदूर": "Helper",
  "मेड": "House Maid", "घरेलू": "House Maid",
  "वेल्डर": "Welder", "वेल्डिंग": "Welder",
  "वेटर": "Waiter", "होटल": "Waiter",

  // Marathi
  "रंगारी": "Painter", "रंग": "Painter",
  "इलेक्ट्रिशियन": "Electrician", "वीज": "Electrician",
  "प्लंबर": "Plumber", "नळ": "Plumber",
  "स्वयंपाकी": "Cook", "जेवण": "Cook",
  "चालक": "Driver", "गाडी": "Driver",
  "सुतार": "Carpenter", "लाकूड": "Carpenter",
  "साफसफाई": "Cleaner", "झाडू": "Cleaner",
  "सुरक्षारक्षक": "Security Guard",
  "माळी": "Gardener", "बाग": "Gardener",
  "डिलिव्हरी": "Delivery Boy",
  "मेकॅनिक": "Mechanic",
  "गवंडी": "Mason", "बांधकाम": "Mason",
  "मजूर": "Helper",
  "घरकाम": "House Maid",
  // English
  "painter": "Painter", "painting": "Painter",
  "electrician": "Electrician", "electric": "Electrician",
  "plumber": "Plumber", "plumbing": "Plumber",
  "cook": "Cook", "chef": "Cook", "cooking": "Cook",
  "driver": "Driver", "driving": "Driver",
  "carpenter": "Carpenter", "carpentry": "Carpenter",
  "cleaner": "Cleaner", "cleaning": "Cleaner",
  "security": "Security Guard", "guard": "Security Guard",
  "gardener": "Gardener", "garden": "Gardener",
  "delivery": "Delivery Boy",
  "mechanic": "Mechanic",
  "mason": "Mason", "construction": "Mason",
  "helper": "Helper", "labour": "Helper",
  "maid": "House Maid",
  "welder": "Welder", "welding": "Welder",
  "waiter": "Waiter",
};

function matchSkill(transcript: string): string | null {
  const lower = transcript.toLowerCase();
  for (const [word, skill] of Object.entries(VOICE_SKILL_MAP)) {
    if (lower.includes(word.toLowerCase())) return skill;
  }
  return null;
}

// The Web Speech API is not part of TypeScript's DOM typings, so describe the parts we use.
interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((e: { results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

interface VoiceSearchProps {
  /** Called with the matched skill (or null) and the raw transcript. */
  onResult: (skill: string | null, transcript: string) => void;
  placeholder?: string;
}

export default function VoiceSearch({ onResult, placeholder }: VoiceSearchProps) {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError]           = useState("");
  const recogRef                    = useRef<SpeechRecognitionLike | null>(null);
  const { language }                = useLanguage();

  const langCode = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";

  const startListening = () => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(language === "hi" ? "आपका ब्राउज़र वॉइस सपोर्ट नहीं करता" : language === "mr" ? "तुमचा ब्राउझर व्हॉइस सपोर्ट करत नाही" : "Voice not supported in this browser");
      return;
    }

    const recog        = new SpeechRecognition();
    recog.lang         = langCode;
    recog.interimResults = false;
    recog.maxAlternatives = 3;
    recogRef.current   = recog;

    recog.onstart  = () => { setListening(true); setError(""); setTranscript(""); };
    recog.onend    = () => setListening(false);
    recog.onerror  = () => {
      setListening(false);
      setError(language === "hi" ? "सुन नहीं पाया, फिर कोशिश करें" : language === "mr" ? "ऐकू आले नाही, पुन्हा प्रयत्न करा" : "Could not hear, try again");
    };

    recog.onresult = (e) => {
      const heard = Array.from(e.results[0] as ArrayLike<{ transcript: string }>)
        .map(r => r.transcript).join(" ");
      setTranscript(heard);

      const skill = matchSkill(heard);
      if (skill) {
        onResult(skill, heard);
      } else {
        // Pass raw transcript anyway
        onResult(null, heard);
      }
    };

    recog.start();
  };

  const stopListening = () => {
    recogRef.current?.stop();
    setListening(false);
  };

  const micLabel = language === "hi"
    ? (listening ? "सुन रहा है..." : "बोलें")
    : language === "mr"
    ? (listening ? "ऐकत आहे..." : "बोला")
    : (listening ? "Listening..." : "Speak");

  return (
    <div className="flex flex-col items-center gap-2.5">

      {/* Mic button */}
      <button
        onClick={listening ? stopListening : startListening}
        className={`w-[72px] h-[72px] rounded-full cursor-pointer flex items-center justify-center text-[28px] transition-all duration-200 ${listening ? "bg-danger shadow-[0_0_0_8px_rgba(232,0,42,.2),_0_4px_16px_rgba(232,0,42,.4)] animate-pulse-mic" : "bg-brand shadow-[0_4px_16px_rgba(0,100,145,.35)]"}`}
      >
        {listening ? "🔴" : "🎤"}
      </button>

      <div className={`text-[13px] font-semibold ${listening ? "text-danger" : "text-brand"}`}>
        {micLabel}
      </div>

      {/* What was heard */}
      {transcript && (
        <div className="bg-sky-50 border border-sky-200 rounded-[10px] py-2 px-3.5 text-[13px] text-sky-900 text-center max-w-[260px]">
          🗣️ "{transcript}"
        </div>
      )}

      {/* Hint text */}
      {!listening && !transcript && (
        <div className="text-[12px] text-gray-400 text-center max-w-[220px]">
          {placeholder || (
            language === "hi"
              ? 'कहें: "मैं पेंटर हूं" या "मुझे ड्राइवर का काम चाहिए"'
              : language === "mr"
              ? 'म्हणा: "मी पेंटर आहे" किंवा "मला ड्रायव्हरचे काम हवे"'
              : 'Say: "I am a painter" or "I need driver work"'
          )}
        </div>
      )}

      {error && (
        <div className="text-[12px] text-danger text-center">⚠️ {error}</div>
      )}
    </div>
  );
}