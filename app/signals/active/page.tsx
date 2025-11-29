import ActiveSignalsClient from "@/components/signals/ActiveSignalsClient";
import { getSignalsAll } from "../actions/getSignals";

export default async function ActiveSignalsPage() {
  const signals = await getSignalsAll();

  const activeOnly = signals.filter((s) => s.status.toUpperCase() === "ACTIVE");

  return <ActiveSignalsClient initialSignals={activeOnly} />;
}
