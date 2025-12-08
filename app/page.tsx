import { Suspense } from "react";
import Loading from "./loading";
import DashboardClient from "./dashboard/DashboardClient";
import { getSignalsAll } from "./signals/actions/getSignals";

export default async function HomePage() {
  const allSignals = await getSignalsAll();
  const recentSignals = allSignals.slice(0, 5);

  return (
    <Suspense fallback={<Loading />}>
      <main className="max-w-7xl mx-auto w-full min-h-0 min-w-0">
        <DashboardClient
          initialSignals={allSignals}
          recentSignals={recentSignals}
        />
      </main>
    </Suspense>
  );
}
