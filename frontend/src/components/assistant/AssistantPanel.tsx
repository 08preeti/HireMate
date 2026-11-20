"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAssistant, type AssistantCard } from "@/context/AssistantProvider";
import { useAuth } from "@/context/AuthContext";
import { useL } from "@/hooks/useL";

function ConfirmationCard({
  card,
  onConfirm,
  onCancel,
}: {
  card: AssistantCard;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { L } = useL();
  const expired = card.state === "pending" && Date.now() > card.expiresAt;
  const active = card.state === "pending" && !expired;
  const status =
    card.state === "done"
      ? L("Done", "हो गया", "झाले")
      : card.state === "cancelled"
        ? L("Cancelled", "रद्द किया", "रद्द केले")
        : card.state === "failed"
          ? L("Not completed", "पूरा नहीं हुआ", "पूर्ण झाले नाही")
          : expired
            ? L(
                "Expired — ask me again",
                "समय समाप्त — फिर से कहें",
                "वेळ संपली — पुन्हा सांगा",
              )
            : "";
  return (
    <div
      className="ml-0 mt-2 max-w-[92%] rounded-2xl border border-[#c9d8f3] bg-white p-3 shadow-sm"
      role="group"
      aria-label={card.title}
    >
      <div className="text-[13.5px] font-bold text-[#0b1b3d]">{card.title}</div>
      <dl className="m-0 mt-2 space-y-1">
        {card.details.map((d) => (
          <div key={d.label} className="flex gap-2 text-[13px]">
            <dt className="w-24 shrink-0 text-[#5b6a88]">{d.label}</dt>
            <dd className="m-0 min-w-0 break-words text-[#0b1b3d]">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>
      {status ? (
        <p className="m-0 mt-3 text-[12.5px] font-semibold text-[#5b6a88]">
          {status}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!active}
            className={`rounded-xl border-0 px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60 ${card.danger ? "bg-[#d64545] hover:bg-[#b93a3a]" : "bg-[#1f6bff] hover:bg-[#1859d6]"}`}
          >
            {card.state === "confirming"
              ? L("Working…", "प्रक्रिया जारी…", "प्रक्रिया सुरू…")
              : card.confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={!active}
            className="rounded-xl border border-[#d5e0f3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#44546f] hover:bg-[#f1f5fc] disabled:opacity-60"
          >
            {L("Cancel", "रद्द करें", "रद्द करा")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AssistantPanel() {
  const { L } = useL();
  const { role } = useAuth();
  const {
    messages,
    busy,
    available,
    send,
    confirmCard,
    cancelCard,
    clear,
    setOpen,
  } = useAssistant();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const suggestions =
    role === "employer"
      ? [
          L(
            "Summarise my recruitment",
            "मेरी भर्ती का सारांश दो",
            "माझ्या भरतीचा सारांश द्या",
          ),
          L(
            "Show my posted jobs",
            "मेरी पोस्ट की गई नौकरियां दिखाओ",
            "माझ्या पोस्ट केलेल्या नोकऱ्या दाखवा",
          ),
          L("Any new applications?", "कोई नए आवेदन?", "नवीन अर्ज आहेत का?"),
          L("Post a new job", "नई नौकरी पोस्ट करो", "नवीन नोकरी पोस्ट करा"),
        ]
      : [
          L(
            "Find jobs near me",
            "मेरे पास नौकरियां खोजो",
            "माझ्या जवळच्या नोकऱ्या शोधा",
          ),
          L(
            "How complete is my profile?",
            "मेरी प्रोफ़ाइल कितनी पूरी है?",
            "माझी प्रोफाइल किती पूर्ण आहे?",
          ),
          L(
            "What's the status of my applications?",
            "मेरे आवेदनों की स्थिति?",
            "माझ्या अर्जांची स्थिती?",
          ),
          L(
            "Update my skills",
            "मेरी स्किल्स अपडेट करो",
            "माझी कौशल्ये अपडेट करा",
          ),
        ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  };

  return (
    <section
      role="dialog"
      aria-label={L(
        "HireMate assistant",
        "हायरमेट असिस्टेंट",
        "हायरमेट असिस्टंट",
      )}
      className={`fixed inset-x-3 z-[920] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-[#dbe5f5] bg-white shadow-[0_20px_60px_rgba(7,18,41,0.35)] sm:inset-x-auto sm:right-6 sm:w-[380px] ${role === "worker" ? "bottom-[13.5rem] sm:bottom-[13.5rem] lg:bottom-[9.5rem]" : "bottom-36 sm:bottom-24"}`}
    >
      <header className="flex items-center gap-3 bg-gradient-to-r from-[#071229] to-[#12306b] px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">
            HireMate JARVIS
          </div>
          <div className="text-[12px] text-white/70">
            {L(
              "Your Personal AI Companion",
              "आपका निजी AI साथी",
              "तुमचा वैयक्तिक AI साथी",
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border-0 bg-white/10 px-2.5 py-1 text-[12px] text-white hover:bg-white/20"
          >
            {L("Clear", "साफ़ करें", "पुसा")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={L("Minimize", "छोटा करें", "लहान करा")}
          className="h-8 w-8 rounded-lg border-0 bg-white/10 text-[18px] leading-none text-white hover:bg-white/20"
        >
          ×
        </button>
      </header>

      <div
        className="flex-1 space-y-3 overflow-y-auto bg-[#f6f9ff] px-4 py-4"
        aria-live="polite"
      >
        {available === false && (
          <p className="m-0 rounded-xl bg-[#fff4e5] px-3 py-2 text-[13px] text-[#8a5200]">
            {L(
              "The assistant isn't available right now. The rest of HireMate works as usual.",
              "असिस्टेंट अभी उपलब्ध नहीं है। हायरमेट का बाकी हिस्सा सामान्य रूप से काम करता है।",
              "असिस्टंट सध्या उपलब्ध नाही. हायरमेटचा उर्वरित भाग नेहमीप्रमाणे चालतो.",
            )}
          </p>
        )}
        {messages.length === 0 && (
          <div>
            <p className="m-0 mb-3 text-[14px] text-[#44546f]">
              {role === "employer"
                ? L(
                    "Hi! Ask me about your jobs and applicants, ask me to post a job, or tell me where you want to go.",
                    "नमस्ते! अपनी नौकरियों और आवेदकों के बारे में पूछें, नौकरी पोस्ट करने को कहें, या बताएं कहाँ जाना है।",
                    "नमस्कार! तुमच्या नोकऱ्या आणि अर्जदारांबद्दल विचारा, नोकरी पोस्ट करायला सांगा, किंवा कुठे जायचे ते सांगा.",
                  )
                : L(
                    "Hi! Ask me about jobs, your profile or your applications, ask me to update your profile, or tell me where you want to go.",
                    "नमस्ते! नौकरियों, प्रोफ़ाइल या आवेदनों के बारे में पूछें, प्रोफ़ाइल अपडेट करने को कहें, या बताएं कहाँ जाना है।",
                    "नमस्कार! नोकऱ्या, प्रोफाइल किंवा अर्जांबद्दल विचारा, प्रोफाइल अपडेट करायला सांगा, किंवा कुठे जायचे ते सांगा.",
                  )}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy || available === false}
                  onClick={() => void send(s)}
                  className="rounded-full border border-[#c9d8f3] bg-white px-3 py-1.5 text-[13px] text-[#1f4fb8] hover:bg-[#eaf1ff] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <div
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${m.role === "user" ? "bg-[#1f6bff] text-white" : m.error ? "bg-[#fdecec] text-[#a32020]" : "bg-white text-[#0b1b3d] shadow-sm"}`}
              >
                {m.text}
              </div>
            </div>
            {m.cards?.map((c) => (
              <ConfirmationCard
                key={c.token}
                card={c}
                onConfirm={() => void confirmCard(m.id, c.token)}
                onCancel={() => void cancelCard(m.id, c.token)}
              />
            ))}
          </div>
        ))}
        {busy && (
          <div
            className="flex justify-start"
            role="status"
            aria-label={L("Thinking", "सोच रहा हूँ", "विचार करत आहे")}
          >
            <div className="flex gap-1 rounded-2xl bg-white px-3.5 py-3 shadow-sm">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-[#1f6bff] motion-reduce:animate-none"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-[#e6edf8] bg-white p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          disabled={available === false}
          placeholder={L("Type a message…", "संदेश लिखें…", "संदेश लिहा…")}
          aria-label={L("Message", "संदेश", "संदेश")}
          className="min-w-0 flex-1 rounded-xl border border-[#d5e0f3] px-3 py-2 text-[14px] outline-none focus:border-[#1f6bff]"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim() || available === false}
          className="rounded-xl border-0 bg-[#1f6bff] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#1859d6] disabled:opacity-50"
        >
          {L("Send", "भेजें", "पाठवा")}
        </button>
      </form>
    </section>
  );
}
