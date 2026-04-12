/*
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { translations } from "./translations";

import Header           from "./components/Header";
import Home             from "./pages/Home";
import EmployerRegister from "./pages/EmployerRegister";
import EmployerLogin    from "./pages/EmployerLogin";
import EmployerDashboard from "./pages/EmployerDashboard";
import PostJobs         from "./pages/PostJobs";
import Jobs             from "./pages/Jobs";
import JobDetails       from "./pages/JobDetails";
import Applications     from "./pages/Applications";
import WorkerProfile    from "./pages/WorkerProfile";
import WorkerRegister   from "./pages/WorkerRegister";
import WorkerLogin      from "./pages/WorkerLogin";
import MyJobs           from "./pages/MyJobs";
import WorkerDashboard  from "./pages/WorkerDashboard";
import JobNavigation    from "./pages/JobNavigation";
import AISuggestions    from "./pages/AISuggestions";
import Onboarding       from "./pages/Onboarding";

export default function App() {
  const [language, setLanguage] = useState("en");
  const t = translations[language];

  return (
    <BrowserRouter>
      <Header language={language} setLanguage={setLanguage} t={t} />
      <Routes>
        <Route path="/"                   element={<Home t={t} />} />
        <Route path="/employer-register"  element={<EmployerRegister />} />
        <Route path="/employer-login"     element={<EmployerLogin />} />
        <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        <Route path="/post-job"           element={<PostJobs />} />
        <Route path="/jobs"               element={<Jobs />} />
        <Route path="/jobs/:id"           element={<JobDetails />} />
        <Route path="/applications"       element={<Applications />} />
        <Route path="/worker-register"    element={<WorkerRegister />} />
        <Route path="/worker-login"       element={<WorkerLogin />} />
        <Route path="/worker-profile"     element={<WorkerProfile />} />
        <Route path="/my-jobs"            element={<MyJobs />} />
        <Route path="/worker-dashboard"   element={<WorkerDashboard />} />
        <Route path="/navigate"           element={<JobNavigation />} />
        <Route path="/ai-suggestions"     element={<AISuggestions />} />
        <Route path="/onboarding"          element={<Onboarding />} />
      </Routes>
    </BrowserRouter>
  );
}  */



//---------------------------
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { translations } from "./translations";

import Header           from "./components/Header";
import BottomNav        from "./components/BottomNav";
import { ToastProvider } from "./components/Toast";

import Home             from "./pages/Home";
import EmployerRegister from "./pages/EmployerRegister";
import EmployerLogin    from "./pages/EmployerLogin";
import EmployerDashboard from "./pages/EmployerDashboard";
import PostJobs         from "./pages/PostJobs";
import Jobs             from "./pages/Jobs";
import JobDetails       from "./pages/JobDetails";
import Applications     from "./pages/Applications";
import WorkerProfile    from "./pages/WorkerProfile";
import WorkerRegister   from "./pages/WorkerRegister";
import WorkerLogin      from "./pages/WorkerLogin";
import MyJobs           from "./pages/MyJobs";
import WorkerDashboard  from "./pages/WorkerDashboard";
import JobNavigation    from "./pages/JobNavigation";
import AISuggestions    from "./pages/AISuggestions";
import Onboarding       from "./pages/Onboarding";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function App() {
  const [language, setLanguage] = useState("en");
  const t = translations[language];

  // Wake up Render backend on app load to reduce cold start delay
  useEffect(() => {
    fetch(`${BASE}/`).catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Header language={language} setLanguage={setLanguage} t={t} />
        <Routes>
          <Route path="/"                   element={<Home t={t} />} />
          <Route path="/employer-register"  element={<EmployerRegister />} />
          <Route path="/employer-login"     element={<EmployerLogin />} />
          <Route path="/employer-dashboard" element={<EmployerDashboard />} />
          <Route path="/post-job"           element={<PostJobs />} />
          <Route path="/jobs"               element={<Jobs />} />
          <Route path="/jobs/:id"           element={<JobDetails />} />
          <Route path="/applications"       element={<Applications />} />
          <Route path="/worker-register"    element={<WorkerRegister />} />
          <Route path="/worker-login"       element={<WorkerLogin />} />
          <Route path="/worker-profile"     element={<WorkerProfile />} />
          <Route path="/my-jobs"            element={<MyJobs />} />
          <Route path="/worker-dashboard"   element={<WorkerDashboard />} />
          <Route path="/navigate"           element={<JobNavigation />} />
          <Route path="/ai-suggestions"     element={<AISuggestions />} />
          <Route path="/onboarding"         element={<Onboarding />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </ToastProvider>
  );
}