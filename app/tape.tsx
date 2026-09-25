import { router } from "expo-router";
import { useState } from "react";
import { clearTape, peekTape } from "../src/pendingTape";
import { discardShot } from "../src/shotFile";
import { TapeScreen } from "../src/TapeScreen";
import { useLedger } from "../src/LedgerProvider";

export default function TapeRoute() {
  const { ledger, replace } = useLedger();
  const [initial] = useState(() => peekTape());
  return (
    <TapeScreen
      ledger={ledger}
      initial={initial}
      onDiscardShot={discardShot}
      onLeave={() => {
        clearTape();
        router.back();
      }}
      onConfirmed={async (next) => {
        await replace(next);
        clearTape();
        router.back();
      }}
    />
  );
}
