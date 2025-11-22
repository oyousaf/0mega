"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignalForm from "@/components/signals/SignalForm";
import { Button } from "@mui/material";

export default function NewSignalPage() {
  const router = useRouter();

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto w-full p-6 space-y-10"
    >
      {/* Breadcrumbs */}
      <div className="text-sm text-foreground opacity-70">
        <Link href="/" className="hover:underline">
          Dashboard
        </Link>{" "}
        /{" "}
        <Link href="/signals" className="hover:underline">
          Signals
        </Link>{" "}
        / <span className="text-omega-gold">New</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ➕ Add New Signal
        </motion.h1>

        <Link href="/signals">
          <Button
            variant="outlined"
            sx={{
              borderColor: "var(--omega-gold)",
              color: "var(--omega-gold)",
              "&:hover": { borderColor: "var(--omega-dark-gold)" },
            }}
          >
            Back
          </Button>
        </Link>
      </div>

      {/* FORM */}
      <SignalForm
        mode="add"
        submitLabel="Add Signal"
        onSuccess={() => router.push("/signals")}
      />
    </motion.main>
  );
}
