import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EmployerRegister() {
  const [form, setForm] = useState({});
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();

    await fetch("http://localhost:5000/api/employer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    navigate("/employer-login");
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Employer Register</h2>

      <input placeholder="Company Name" required
        onChange={e => setForm({ ...form, companyName: e.target.value })}
        className="w-full p-2 border mb-3"
      />
      <input placeholder="Email" required
        onChange={e => setForm({ ...form, email: e.target.value })}
        className="w-full p-2 border mb-3"
      />
      <input type="password" placeholder="Password" required
        onChange={e => setForm({ ...form, password: e.target.value })}
        className="w-full p-2 border mb-3"
      />

      <button className="w-full bg-[#006491] text-white py-2 rounded">
        Register
      </button>
    </form>
  );
}