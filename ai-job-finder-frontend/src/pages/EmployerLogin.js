import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EmployerLogin() {

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/employer/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      console.log("LOGIN RESPONSE:", data);

      if (!data.token) {
        alert("Login Failed");
        return;
      }

      // ✅ Save token
      localStorage.setItem("token", data.token);

      alert("Login Success");

      navigate("/employer-dashboard");

    } catch (error) {
      console.log(error);
      alert("Login Error");
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-6">

      <h2 className="text-xl font-bold mb-4">
        Employer Login
      </h2>

      <input
        placeholder="Email"
        required
        onChange={(e) =>
          setForm({ ...form, email: e.target.value })
        }
        className="w-full p-2 border mb-3"
      />

      <input
        type="password"
        placeholder="Password"
        required
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
        className="w-full p-2 border mb-3"
      />

      <button className="w-full bg-[#006491] text-white py-2 rounded">
        Login
      </button>

    </form>
  );
}