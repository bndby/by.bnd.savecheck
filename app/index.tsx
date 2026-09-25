import { router } from "expo-router";
import { MonthScreen } from "../src/MonthScreen";
import { useLedger } from "../src/LedgerProvider";

export default function MonthRoute() {
  const { ledger } = useLedger();
  return (
    <MonthScreen
      ledger={ledger}
      onWrite={() => router.push("/tape")}
      onCategories={() => router.push("/categories")}
      onOpenReceipt={(index) => router.push(`/receipt/${index}`)}
    />
  );
}
