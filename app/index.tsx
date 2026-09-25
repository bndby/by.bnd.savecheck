import { router } from "expo-router";
import { MonthScreen } from "../src/MonthScreen";
import { clearTape, peekTape } from "../src/pendingTape";
import { discardShot } from "../src/shotFile";
import { useLedger } from "../src/LedgerProvider";

export default function MonthRoute() {
  const { ledger } = useLedger();
  return (
    <MonthScreen
      ledger={ledger}
      onWrite={() => {
        const pending = peekTape();
        if (pending?.shot !== null && pending?.shot !== undefined) {
          discardShot(pending.shot);
        }
        clearTape();
        router.push("/tape");
      }}
      onShoot={() => router.push("/camera")}
      onCategories={() => router.push("/categories")}
      onOpenReceipt={(index) => router.push(`/receipt/${index}`)}
    />
  );
}
