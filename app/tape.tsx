import { router } from "expo-router";
import { TapeScreen } from "../src/TapeScreen";
import { useLedger } from "../src/LedgerProvider";

export default function TapeRoute() {
  const { ledger, replace } = useLedger();
  return (
    <TapeScreen
      ledger={ledger}
      onLeave={() => router.back()}
      onConfirmed={async (next) => {
        await replace(next);
        router.back();
      }}
    />
  );
}
