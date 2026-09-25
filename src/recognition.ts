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

export type FramePlan =
  | { engine: "vision"; language: "ru-RU" | null; mode: "accurate" }
  | { engine: "tesseract"; models: readonly ["rus", "bel"] };

export function planFrame(source: FrameSource): FramePlan {
  if (source.platform === "android") {
    return { engine: "tesseract", models: ["rus", "bel"] };
  }
  const language = source.supportedLanguages.includes("ru-RU") ? "ru-RU" : null;
  return { engine: "vision", language, mode: "accurate" };
}

export function readFrame(
  file: string,
  source: FrameSource,
  readers: FrameReaders,
): readonly string[] {
  const plan = planFrame(source);
  if (plan.engine === "tesseract") {
    return readers.tesseract(file, plan.models);
  }
  return readers.vision(file, { language: plan.language, mode: plan.mode });
}
