"use client";

export default function ChartWrapper({
  height = 300,
  children,
}: {
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height,
        minHeight: height,
        minWidth: 1,
        display: "block",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
