import { CameraScreen } from "../src/CameraScreen";
import { useLedger } from "../src/LedgerProvider";

export default function CameraRoute() {
  const { ledger } = useLedger();
  return <CameraScreen ledger={ledger} />;
}
