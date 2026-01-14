"use client";

import { motion } from "framer-motion";
import { FiHome, FiSettings, FiCpu } from "react-icons/fi";

export default function DashboardHeader({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  return (
    <div
      className="sticky top-[env(safe-area-inset-top)] z-50
        grid grid-cols-[1fr_auto_1fr] sm:grid-cols-3 items-center
        rounded-xl px-3 py-2 sm:px-4 sm:py-3 backdrop-blur
        bg-omega-green/70 border border-omega-dark-gold"
    >
      <div className="hidden sm:block" />

      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="text-lg sm:text-2xl md:text-3xl font-semibold
          text-omega-gold cursor-pointer select-none
          text-center leading-none"
      >
        𝛀mega
      </motion.h1>

      <div className="flex justify-end gap-1.5 sm:gap-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center
            rounded-full border border-omega-dark-gold text-omega-gold
            hover:bg-omega-dark-gold/10 transition"
        >
          <FiHome size={14} className="sm:hidden" />
          <FiHome size={16} className="hidden sm:block" />
        </motion.button>

        <div
          title="Automation running"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center
            rounded-full border border-omega-dark-gold
            text-omega-gold opacity-80"
        >
          <FiCpu size={14} className="sm:hidden" />
          <FiCpu size={16} className="hidden sm:block" />
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onOpenSettings}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center
            rounded-full border border-omega-dark-gold text-omega-gold
            hover:bg-omega-dark-gold/10 transition"
        >
          <FiSettings size={14} className="sm:hidden" />
          <FiSettings size={16} className="hidden sm:block" />
        </motion.button>
      </div>
    </div>
  );
}
