import React from "react";
import { Link } from "react-router-dom";

const JobCard = ({ job }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
      <h2 className="text-xl font-bold mb-1">{job.jobTitle}</h2>

      <p className="text-sm text-gray-600 mb-1">
        {job.companyName} • {job.location}
      </p>

      <p className="text-sm mb-2">
        <strong>Skills:</strong> {job.skills}
      </p>

      <p className="text-sm mb-2">
        <strong>Salary:</strong> ₹{job.salary}
      </p>

      {job.description && (
        <p className="text-sm text-gray-700 mb-3">
          {job.description}
        </p>
      )}

      <Link
        to={`/jobs/${job._id}`}
        className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View Details
      </Link>
    </div>
  );
};

export default JobCard;
