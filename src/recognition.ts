export type FrameSource = {
  platform: "ios" | "android";
  supportedLanguages: readonly string[];
};

export type VisionOptions = {
  language: "ru-RU" | null;
  mode: "accurate";
};

export type FrameReaders = {
  vision: (file: string, options: VisionOptions) => readonly string[];
  tesseract: (file: string, models: readonly ["rus", "bel"]) => readonly string[];
};

export function readFrame(
  file: string,
  source: FrameSource,
  readers: FrameReaders,
): readonly string[] {
  if (source.platform === "android") {
    return readers.tesseract(file, ["rus", "bel"]);
  }
  const language = source.supportedLanguages.includes("ru-RU") ? "ru-RU" : null;
  return readers.vision(file, { language, mode: "accurate" });
}
