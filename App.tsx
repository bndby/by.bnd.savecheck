import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { MonthScreen } from "./src/MonthScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <MonthScreen />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
