"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { getEmployerDashboard } from "@/services/employer";
import { getLiveApplications, rateApplication } from "@/services/applications";
import { fixLeafletIcons } from "@/lib/leaflet";
import { haversine } from "@/lib/geo";
import type { Application, ApplicationStatus, Job } from "@/types";


fixLeafletIcons();

const workerMovingIcon = new L.DivIcon({
  html: `<div class="w-[40px] h-[40px] rounded-full bg-amber-500 border-[3px] border-white shadow-[0_3px_12px_rgba(245,158,11,.5)] flex items-center justify-center text-[20px]">🚗</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: "",
});
const jobLocationIcon = new L.DivIcon({
  html: `<div class="w-[40px] h-[40px] rounded-full bg-danger border-[3px] border-white shadow-[0_3px_12px_rgba(232,0,42,.5)] flex items-center justify-center text-[20px]">🏠</div>`,
  iconSize: [40, 40], iconAnchor: [20, 40], className: "",
});

interface StatusStyle {
  label: string;
  icon: string;
  text: string;
  solid: string;
  soft: string;
  borderL: string;
  borderSoft: string;
  notify: string;
}

interface NotificationItem {
  id: number;
  text: string;
  icon: string;
  cfg: StatusStyle;
  jobTitle?: string;
  workerName?: string;
  status: ApplicationStatus;
  app: Application;
}

const STATUS_CONFIG: Record<ApplicationStatus, StatusStyle> = {
  // Full Tailwind class names (not built dynamically) so Tailwind can see them.
  accepted:   { label: "Worker Accepted Job", icon: "✅", text: "text-brand",       solid: "bg-brand",       soft: "bg-brand-light", borderL: "border-l-brand",       borderSoft: "border-brand/[.19]",       notify: "A worker accepted your job!" },
  on_the_way: { label: "Worker On the Way",   icon: "🚗", text: "text-amber-500",   solid: "bg-amber-500",   soft: "bg-amber-50",    borderL: "border-l-amber-500",   borderSoft: "border-amber-500/[.19]",   notify: "Worker is on the way to you!" },
  arrived:    { label: "Worker Arrived",      icon: "📍", text: "text-emerald-500", solid: "bg-emerald-500", soft: "bg-green-50",    borderL: "border-l-emerald-500", borderSoft: "border-emerald-500/[.19]", notify: "Worker has arrived!" },
  completed:  { label: "Job Completed",       icon: "🎉", text: "text-violet-500",  solid: "bg-violet-500",  soft: "bg-violet-50",   borderL: "border-l-violet-500",  borderSoft: "border-violet-500/[.19]",  notify: "Job done! Please rate the worker." },
};


function RatingModal({ app, onDone }: { app: Application; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await rateApplication(app._id, { rating, review });
      onDone();
    } catch { alert("Failed to save"); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.5)] z-[9999] flex items-center justify-center p-5">
      <div className="bg-white rounded-[20px] p-7 w-full max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,.2)]">
        <div className="text-[28px] text-center mb-1">⭐</div>
        <div className="font-bold text-[18px] text-center mb-1">Rate the Worker</div>
        <div className="text-[13px] text-[#888888] text-center mb-5">{app.worker?.name || app.applicantName}</div>
        <div className="flex justify-center gap-2 mb-4">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)} className={`text-[28px] bg-transparent cursor-pointer transition-all duration-150 ${n<=rating ? "opacity-100 scale-[1.1]" : "opacity-30 scale-100"}`}>⭐</button>
          ))}
        </div>
        <textarea placeholder="Write a review (optional)" value={review} onChange={e=>setReview(e.target.value)} className="w-full p-3 rounded-[10px] border border-[#e0e0e0] text-[13px] resize-none mb-4 box-border" rows={3} />
        <div className="flex gap-2.5">
          <button onClick={onDone} className="flex-1 p-3 bg-gray-100 rounded-[10px] cursor-pointer text-[14px] font-semibold">Skip</button>
          <button onClick={submit} disabled={saving} className="flex-[2] p-3 bg-brand text-white rounded-[10px] cursor-pointer text-[14px] font-semibold">{saving?"Saving…":"Submit Rating"}</button>
        </div>
      </div>
    </div>
  );
}

export default function EmployerDashboard() {
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [totalApps, setTotalApps]     = useState(0);
  const [liveApps, setLiveApps]       = useState<Application[]>([]);
  const [loading, setLoading]         = useState(true);
  const [notifications, setNotifs]    = useState<NotificationItem[]>([]);
  const [ratingApp, setRatingApp]     = useState<Application | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const prevStatuses                  = useRef<Record<string, ApplicationStatus | undefined>>({});

  // The (employer) layout guards the route and the API client signs out on 401.
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await getEmployerDashboard();
      setJobs(data.jobs || []);
      setTotalApps(data.totalApplications || 0);
    } catch {
      // keep the empty state; an expired session is handled centrally
    } finally { setLoading(false); }
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const data = await getLiveApplications();
      const apps = data.applications || [];
      setLiveApps(apps);
      apps.forEach(app => {
        const prev = prevStatuses.current[app._id];
        const curr = app.status;
        if (prev && curr && prev !== curr && STATUS_CONFIG[curr]) {
          setNotifs(n => [{ id: Date.now()+Math.random(), text: STATUS_CONFIG[curr].notify, icon: STATUS_CONFIG[curr].icon, cfg: STATUS_CONFIG[curr], jobTitle: app.job?.jobTitle?.en, workerName: app.worker?.name || app.applicantName, status: curr, app }, ...n].slice(0, 5));
          if (curr === "completed") setRatingApp(app);
          if (Notification.permission === "granted") new Notification(`HireMate — ${STATUS_CONFIG[curr].label}`, { body: `${app.worker?.name || "Worker"} · ${app.job?.jobTitle?.en}` });
        }
        prevStatuses.current[app._id] = curr;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard(); fetchLive();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, [fetchDashboard, fetchLive]);

  if (loading) return <div className="p-10 text-center text-[18px]">Loading…</div>;

  return (
    <>
      {ratingApp && <RatingModal app={ratingApp} onDone={() => { setRatingApp(null); fetchDashboard(); fetchLive(); }} />}

      {/* Worker tracking modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-[8888] bg-[rgba(0,0,0,.5)] flex items-end">
          <div className="bg-white w-full rounded-tl-3xl rounded-tr-3xl overflow-hidden h-[85vh] flex flex-col">
            <div className="py-3.5 px-5 flex justify-between items-center border-b border-b-[#f0f0f0]">
              <div>
                <div className="font-bold text-[16px]">🗺️ Live Worker Location</div>
                <div className="text-[13px] text-[#888888]">{selectedApp.worker?.name} · {selectedApp.job?.jobTitle?.en}</div>
              </div>
              <button onClick={() => setSelectedApp(null)} className="bg-gray-100 rounded-lg py-1.5 px-3.5 cursor-pointer font-semibold">✕ Close</button>
            </div>
            {selectedApp.status && STATUS_CONFIG[selectedApp.status] && (
              <div className={`py-2 px-5 flex items-center gap-2 text-[13px] ${STATUS_CONFIG[selectedApp.status].soft}`}>
                <span className="text-[18px]">{STATUS_CONFIG[selectedApp.status].icon}</span>
                <span className={`font-semibold ${STATUS_CONFIG[selectedApp.status].text}`}>{STATUS_CONFIG[selectedApp.status].label}</span>
                {selectedApp.worker?.currentLocation?.lat && selectedApp.job?.latitude && (
                  <span className="text-[#888888] ml-auto">
                    {haversine(selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng, selectedApp.job.latitude, (selectedApp.job.longitude ?? 0)).toFixed(1)} km away
                  </span>
                )}
              </div>
            )}
            <div className="flex-1 min-h-[0px]">
              {selectedApp.job?.latitude ? (
                <MapContainer center={selectedApp.worker?.currentLocation?.lat ? [selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng] : [selectedApp.job.latitude, (selectedApp.job.longitude ?? 0)]} zoom={14} className="h-full w-full">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[selectedApp.job.latitude, (selectedApp.job.longitude ?? 0)]} icon={jobLocationIcon}>
                    <Popup>🏠 Your Location<br />{selectedApp.job.location?.en}</Popup>
                  </Marker>
                  {selectedApp.worker?.currentLocation?.lat && (
                    <Marker position={[selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng]} icon={workerMovingIcon}>
                      <Popup>🚗 {selectedApp.worker.name}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#888888]">No location data</div>
              )}
            </div>
            <div className="pt-4 px-5 pb-6 border-t border-t-[#f0f0f0] flex justify-between items-center">
              <div>
                <div className="font-bold">{selectedApp.worker?.name || selectedApp.applicantName}</div>
                <div className="text-[13px] text-[#888888]">📞 {selectedApp.worker?.phone || selectedApp.applicantContact}</div>
              </div>
              {selectedApp.status === "completed" && (
                <button onClick={() => { setSelectedApp(null); setRatingApp(selectedApp); }} className="py-2.5 px-[18px] bg-violet-500 text-white rounded-[10px] cursor-pointer font-semibold text-[13px]">⭐ Rate Worker</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[800px] my-0 mx-auto py-6 px-4 font-plain">

        {/* Notifications */}
        {notifications.map(n => (
          <div key={n.id} className={`bg-white rounded-xl py-3 px-4 mb-2.5 shadow-[0_4px_16px_rgba(0,0,0,.12)] flex items-center gap-3 border-l-4 ${n.cfg.borderL}`}>
            <span className="text-[22px]">{n.icon}</span>
            <div className="flex-1">
              <div className={`font-bold text-[14px] ${n.cfg.text}`}>{n.text}</div>
              <div className="text-[12px] text-[#888888] mt-0.5">{n.workerName} · {n.jobTitle}</div>
            </div>
            {n.app && <button onClick={() => { setSelectedApp(n.app); setNotifs(x => x.filter(i => i.id !== n.id)); }} className={`py-1.5 px-3 text-white rounded-lg cursor-pointer text-[12px] font-semibold ${n.cfg.solid}`}>Track →</button>}
            <button onClick={() => setNotifs(x => x.filter(i => i.id !== n.id))} className="bg-transparent cursor-pointer text-[#cccccc] text-[18px]">✕</button>
          </div>
        ))}

        <Link href="/post-job" className="inline-flex items-center gap-1.5 bg-danger text-white py-2.5 px-5 rounded-[10px] font-semibold no-underline mb-5 shadow-[0_4px_14px_rgba(232,0,42,.3)]">+ Post New Job</Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[{ label:"Jobs Posted",value:jobs.length,text:"text-brand" },{ label:"Total Applicants",value:totalApps,text:"text-danger" },{ label:"Active Now",value:liveApps.length,text:"text-emerald-500" }].map(s => (
            <div key={s.label} className="bg-white rounded-[14px] py-4 px-3.5 shadow-[0_2px_10px_rgba(0,0,0,.07)] text-center">
              <div className={`text-[26px] font-extrabold ${s.text}`}>{s.value}</div>
              <div className="text-[12px] text-[#888888] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Live workers */}
        {liveApps.length > 0 && (
          <div className="mb-6">
            <div className="text-[17px] font-bold mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse-soft" />
              Workers Active Right Now
            </div>
            {liveApps.map(app => {
              const sc = (app.status && STATUS_CONFIG[app.status]) || STATUS_CONFIG.accepted;
              return (
                <div key={app._id} onClick={() => setSelectedApp(app)} className={`bg-white rounded-[14px] py-3.5 px-4 mb-2.5 shadow-[0_2px_12px_rgba(0,0,0,.08)] cursor-pointer flex items-center gap-3 border ${sc.borderSoft}`}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[22px] shrink-0 ${sc.soft}`}>{sc.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-[14px]">{app.worker?.name || app.applicantName}</div>
                    <div className="text-[12px] text-gray-500 mt-px">{app.job?.jobTitle?.en}</div>
                    <span className={`rounded-[20px] py-0.5 px-2 text-[11px] font-semibold ${sc.soft} ${sc.text}`}>{sc.label}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[12px] font-semibold ${app.worker?.currentLocation?.lat ? "text-emerald-500" : "text-gray-400"}`}>{app.worker?.currentLocation?.lat?"📡 Live":"No GPS"}</div>
                    <div className="text-[11px] text-brand mt-1 font-semibold">Tap to track →</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Jobs list */}
        <div className="text-[17px] font-bold mb-3">Your Jobs</div>
        {jobs.length === 0 ? (
          <div className="bg-[#f8f9fa] rounded-xl p-6 text-center text-[#888888]">
            <div className="text-[36px] mb-2">📋</div>
            <div className="font-semibold">No jobs posted yet</div>
            <Link href="/post-job" className="text-brand font-semibold text-[13px]">Post your first job →</Link>
          </div>
        ) : jobs.map(job => (
          <div key={job._id} className="bg-white rounded-[14px] py-3.5 px-4 mb-2.5 shadow-[0_2px_10px_rgba(0,0,0,.07)] flex justify-between items-start border border-[#f0f0f0]">
            <div>
              <div className="font-bold text-[15px] text-brand">{job.jobTitle?.en}</div>
              <div className="text-[13px] text-gray-500 mt-0.5">📍 {job.location?.en}</div>
              <div className="text-[13px] text-gray-500 mt-px">₹{job.salary} · {job.applicationCount||0} applicants</div>
            </div>
            <span className={`rounded-[20px] py-[3px] px-2.5 text-[11px] font-semibold ${job.status==="active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
              {job.status==="active"?"● Active":"Closed"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}