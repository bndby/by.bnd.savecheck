import { Platform } from "react-native";
import Recognition from "../modules/receipt-recognition/src";
import { FrameSource, planFrame } from "./recognition";

export async function recognizeShot(file: string): Promise<readonly string[]> {
  const source: FrameSource =
    Platform.OS === "android"
      ? { platform: "android", supportedLanguages: [] }
      : { platform: "ios", supportedLanguages: Recognition.supportedVisionLanguages() };
  const plan = planFrame(source);
  if (plan.engine === "tesseract") {
    return Recognition.readTesseract(file);
  }
  return Recognition.readVision(file, plan.language);
}
