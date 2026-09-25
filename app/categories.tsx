import { router } from "expo-router";
import { CategoryScreen } from "../src/CategoryScreen";
import { useLedger } from "../src/LedgerProvider";

export default function CategoriesRoute() {
  const { ledger, replace } = useLedger();
  return (
    <CategoryScreen ledger={ledger} onChange={replace} onLeave={() => router.back()} />
  );
}
