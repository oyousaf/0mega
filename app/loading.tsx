"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const MatrixRain = dynamic(() => import("react-matrix-rain"), {
  ssr: false,
});

export default function GlobalLoading() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 flex items-center justify-center bg-black z-[9999]"
    >
      {/* Matrix rain */}
      <div className="absolute inset-0 pointer-events-none">
        <MatrixRain />
      </div>

      {/* Centre logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/logo.png"
          alt="Omega Logo"
          width={160}
          height={160}
          priority
        />
      </motion.div>
    </motion.div>
  );
}
