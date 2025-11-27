"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const DEV_PASSCODE = process.env.NEXT_PUBLIC_DEV_PASSCODE;
const STORAGE_KEY = "omega.dev.pass";

export default function DevToolsPage() {
  const router = useRouter();
  const isProd = process.env.NODE_ENV === "production";

  /* -----------------------------------------------------
     HOOKS
  ----------------------------------------------------- */
  const [passInput, setPassInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  useEffect(() => {
    // Only run in dev
    if (!isProd) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === DEV_PASSCODE) {
        setAuthenticated(true);
      }
    }
  }, [isProd]);

  /* -----------------------------------------------------
     EARLY BLOCK
  ----------------------------------------------------- */
  if (isProd) {
    return (
      <main className="max-w-4xl mx-auto p-10 text-center">
        <h1 className="text-2xl text-red-500 font-semibold">
          Dev Tools are disabled in production.
        </h1>
      </main>
    );
  }

  /* -----------------------------------------------------
     PASSCODE SCREEN
  ----------------------------------------------------- */
  function verifyPass() {
    if (passInput === DEV_PASSCODE) {
      localStorage.setItem(STORAGE_KEY, DEV_PASSCODE);
      setAuthenticated(true);
    } else {
      alert("Incorrect passcode.");
    }
  }

  if (!authenticated) {
    return (
      <main className="max-w-4xl mx-auto p-10 space-y-6 text-center">
        <motion.h1
          className="text-3xl font-bold text-omega-gold mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🔐 Enter Dev Passcode
        </motion.h1>

        <input
          type="password"
          placeholder="Enter passcode…"
          value={passInput}
          onChange={(e) => setPassInput(e.target.value)}
          className="px-4 py-3 w-60 text-center rounded-md
                     bg-omega-green border border-omega-dark-gold
                     text-omega-gold focus:outline-none"
        />

        <button
          onClick={verifyPass}
          className="px-6 py-3 bg-omega-gold text-omega-green font-semibold
                     rounded-md shadow-lg hover:bg-omega-dark-gold transition"
        >
          Unlock
        </button>
      </main>
    );
  }

  /* -----------------------------------------------------
     API ACTION HANDLERS
  ----------------------------------------------------- */
  async function handleSeed() {
    try {
      setLoading("seed");
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Seed failed");

      setToast({
        open: true,
        message: "Dummy signals generated successfully.",
        severity: "success",
      });

      router.refresh();
    } catch (err: any) {
      setToast({
        open: true,
        message: err.message,
        severity: "error",
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleClear() {
    try {
      setLoading("clear");
      const res = await fetch("/api/dev/clear", { method: "POST" });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Clear failed");

      setToast({
        open: true,
        message: "All signals & history cleared.",
        severity: "success",
      });

      router.refresh();
    } catch (err: any) {
      setToast({
        open: true,
        message: err.message,
        severity: "error",
      });
    } finally {
      setLoading(null);
    }
  }

  /* -----------------------------------------------------
     MAIN DEV UI
  ----------------------------------------------------- */
  return (
    <main className="max-w-4xl mx-auto p-10 space-y-10">
      <motion.h1
        className="text-4xl font-bold text-omega-gold"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        ⚙️ 𝛀mega Dev Tools
      </motion.h1>

      <motion.div
        className="p-8 rounded-xl border border-omega-dark-gold bg-omega-green/40 shadow-lg space-y-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-semibold text-omega-gold">
          Database Actions
        </h2>

        <div className="flex flex-col md:flex-row gap-6">
          <button
            onClick={handleSeed}
            disabled={loading === "seed"}
            className="flex-1 px-6 py-3 bg-omega-gold text-omega-green font-semibold rounded-lg
                       hover:bg-omega-dark-gold transition shadow-md disabled:opacity-50"
          >
            {loading === "seed" ? "Generating…" : "Generate Dummy Signals"}
          </button>

          <button
            onClick={handleClear}
            disabled={loading === "clear"}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg
                       hover:bg-red-700 transition shadow-md disabled:opacity-50"
          >
            {loading === "clear" ? "Clearing…" : "Clear Signals + History"}
          </button>
        </div>
      </motion.div>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.severity}>{toast.message}</Alert>
      </Snackbar>
    </main>
  );
}
