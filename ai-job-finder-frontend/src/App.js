import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { translations } from "./translations";

import Header from "./components/Header";

import Home from "./pages/Home";
import EmployerRegister from "./pages/EmployerRegister";
import EmployerLogin from "./pages/EmployerLogin";
import EmployerDashboard from "./pages/EmployerDashboard";
import PostJobs from "./pages/PostJobs";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Applications from "./pages/Applications";

import WorkerProfile from "./pages/WorkerProfile";
import WorkerRegister from "./pages/WorkerRegister";

import MyJobs from "./pages/MyJobs";

import WorkerDashboard from "./pages/WorkerDashboard";

import JobNavigation from "./pages/JobNavigation";

export default function App() {
  const [language, setLanguage] = useState("en");

  const t = translations[language];

  return (
    <BrowserRouter>
      {/* Pass language + setLanguage + t to Header */}
      <Header language={language} setLanguage={setLanguage} t={t}/>


      <Routes>
        <Route path="/" element={<Home t={t} />} />
        <Route path="/employer-register" element={<EmployerRegister t={t} />} />
        <Route path="/employer-login" element={<EmployerLogin t={t} />} />
        <Route path="/employer-dashboard" element={<EmployerDashboard t={t} />} />
        <Route path="/post-job" element={<PostJobs t={t} />} />
        <Route path="/jobs" element={<Jobs t={t} />} />
        <Route path="/jobs/:id" element={<JobDetails t={t} />} />
        <Route path="/applications" element={<Applications t={t} />} />
        <Route path="/worker-register" element={<WorkerRegister t={t} />} />
        <Route path="/worker-profile" element={<WorkerProfile t={t} />} />

        <Route path="/my-jobs" element={<MyJobs t={t} />} />
        <Route path="/worker-dashboard" element={<WorkerDashboard t={t} />} />
        <Route path="/navigate" element={<JobNavigation t={t} />} />

        
      </Routes>
    </BrowserRouter>
  );
}
