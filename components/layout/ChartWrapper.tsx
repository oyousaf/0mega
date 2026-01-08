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
        height,
        minHeight: height,
        position: "relative",
        contain: "layout",
      }}
    >
      <div className="w-full h-full rounded-xl" style={{ overflow: "visible" }}>
        {children}
      </div>
    </div>
  );
}
