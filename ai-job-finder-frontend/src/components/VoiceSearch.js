/*import { useState, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";

// Maps spoken words to skill values
const VOICE_SKILL_MAP = {
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
  "सुरक्षारक्षक": "Security Guard", "गार्ड": "Security Guard",
  "माळी": "Gardener", "बाग": "Gardener",
  "डिलिव्हरी": "Delivery Boy",
  "मेकॅनिक": "Mechanic",
  "गवंडी": "Mason", "बांधकाम": "Mason",
  "मजूर": "Helper",
  "घरकाम": "House Maid",
  "वेल्डर": "Welder",

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

function matchSkill(transcript) {
  const lower = transcript.toLowerCase();
  for (const [word, skill] of Object.entries(VOICE_SKILL_MAP)) {
    if (lower.includes(word.toLowerCase())) return skill;
  }
  return null;
}

export default function VoiceSearch({ onResult, placeholder }) {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError]           = useState("");
  const recogRef                    = useRef(null);
  const { language }                = useLanguage();

  const langCode = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
    recog.onerror  = (e) => {
      setListening(false);
      setError(language === "hi" ? "सुन नहीं पाया, फिर कोशिश करें" : language === "mr" ? "ऐकू आले नाही, पुन्हा प्रयत्न करा" : "Could not hear, try again");
    };

    recog.onresult = (e) => {
      const heard = Array.from(e.results[0])
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

      
      <button
        onClick={listening ? stopListening : startListening}
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: listening ? "#E8002A" : "#006491",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          boxShadow: listening
            ? "0 0 0 8px rgba(232,0,42,.2), 0 4px 16px rgba(232,0,42,.4)"
            : "0 4px 16px rgba(0,100,145,.35)",
          transition: "all .2s",
          animation: listening ? "pulse-mic 1s ease-in-out infinite" : "none",
        }}
      >
        {listening ? "🔴" : "🎤"}
      </button>

      <div style={{ fontSize: 13, fontWeight: 600, color: listening ? "#E8002A" : "#006491" }}>
        {micLabel}
      </div>

      
      {transcript && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#0c4a6e", textAlign: "center", maxWidth: 260 }}>
          🗣️ "{transcript}"
        </div>
      )}

     
      {!listening && !transcript && (
        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", maxWidth: 220 }}>
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
        <div style={{ fontSize: 12, color: "#E8002A", textAlign: "center" }}>⚠️ {error}</div>
      )}

      <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 8px rgba(232,0,42,.2), 0 4px 16px rgba(232,0,42,.4); }
          50% { box-shadow: 0 0 0 16px rgba(232,0,42,.1), 0 4px 16px rgba(232,0,42,.4); }
        }
      `}</style>
    </div>
  );
} */


//-----------------------------new
import { useState, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";

// Maps spoken words to skill values
const VOICE_SKILL_MAP = {
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

function matchSkill(transcript) {
  const lower = transcript.toLowerCase();
  for (const [word, skill] of Object.entries(VOICE_SKILL_MAP)) {
    if (lower.includes(word.toLowerCase())) return skill;
  }
  return null;
}

export default function VoiceSearch({ onResult, placeholder }) {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError]           = useState("");
  const recogRef                    = useRef(null);
  const { language }                = useLanguage();

  const langCode = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
    recog.onerror  = (e) => {
      setListening(false);
      setError(language === "hi" ? "सुन नहीं पाया, फिर कोशिश करें" : language === "mr" ? "ऐकू आले नाही, पुन्हा प्रयत्न करा" : "Could not hear, try again");
    };

    recog.onresult = (e) => {
      const heard = Array.from(e.results[0])
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

      {/* Mic button */}
      <button
        onClick={listening ? stopListening : startListening}
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: listening ? "#E8002A" : "#006491",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          boxShadow: listening
            ? "0 0 0 8px rgba(232,0,42,.2), 0 4px 16px rgba(232,0,42,.4)"
            : "0 4px 16px rgba(0,100,145,.35)",
          transition: "all .2s",
          animation: listening ? "pulse-mic 1s ease-in-out infinite" : "none",
        }}
      >
        {listening ? "🔴" : "🎤"}
      </button>

      <div style={{ fontSize: 13, fontWeight: 600, color: listening ? "#E8002A" : "#006491" }}>
        {micLabel}
      </div>

      {/* What was heard */}
      {transcript && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#0c4a6e", textAlign: "center", maxWidth: 260 }}>
          🗣️ "{transcript}"
        </div>
      )}

      {/* Hint text */}
      {!listening && !transcript && (
        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", maxWidth: 220 }}>
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
        <div style={{ fontSize: 12, color: "#E8002A", textAlign: "center" }}>⚠️ {error}</div>
      )}

      <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 8px rgba(232,0,42,.2), 0 4px 16px rgba(232,0,42,.4); }
          50% { box-shadow: 0 0 0 16px rgba(232,0,42,.1), 0 4px 16px rgba(232,0,42,.4); }
        }
      `}</style>
    </div>
  );
}