import { router } from "expo-router";
import { useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Text } from "react-native-paper";
import { placeShot, type Ledger } from "./ledger";
import { holdTape } from "./pendingTape";
import { recognizeShot } from "./recognizeShot";
import { shotRefusalText } from "./refusalText";
import { discardShot, keepShot } from "./shotFile";

export function CameraScreen({ ledger }: { ledger: Ledger }) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (Platform.OS === "web") {
    return (
      <View style={styles.screen}>
        <Text>Снимите чек на телефоне</Text>
        <Button onPress={() => router.back()}>К месяцу</Button>
      </View>
    );
  }

  if (permission === null) {
    return (
      <View style={styles.screen}>
        <Text>Открываем камеру</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <Text>Камера нужна, чтобы снять чек.</Text>
        <Button mode="contained" onPress={() => void requestPermission()}>
          Разрешить камеру
        </Button>
        <Button onPress={() => router.back()}>К месяцу</Button>
      </View>
    );
  }

  async function shoot() {
    if (camera.current === null || busy) {
      return;
    }
    setBusy(true);
    setMessage(null);
    let stored: string | null = null;
    try {
      const photo = await camera.current.takePictureAsync({ skipProcessing: true });
      if (photo?.uri === undefined) {
        setMessage("Не удалось снять кадр");
        return;
      }
      try {
        stored = keepShot(photo.uri);
      } catch {
        setMessage("Не удалось сохранить снимок");
        return;
      }
      const lines = await recognizeShot(stored);
      const placed = placeShot(ledger, lines, stored);
      if ("refusal" in placed) {
        discardShot(stored);
        setMessage(shotRefusalText[placed.refusal]);
        return;
      }
      if ("opened" in placed) {
        discardShot(stored);
        const index = ledger.receipts.indexOf(placed.opened);
        router.replace(index >= 0 ? `/receipt/${index}` : "/");
        return;
      }
      holdTape(placed);
      router.replace("/tape");
    } catch {
      if (stored !== null) {
        discardShot(stored);
      }
      setMessage("Не удалось прочитать кадр");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.camera}>
      <CameraView
        ref={camera}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setReady(true)}
      />
      <View style={styles.actions}>
        {message ? <Text>{message}</Text> : null}
        <Button mode="contained" disabled={!ready || busy} onPress={() => void shoot()}>
          {busy ? "Читаем чек" : "Снять"}
        </Button>
        <Button onPress={() => router.back()}>К месяцу</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 12,
  },
  camera: {
    flex: 1,
  },
  actions: {
    padding: 24,
    gap: 12,
  },
});
