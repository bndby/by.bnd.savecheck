import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import {
  Ledger,
  correctLine,
  correctReceiptDate,
  listCategories,
  removeLine,
  removeReceipt,
} from "./ledger";
import { confirmRefusalText, saveFailedText } from "./refusalText";

function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function ReceiptScreen({
  ledger,
  receiptIndex,
  onChange,
  onLeave,
}: {
  ledger: Ledger;
  receiptIndex: number;
  onChange: (ledger: Ledger) => Promise<void>;
  onLeave: () => void;
}) {
  const receipt = ledger.receipts[receiptIndex];
  const [date, setDate] = useState(receipt?.date ?? "");
  const [names, setNames] = useState<Record<number, string>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const categories = listCategories(ledger);

  useEffect(() => {
    setDate(receipt?.date ?? "");
    setNames({});
    setAmounts({});
  }, [receipt]);

  if (receipt === undefined || !Number.isInteger(receiptIndex)) {
    return (
      <View style={styles.screen}>
        <Text>Чека нет</Text>
        <Button onPress={onLeave}>К месяцу</Button>
      </View>
    );
  }

  async function change(next: Ledger, leave: boolean) {
    setSaving(true);
    try {
      await onChange(next);
      setMessage(null);
      if (leave) {
        onLeave();
      }
    } catch {
      setMessage(saveFailedText);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text variant="headlineSmall">Чек</Text>
      <TextInput label="Дата чека" value={date} onChangeText={setDate} />
      <Button
        mode="outlined"
        disabled={saving}
        onPress={() => {
          const result = correctReceiptDate(ledger, receiptIndex, date.trim());
          if ("refusal" in result) {
            setMessage(confirmRefusalText[result.refusal]);
            return;
          }
          void change(result, false);
        }}
      >
        Сохранить дату
      </Button>
      {receipt.lines.map((line, index) => (
        <View key={index} style={styles.line}>
          <TextInput
            label="Название"
            value={names[index] ?? line.name}
            onChangeText={(name) => setNames((current) => ({ ...current, [index]: name }))}
          />
          <TextInput
            label="Сумма"
            value={amounts[index] ?? line.amount.toFixed(2)}
            onChangeText={(amount) => setAmounts((current) => ({ ...current, [index]: amount }))}
            keyboardType="decimal-pad"
          />
          <Text>Категория {line.category}</Text>
          <View style={styles.categories}>
            {categories.map((category) => (
              <Button
                key={category}
                mode={line.category === category ? "contained" : "outlined"}
                disabled={saving}
                onPress={() => {
                  const result = correctLine(ledger, receiptIndex, index, { category });
                  if ("refusal" in result) {
                    setMessage(confirmRefusalText[result.refusal]);
                    return;
                  }
                  void change(result, false);
                }}
              >
                {category}
              </Button>
            ))}
          </View>
          <Button
            mode="outlined"
            disabled={saving}
            onPress={() => {
              const amount = parseAmount(amounts[index] ?? line.amount.toFixed(2));
              if (amount === null) {
                setMessage(confirmRefusalText["missing-sale"]);
                return;
              }
              const result = correctLine(ledger, receiptIndex, index, {
                name: names[index] ?? line.name,
                amount,
              });
              if ("refusal" in result) {
                setMessage(confirmRefusalText[result.refusal]);
                return;
              }
              void change(result, false);
            }}
          >
            Сохранить строку
          </Button>
          <Button
            disabled={saving}
            onPress={() => {
              const next = removeLine(ledger, receiptIndex, index);
              void change(next, next.receipts.length < ledger.receipts.length);
            }}
          >
            Удалить позицию
          </Button>
        </View>
      ))}
      {message ? <Text>{message}</Text> : null}
      <Button
        mode="contained"
        disabled={saving}
        onPress={() => {
          void change(removeReceipt(ledger, receiptIndex), true);
        }}
      >
        Удалить чек
      </Button>
      <Button onPress={onLeave}>К месяцу</Button>
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
