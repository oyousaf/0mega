import SignalClient from "@/components/signals/SignalClient";
import { getSignals } from "./actions/getSignals";

export default async function SignalsPage() {
  const signals = await getSignals();
  return <SignalClient initialSignals={signals} />;
}
