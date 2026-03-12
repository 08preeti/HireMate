import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function EmployerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:5000/api/employer/dashboard",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setJobs(res.data.jobs || []);
      setApplications(Array(res.data.totalApplications).fill({}));
      setLoading(false);
    } catch (error) {
      console.error("Dashboard Error:", error);
      setLoading(false);
    }
  };

  fetchDashboard();
}, []);


  if (loading) {
    return <div className="p-10 text-xl">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Post Job Button */}
      <Link
        to="/post-job"
        className="inline-block bg-red-600 text-white px-6 py-2 rounded-md font-semibold mb-8 hover:bg-red-700"
      >
        + Post New Job
      </Link>

      {/* Stats */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Total Jobs Posted</p>
          <h2 className="text-3xl font-bold text-blue-600">
            {jobs.length}
          </h2>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Total Applications</p>
          <h2 className="text-3xl font-bold text-red-600">
            {applications.length}
          </h2>
        </div>
      </div>

      {/* Jobs List */}
      <h2 className="text-2xl font-bold mb-4">Your Jobs</h2>

      {jobs.length === 0 ? (
        <p className="text-gray-600">No jobs posted yet.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white shadow rounded-lg p-6"
            >
              <h3 className="text-lg font-bold text-blue-700">
                {job.jobTitle?.en}
              </h3>

              <p className="text-sm text-gray-600">
                Location: {job.location?.en}
              </p>

              <p className="text-sm text-gray-600">
                Salary: ₹{job.salary}
              </p>


              <p className="text-sm text-gray-600">
                Applications: {job.applicationCount || 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
