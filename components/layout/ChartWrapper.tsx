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
      className="w-full overflow-hidden rounded-xl"
      style={{
        height,
        minHeight: height,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
