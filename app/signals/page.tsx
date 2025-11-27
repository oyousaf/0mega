import SignalClient from "@/components/signals/SignalClient";
import { getSignalsAll } from "./actions/getSignals";

export default async function SignalsPage() {
  const signals = await getSignalsAll();
  return <SignalClient initialSignals={signals} />;
}
