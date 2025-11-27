import SignalClient from "@/components/signals/SignalClient";
import { getSignalsAll } from "../actions/getSignals";

export default async function AllSignalsPage() {
  const signals = await getSignalsAll();

  return (
    <main className="max-w-7xl mx-auto w-full p-6">
      <h1 className="text-3xl font-semibold text-omega-gold mb-6">
        📁 All Signals
      </h1>

      <SignalClient initialSignals={signals} />
    </main>
  );
}
