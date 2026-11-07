"use client";

import { useState } from "react";
import { FiMapPin } from "react-icons/fi";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useL } from "@/hooks/useL";
import { useLiveLocationShare } from "@/hooks/useLiveLocationShare";
import { clockTime } from "@/lib/maps";
import type { Application } from "@/types";

const ACTIVE = ["confirmed", "on_the_way", "arrived"];
const BTN = "cursor-pointer rounded-lg px-4 py-2.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";

export default function LocationSharePanel({ app }: { app: Application }) {
  const { L } = useL();
  const eligible = ACTIVE.includes(app.status ?? "") && !app.isCompleted;
  const share = useLiveLocationShare(app._id, app.locationConsent === true, eligible);
  const [asking, setAsking] = useState(false);

  if (!eligible) return null;
  const { phase } = share;
  const on = phase === "sharing";
  const employer = app.job?.companyName || L("your employer", "आपके नियोक्ता", "तुमचे मालक");

  let message: string;
  if (phase === "sharing") {
    message = L(
      `Sharing your live location with ${employer} for this job.`,
      `इस काम के लिए ${employer} को आपकी लाइव लोकेशन दिख रही है।`,
      `या कामासाठी ${employer} यांना तुमचे लाइव्ह ठिकाण दिसत आहे.`,
    );
  } else if (phase === "paused") {
    message = L(
      "Sharing is still turned on, but this screen is not sending your location. Tap Resume to continue.",
      "शेयरिंग चालू है, लेकिन यह स्क्रीन आपकी लोकेशन नहीं भेज रही। जारी रखने के लिए “फिर शुरू करें” दबाएं।",
      "शेअरिंग चालू आहे, पण ही स्क्रीन तुमचे ठिकाण पाठवत नाही. सुरू ठेवण्यासाठी “पुन्हा सुरू करा” दाबा.",
    );
  } else if (phase === "denied") {
    message = L(
      "Location permission is blocked. Allow location for this site in your browser settings, then try again.",
      "लोकेशन की अनुमति बंद है। ब्राउज़र सेटिंग में इस साइट के लिए लोकेशन की अनुमति दें, फिर कोशिश करें।",
      "लोकेशन परवानगी बंद आहे. ब्राउझर सेटिंगमध्ये या साइटसाठी लोकेशन परवानगी द्या, मग पुन्हा प्रयत्न करा.",
    );
  } else if (phase === "unavailable") {
    message = L(
      "Your phone could not find its location. Turn on GPS / location services and try again.",
      "आपका फ़ोन अपनी लोकेशन नहीं ढूँढ सका। GPS / लोकेशन सेवा चालू करके फिर कोशिश करें।",
      "तुमचा फोन ठिकाण शोधू शकला नाही. GPS / लोकेशन सेवा चालू करून पुन्हा प्रयत्न करा.",
    );
  } else if (phase === "unsupported") {
    message = L("This browser cannot share location. Try a different browser.", "यह ब्राउज़र लोकेशन शेयर नहीं कर सकता। दूसरा ब्राउज़र आज़माएं।", "हा ब्राउझर लोकेशन शेअर करू शकत नाही. दुसरा ब्राउझर वापरा.");
  } else if (phase === "starting") {
    message = L("Waiting for your phone's location…", "आपके फ़ोन की लोकेशन का इंतज़ार…", "तुमच्या फोनच्या ठिकाणाची प्रतीक्षा…");
  } else {
    message = L(
      "Location sharing is off. Your employer cannot see where you are.",
      "लोकेशन शेयरिंग बंद है। आपके नियोक्ता आपकी लोकेशन नहीं देख सकते।",
      "लोकेशन शेअरिंग बंद आहे. तुमचे मालक तुमचे ठिकाण पाहू शकत नाहीत.",
    );
  }

  const notes: string[] = [];
  if (on && share.offline) notes.push(L("No internet connection. Sharing continues when you are back online.", "इंटरनेट नहीं है। इंटरनेट लौटते ही शेयरिंग जारी रहेगी।", "इंटरनेट नाही. इंटरनेट आल्यावर शेअरिंग सुरू राहील."));
  if (on && share.gpsLost) notes.push(L("Your phone is not giving a GPS reading right now.", "आपका फ़ोन अभी GPS रीडिंग नहीं दे रहा।", "तुमचा फोन सध्या GPS रीडिंग देत नाही."));
  if (on && share.weakSignal) notes.push(L("GPS signal is weak. Move to an open area for a better location.", "GPS सिग्नल कमज़ोर है। बेहतर लोकेशन के लिए खुली जगह जाएं।", "GPS सिग्नल कमकुवत आहे. चांगल्या ठिकाणासाठी मोकळ्या जागी जा."));
  if (on) notes.push(L("Keep this screen open while sharing.", "शेयरिंग के दौरान यह स्क्रीन खुली रखें।", "शेअरिंग सुरू असताना ही स्क्रीन उघडी ठेवा."));
  if (share.error) notes.push(share.error);

  return (
    <section aria-label={L("Live location sharing", "लाइव लोकेशन शेयरिंग", "लाइव्ह लोकेशन शेअरिंग")} className={`mt-4 rounded-xl border p-4 ${on ? "border-emerald-300 bg-emerald-50" : "border-[#e6ecf5] bg-[#f8fafd]"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 inline-flex h-3 w-3 shrink-0 rounded-full ${on ? "animate-pulse bg-emerald-500" : phase === "paused" ? "bg-amber-500" : "bg-slate-400"}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#33415f]">
            <FiMapPin size={14} aria-hidden="true" />
            {on ? L("Live location: ON", "लाइव लोकेशन: चालू", "लाइव्ह लोकेशन: चालू") : phase === "paused" ? L("Live location: PAUSED", "लाइव लोकेशन: रुकी हुई", "लाइव्ह लोकेशन: थांबले") : L("Live location: OFF", "लाइव लोकेशन: बंद", "लाइव्ह लोकेशन: बंद")}
          </div>
          <p role="status" className="m-0 mt-1 text-[14px] text-[#33415f]">{message}</p>
          {on && share.lastSentAt && <p className="m-0 mt-1 text-[12.5px] text-[#5b6a88]">{L("Last sent", "आखिरी बार भेजा", "शेवटचे पाठवले")}: {clockTime(share.lastSentAt, true)}</p>}
          {notes.map((n) => (
            <p key={n} className="m-0 mt-1 text-[12.5px] text-[#5b6a88]">{n}</p>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(phase === "off" || phase === "denied" || phase === "unavailable") && (
          <button type="button" disabled={share.busy} onClick={() => setAsking(true)} className={`${BTN} bg-[#059669] text-white hover:bg-[#047857]`}>
            {phase === "off" ? L("Share my live location", "मेरी लाइव लोकेशन शेयर करें", "माझे लाइव्ह ठिकाण शेअर करा") : L("Try again", "फिर कोशिश करें", "पुन्हा प्रयत्न करा")}
          </button>
        )}
        {phase === "paused" && (
          <button type="button" disabled={share.busy} onClick={() => void share.resume()} className={`${BTN} bg-[#059669] text-white hover:bg-[#047857]`}>
            {L("Resume sharing", "फिर शुरू करें", "पुन्हा सुरू करा")}
          </button>
        )}
        {(phase === "sharing" || phase === "paused") && (
          <button type="button" disabled={share.busy} onClick={() => void share.stop()} className={`${BTN} border border-rose-300 bg-white text-rose-600 hover:bg-rose-50`}>
            {L("Stop sharing", "शेयरिंग बंद करें", "शेअरिंग थांबवा")}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={asking}
        title={L("Share your live location?", "अपनी लाइव लोकेशन शेयर करें?", "तुमचे लाइव्ह ठिकाण शेअर करायचे?")}
        message={L(
          `${employer} will see where you are on a map while you do this job. Only your latest location is saved. Nobody else can see it. Sharing stops when you tap Stop, or when the work is completed or cancelled. Your browser will ask for permission.`,
          `यह काम करते समय ${employer} नक्शे पर आपकी जगह देख पाएंगे। सिर्फ़ आपकी आखिरी लोकेशन सहेजी जाती है। और कोई इसे नहीं देख सकता। “बंद करें” दबाने पर, या काम पूरा/रद्द होने पर शेयरिंग रुक जाती है। आपका ब्राउज़र अनुमति मांगेगा।`,
          `हे काम करताना ${employer} नकाशावर तुमचे ठिकाण पाहू शकतील. फक्त तुमचे शेवटचे ठिकाण साठवले जाते. इतर कोणीही ते पाहू शकत नाही. “थांबवा” दाबल्यावर किंवा काम पूर्ण/रद्द झाल्यावर शेअरिंग थांबते. तुमचा ब्राउझर परवानगी विचारेल.`,
        )}
        confirmLabel={L("Yes, share", "हाँ, शेयर करें", "होय, शेअर करा")}
        cancelLabel={L("Not now", "अभी नहीं", "आता नाही")}
        busy={share.busy}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          void share.start();
        }}
      />
    </section>
  );
}
