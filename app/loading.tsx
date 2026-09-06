export default function GlobalLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-6"
      aria-busy="true"
      aria-label="Loading trading dashboard"
    >
      <div className="h-14 animate-pulse rounded-2xl border border-omega-dark-gold bg-omega-green" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-omega-dark-gold bg-omega-green"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-omega-dark-gold bg-omega-green" />
      <span className="sr-only">Loading dashboard data…</span>
    </main>
  );
}
