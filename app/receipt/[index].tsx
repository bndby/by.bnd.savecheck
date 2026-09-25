import { router, useLocalSearchParams } from "expo-router";
import { ReceiptScreen } from "../../src/ReceiptScreen";
import { useLedger } from "../../src/LedgerProvider";

export default function ReceiptRoute() {
  const { index } = useLocalSearchParams<{ index: string }>();
  const { ledger, replace } = useLedger();
  return (
    <ReceiptScreen
      ledger={ledger}
      receiptIndex={Number(index)}
      onChange={replace}
      onLeave={() => router.back()}
    />
  );
}
