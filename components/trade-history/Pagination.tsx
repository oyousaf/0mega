"use client";

export default function Pagination({
  page,
  setPage,
  hasMore,
}: {
  page: number;
  setPage: (n: number) => void;
  hasMore: boolean;
}) {
  return (
    <div className="flex justify-between items-center mt-4">
      <button
        onClick={() => setPage(page - 1)}
        disabled={page === 0}
        className="px-3 py-1 rounded border border-omega-dark-gold text-omega-gold disabled:opacity-40"
      >
        Prev
      </button>

      <div className="text-omega-gold font-semibold">Page {page + 1}</div>

      <button
        onClick={() => setPage(page + 1)}
        disabled={!hasMore}
        className="px-3 py-1 rounded border border-omega-dark-gold text-omega-gold disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
