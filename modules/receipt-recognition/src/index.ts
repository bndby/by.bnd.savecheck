import { requireNativeModule } from "expo-modules-core";

type ReceiptRecognitionModule = {
  supportedVisionLanguages(): string[];
  readVision(file: string, language: string | null): Promise<string[]>;
  readTesseract(file: string): Promise<string[]>;
};

export default requireNativeModule<ReceiptRecognitionModule>("ReceiptRecognition");
