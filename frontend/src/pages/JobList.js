import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data);
        setFilteredJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching jobs:", err);
        setLoading(false);
      });
  }, []);

  
  useEffect(() => {
    let filtered = jobs.filter((job) => {
      const matchesSearch =
        job.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.skillRequired.toLowerCase().includes(search.toLowerCase());

      const matchesLocation =
        location === "All" ||
        (job.location && job.location.toLowerCase() === location.toLowerCase());

      return matchesSearch && matchesLocation;
    });

    setFilteredJobs(filtered);
  }, [search, location, jobs]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-16 px-6">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl md:text-5xl font-extrabold text-center text-blue-800 mb-10"
      >
        🔍 Find Your <span className="text-red-600">Perfect Job</span>
      </motion.h1>

      {/* Search + Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-5 flex flex-col md:flex-row items-center justify-between gap-4 mb-10 border-t-4 border-blue-700"
      >
        <input
          type="text"
          placeholder="Search by title, skills, or company..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="All">All Locations</option>
          {[...new Set(jobs.map((job) => job.location))].map(
            (loc, index) =>
              loc && (
                <option key={index} value={loc}>
                  {loc}
                </option>
              )
          )}
        </select>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setSearch("")}
          className="bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg hover:bg-red-600 transition-all"
        >
          Clear
        </motion.button>
      </motion.div>

      {/* Jobs Grid */}
      {loading ? (
        <p className="text-center text-gray-500 text-lg animate-pulse">
          Loading available jobs...
        </p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">
          No matching jobs found. Try adjusting filters.
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={job._id || index}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-white shadow-lg rounded-2xl p-6 hover:shadow-2xl transition-all border-t-8 border-blue-600"
            >
              <h2 className="text-2xl font-bold text-blue-700 mb-2">
                {job.jobTitle}
              </h2>
              <p className="text-gray-700 font-medium">
                <span className="text-gray-500">Company:</span> {job.company}
              </p>
              <p className="text-gray-700 font-medium">
                <span className="text-gray-500">Skills:</span> {job.skillRequired}
              </p>
              <p className="text-gray-700 font-medium">
                <span className="text-gray-500">Location:</span> {job.location}
              </p>
              <p className="text-gray-700 font-medium mb-4">
                <span className="text-gray-500">Contact:</span> {job.contact}
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-red-600 transition-all duration-300"
              >
                Apply Now
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobList;
