"use client";

import { MotionConfig } from "motion/react";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
