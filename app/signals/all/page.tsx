import SignalClient from "@/components/signals/SignalClient";
import { getSignalsAll } from "../actions/getSignals";

export default async function AllSignalsPage() {
  const signals = await getSignalsAll();
  return <SignalClient initialSignals={signals} />;
}
