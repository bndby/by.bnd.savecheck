import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { CalendarMonth, createLedger, openMonth } from "./ledger";

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

export function MonthScreen() {
  const current = today();
  const ledger = createLedger();
  const [month, setMonth] = useState(current);
  const opened = openMonth(ledger, current, month);
  const next = shiftMonth(month, 1);
  const canGoForward = !("refusal" in openMonth(ledger, current, next));

  if ("refusal" in opened) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <Text variant="headlineSmall">
        {monthNames[month.month - 1]} {month.year}
      </Text>
      <Text variant="titleLarge">Итог {opened.total}</Text>
      {opened.categories.map((line) => (
        <Text key={line.name}>
          {line.name} {line.amount}
        </Text>
      ))}
      <View style={styles.moves}>
        <Button onPress={() => setMonth(shiftMonth(month, -1))}>Прошлый месяц</Button>
        <Button disabled={!canGoForward} onPress={() => setMonth(next)}>
          Следующий месяц
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  moves: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
