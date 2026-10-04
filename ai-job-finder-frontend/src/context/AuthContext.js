import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [employer, setEmployer] = useState(null);
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    const employerToken = localStorage.getItem("employerToken");
    const employerId = localStorage.getItem("employerId");
    const workerId = localStorage.getItem("workerId");
    const workerToken = localStorage.getItem("workerToken");

    if (employerToken && employerId) {
      setEmployer({ employerId });
    }

    if (workerId) {
      setWorker({ workerId, workerToken });
    }
  }, []);

  const logoutEmployer = () => {
    localStorage.removeItem("employerToken");
    localStorage.removeItem("employerId");
    setEmployer(null);
  };

  const logoutWorker = () => {
    localStorage.removeItem("workerId");
    localStorage.removeItem("workerToken");
    localStorage.removeItem("worker");
    setWorker(null);
  };

  return (
    <AuthContext.Provider
      value={{
        employer,
        worker,
        logoutEmployer,
        logoutWorker,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
