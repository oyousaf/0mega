"use client";

import { useState } from "react";

export default function DevSeedButton() {
  if (process.env.NODE_ENV !== "development") return null;

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function seed() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/dev/seed");
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed");

      setMsg(`Inserted ${json.count} signals.`);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={seed}
        disabled={loading}
        className="bg-omega-gold text-omega-green font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-omega-dark-gold"
      >
        {loading ? "Seeding…" : "Seed DB (Dev)"}
      </button>

      {msg && (
        <p className="mt-2 text-sm text-omega-gold bg-omega-green/60 px-3 py-1 rounded">
          {msg}
        </p>
      )}
    </div>
  );
}
