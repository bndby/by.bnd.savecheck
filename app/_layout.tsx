import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LedgerProvider } from "../src/LedgerProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <LedgerProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
          </SafeAreaView>
        </LedgerProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
