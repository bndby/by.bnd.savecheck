import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { MonthScreen } from "./src/MonthScreen";
import { TapeScreen } from "./src/TapeScreen";
import { Ledger, createLedger } from "./src/ledger";

export default function App() {
  const [ledger, setLedger] = useState<Ledger>(createLedger);
  const [showingTape, setShowingTape] = useState(false);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        {showingTape ? (
          <TapeScreen
            ledger={ledger}
            onLeave={() => setShowingTape(false)}
            onConfirmed={(next) => {
              setLedger(next);
              setShowingTape(false);
            }}
          />
        ) : (
          <MonthScreen ledger={ledger} onWrite={() => setShowingTape(true)} />
        )}
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
