import DashboardClient from "./dashboard/DashboardClient";
import { getSignalsAll } from "./signals/actions/getSignals";

export default async function HomePage() {
  const allSignals = await getSignalsAll();
  const recentSignals = allSignals.slice(0, 5);

  return (
    <main className="max-w-7xl mx-auto w-full">
      <DashboardClient
        initialSignals={allSignals}
        recentSignals={recentSignals}
      />
    </main>
  );
}
