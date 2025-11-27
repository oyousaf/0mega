import SignalClient from "@/components/signals/SignalClient";
import { getSignals } from "./actions/getSignals";
import DevSeedButton from "@/components/dev/DevSeedButton";

export default async function SignalsPage() {
  const signals = await getSignals();
  return <SignalClient initialSignals={signals} />;
  <DevSeedButton />
}
