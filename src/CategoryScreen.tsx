import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { Ledger, addCategory, listCategories, removeCategory, renameCategory } from "./ledger";
import { categoryRefusalText, saveFailedText } from "./refusalText";

export function CategoryScreen({
  ledger,
  onChange,
  onLeave,
}: {
  ledger: Ledger;
  onChange: (ledger: Ledger) => Promise<void>;
  onLeave: () => void;
}) {
  const [added, setAdded] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const categories = listCategories(ledger);

  async function change(next: Ledger): Promise<boolean> {
    setSaving(true);
    try {
      await onChange(next);
      setMessage(null);
      return true;
    } catch {
      setMessage(saveFailedText);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text variant="headlineSmall">Категории</Text>
      {categories.map((category) => (
        <View key={category} style={styles.row}>
          <TextInput
            label="Название"
            value={names[category] ?? category}
            onChangeText={(name) => setNames((current) => ({ ...current, [category]: name }))}
          />
          <Button
            mode="outlined"
            disabled={saving}
            onPress={() => {
              const nextName = (names[category] ?? category).trim();
              if (nextName === "" || nextName === category) {
                return;
              }
              const result = renameCategory(ledger, category, nextName);
              if ("refusal" in result) {
                setMessage(categoryRefusalText[result.refusal]);
                return;
              }
              void change(result);
            }}
          >
            Переименовать
          </Button>
          <Button
            mode="outlined"
            disabled={saving}
            onPress={() => {
              const result = removeCategory(ledger, category);
              if ("refusal" in result) {
                setMessage(categoryRefusalText[result.refusal]);
                return;
              }
              void change(result);
            }}
          >
            Удалить
          </Button>
        </View>
      ))}
      <TextInput label="Новая категория" value={added} onChangeText={setAdded} />
      <Button
        mode="contained"
        disabled={saving}
        onPress={() => {
          const name = added.trim();
          if (name === "") {
            return;
          }
          void change(addCategory(ledger, name)).then((saved) => {
            if (saved) {
              setAdded("");
            }
          });
        }}
      >
        Добавить
      </Button>
      {message ? <Text>{message}</Text> : null}
      <Button onPress={onLeave}>К месяцу</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 12,
  },
  row: {
    gap: 8,
  },
});
