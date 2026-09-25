import { useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import {
  Ledger,
  Tape,
  addLine,
  applyHint,
  confirmTape,
  listCategories,
  openTape,
  setReceiptDate,
  setReconciliation,
} from "./ledger";
import { clearTape } from "./pendingTape";
import { confirmRefusalText, saveFailedText } from "./refusalText";

type DraftLine = {
  name: string;
  sale: string;
  discount: string;
  surcharge: string;
  currency: string;
  category: string | null;
};

function emptyLine(): DraftLine {
  return {
    name: "",
    sale: "",
    discount: "",
    surcharge: "",
    currency: "BYN",
    category: null,
  };
}

function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

type Draft = {
  date: string;
  lines: DraftLine[];
  receiptTotal: string;
  receiptDiscount: string;
};

function projectTape(
  ledger: Ledger,
  date: string,
  lines: DraftLine[],
  receiptTotal: string,
  receiptDiscount: string,
  shot: string | null,
) {
  const withLines = lines.reduce(
    (tape, line) =>
      addLine(tape, {
        name: line.name,
        sale: parseAmount(line.sale),
        discount: parseAmount(line.discount) ?? 0,
        surcharge: parseAmount(line.surcharge) ?? 0,
        currency: line.currency.trim() === "" ? "BYN" : line.currency.trim(),
        category: line.category,
      }),
    setReceiptDate(openTape(), date.trim() === "" ? null : date.trim()),
  );
  return {
    ...applyHint(
      ledger,
      setReconciliation(withLines, {
        receiptTotal: parseAmount(receiptTotal),
        receiptDiscount: parseAmount(receiptDiscount),
      }),
    ),
    shot,
  };
}

function draftFromTape(tape: Tape): Draft {
  return {
    date: tape.date ?? "",
    lines: tape.lines.map((line) => ({
      name: line.name,
      sale: line.sale === null ? "" : String(line.sale),
      discount: line.discount === 0 ? "" : String(line.discount),
      surcharge: line.surcharge === 0 ? "" : String(line.surcharge),
      currency: line.currency,
      category: line.category,
    })),
    receiptTotal: tape.receiptTotal === null ? "" : String(tape.receiptTotal),
    receiptDiscount: tape.receiptDiscount === null ? "" : String(tape.receiptDiscount),
  };
}

const emptyDraft: Draft = {
  date: "",
  lines: [],
  receiptTotal: "",
  receiptDiscount: "",
};

function money(amount: number | null): string {
  return amount === null ? "нет" : amount.toFixed(2);
}

export function TapeScreen({
  ledger,
  initial = null,
  onLeave,
  onConfirmed,
  onDiscardShot,
}: {
  ledger: Ledger;
  initial?: Tape | null;
  onLeave: () => void;
  onConfirmed: (ledger: Ledger) => void | Promise<void>;
  onDiscardShot: (shot: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => (initial ? draftFromTape(initial) : emptyDraft));
  const [shot] = useState<string | null>(initial?.shot ?? null);
  const retainShot = useRef(false);
  const savingRef = useRef(false);
  const leaving = useRef(false);
  const shotRef = useRef(shot);
  const discardRef = useRef(onDiscardShot);
  shotRef.current = shot;
  discardRef.current = onDiscardShot;
  const navigation = useNavigation();
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function markSaving(next: boolean) {
    savingRef.current = next;
    setSaving(next);
  }

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (savingRef.current && !leaving.current) {
        event.preventDefault();
        return;
      }
      clearTape();
      const file = shotRef.current;
      if (!retainShot.current && file !== null) {
        discardRef.current(file);
      }
    });
  }, [navigation]);
  const tape = projectTape(
    ledger,
    draft.date,
    draft.lines,
    draft.receiptTotal,
    draft.receiptDiscount,
    shot,
  );
  const categories = listCategories(ledger);
  const positionSum =
    tape.lines.reduce((sum, line) => sum + Math.round((line.amount ?? 0) * 100), 0) / 100;

  function changeDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setRefusal(null);
  }

  function edit(index: number, patch: Partial<DraftLine>) {
    changeDraft({
      lines: draft.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text variant="headlineSmall">Подтверждение</Text>
      <TextInput
        label="Дата чека"
        value={draft.date}
        onChangeText={(date) => changeDraft({ date })}
      />
      <TextInput
        label="Итог чека"
        value={draft.receiptTotal}
        onChangeText={(receiptTotal) => changeDraft({ receiptTotal })}
        keyboardType="decimal-pad"
      />
      <TextInput
        label="Скидка на чек"
        value={draft.receiptDiscount}
        onChangeText={(receiptDiscount) => changeDraft({ receiptDiscount })}
        keyboardType="decimal-pad"
      />
      <Text>
        Сумма позиций {positionSum.toFixed(2)}. Итог чека {money(tape.receiptTotal)}. Скидка на
        чек {money(tape.receiptDiscount)}. Скидка на чек в позиции не входит.
      </Text>
      {tape.lines.map((line, index) => (
        <View key={index} style={styles.line}>
          <TextInput
            label="Название"
            value={draft.lines[index].name}
            onChangeText={(name) => edit(index, { name })}
          />
          <TextInput
            label="Сумма продажи"
            value={draft.lines[index].sale}
            onChangeText={(sale) => edit(index, { sale })}
            keyboardType="decimal-pad"
          />
          <TextInput
            label="Скидка строки"
            value={draft.lines[index].discount}
            onChangeText={(discount) => edit(index, { discount })}
            keyboardType="decimal-pad"
          />
          <TextInput
            label="Надбавка строки"
            value={draft.lines[index].surcharge}
            onChangeText={(surcharge) => edit(index, { surcharge })}
            keyboardType="decimal-pad"
          />
          <TextInput
            label="Валюта"
            value={draft.lines[index].currency}
            onChangeText={(currency) => edit(index, { currency })}
          />
          <Text>Сумма позиции {line.amount === null ? "—" : line.amount.toFixed(2)}</Text>
          <View style={styles.categories}>
            {categories.map((category) => (
              <Button
                key={category}
                mode={line.category === category ? "contained" : "outlined"}
                onPress={() => edit(index, { category })}
              >
                {category}
              </Button>
            ))}
          </View>
        </View>
      ))}
      <Button
        mode="outlined"
        onPress={() => changeDraft({ lines: [...draft.lines, emptyLine()] })}
      >
        Добавить позицию
      </Button>
      {refusal ? <Text>{refusal}</Text> : null}
      <Button
        mode="contained"
        disabled={draft.lines.length === 0 || saving}
        onPress={() => {
          const result = confirmTape(ledger, tape);
          if ("refusal" in result) {
            setRefusal(confirmRefusalText[result.refusal]);
            return;
          }
          retainShot.current = result !== ledger;
          markSaving(true);
          void Promise.resolve(onConfirmed(result))
            .then(() => {
              leaving.current = true;
              onLeave();
            })
            .catch(() => {
              retainShot.current = false;
              markSaving(false);
              setRefusal(saveFailedText);
            });
        }}
      >
        Подтвердить
      </Button>
      <Button
        disabled={saving}
        onPress={onLeave}
      >
        К месяцу
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 12,
  },
  line: {
    gap: 8,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
