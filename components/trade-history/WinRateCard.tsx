"use client";

export default function WinRateCard({ trades }: { trades: any[] }) {
  if (!trades.length) return null;

  const closed = trades.filter(t => t.realised_pl !== null);
  const wins = closed.filter(t => t.realised_pl > 0).length;
  const losses = closed.filter(t => t.realised_pl < 0).length;
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;

  const avgPL =
    closed.length > 0
      ? closed.reduce((a, b) => a + Number(b.realised_pl), 0) / closed.length
      : 0;

  return (
    <div className="mb-4 p-4 rounded border border-omega-dark-gold bg-omega-green text-omega-gold">
      <div className="text-lg font-bold">Performance Summary</div>

      <div className="mt-2 text-sm opacity-80">
        Trades: {closed.length}  
        <br />
        Wins: {wins}  
        <br />
        Losses: {losses}  
        <br />
        Win Rate: {winRate.toFixed(1)}%  
        <br />
        Avg P/L: £{avgPL.toFixed(2)}
      </div>
    </div>
  );
}
