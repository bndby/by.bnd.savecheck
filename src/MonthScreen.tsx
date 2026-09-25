import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { CalendarMonth, Ledger, listMonthReceipts, openMonth } from "./ledger";

const monthNames = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

function today(): CalendarMonth {
  const date = new Date();
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function shiftMonth(month: CalendarMonth, step: -1 | 1): CalendarMonth {
  const index = month.year * 12 + (month.month - 1) + step;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function byn(amount: number): string {
  return amount.toFixed(2);
}

export function MonthScreen({
  ledger,
  onWrite,
  onShoot,
  onCategories,
  onOpenReceipt,
}: {
  ledger: Ledger;
  onWrite: () => void;
  onShoot: () => void;
  onCategories: () => void;
  onOpenReceipt: (index: number) => void;
}) {
  const current = today();
  const [month, setMonth] = useState(current);
  const opened = openMonth(ledger, current, month);
  const next = shiftMonth(month, 1);
  const canGoForward = !("refusal" in openMonth(ledger, current, next));

  if ("refusal" in opened) {
    return null;
  }

  const receipts = listMonthReceipts(ledger, month);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text variant="headlineSmall">
        {monthNames[month.month - 1]} {month.year}
      </Text>
      <Text variant="titleLarge">Итог {byn(opened.total)}</Text>
      {opened.categories.map((line) => (
        <Text key={line.name}>
          {line.name} {byn(line.amount)}
        </Text>
      ))}
      {receipts.map((receipt) => (
        <Button key={receipt.index} onPress={() => onOpenReceipt(receipt.index)}>
          {receipt.date} {byn(receipt.total)}
        </Button>
      ))}
      <Button mode="contained" onPress={onShoot}>
        Снять чек
      </Button>
      <Button mode="outlined" onPress={onWrite}>
        Вписать чек
      </Button>
      <Button mode="outlined" onPress={onCategories}>
        Категории
      </Button>
      <View style={styles.moves}>
        <Button onPress={() => setMonth(shiftMonth(month, -1))}>Прошлый месяц</Button>
        <Button disabled={!canGoForward} onPress={() => setMonth(next)}>
          Следующий месяц
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 12,
  },
  moves: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
