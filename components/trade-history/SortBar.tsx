"use client";

export default function SortBar({
  sort,
  setSort,
}: {
  sort: string;
  setSort: (n: string) => void;
}) {
  return (
    <select
      className="mb-4 w-full p-2 rounded bg-omega-green border border-omega-dark-gold text-omega-gold"
      value={sort}
      onChange={(e) => setSort(e.target.value)}
    >
      <option value="newest">Newest First</option>
      <option value="oldest">Oldest First</option>
      <option value="best">Best P/L</option>
      <option value="worst">Worst P/L</option>
    </select>
  );
}
