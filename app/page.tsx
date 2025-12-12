import { Suspense } from "react";
import Loading from "./loading";
import DashboardClient from "./dashboard/DashboardClient";

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <main className="max-w-7xl mx-auto w-full min-h-0 min-w-0">
        <DashboardClient />
      </main>
    </Suspense>
  );
}
