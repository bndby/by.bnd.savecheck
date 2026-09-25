import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Text } from "react-native-paper";
import { Ledger } from "./ledger";
import { loadLedger, saveLedger } from "./ledgerStore";

type LedgerContextValue = {
  ledger: Ledger;
  replace: (next: Ledger) => Promise<void>;
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function useLedger(): LedgerContextValue {
  const value = useContext(LedgerContext);
  if (value === null) {
    throw new Error("Учёт ещё не открыт");
  }
  return value;
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    loadLedger()
      .then(setLedger)
      .catch(() => setProblem("Не удалось открыть учёт"));
  }, []);

  if (problem !== null) {
    return <Text style={{ padding: 24 }}>{problem}</Text>;
  }
  if (ledger === null) {
    return <Text style={{ padding: 24 }}>Открываем учёт</Text>;
  }

  return (
    <LedgerContext.Provider
      value={{
        ledger,
        replace: async (next) => {
          await saveLedger(next);
          setLedger(next);
        },
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}
