import React from "react";

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-indigo-800 via-purple-700 to-pink-600 text-white text-center py-24 px-4">
      <h1 className="text-5xl font-extrabold mb-4 drop-shadow-md">Explore Trending Jobs</h1>
      <p className="text-lg text-gray-200 mb-8">
        Find the best local jobs near you instantly 🚀
      </p>
      <input
        type="text"
        placeholder="Search by skill, title or location..."
        className="w-80 px-4 py-3 rounded-full text-black shadow-md outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </section>
  );
};

export default Hero;
