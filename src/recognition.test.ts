import { createLedger, placeShot } from "./ledger";
import { readFrame } from "./recognition";

test("на iOS строки читает Apple Vision с языком ru-RU, если система его отдаёт", () => {
  let seen: { file: string; language: string | null; mode: string } | null = null;

  const lines = readFrame(
    "file:///shot.jpg",
    { platform: "ios", supportedLanguages: ["en-US", "ru-RU"] },
    {
      vision: (file, options) => {
        seen = { file, language: options.language, mode: options.mode };
        return ["Молоко 3,20"];
      },
      tesseract: () => {
        throw new Error("tesseract");
      },
    },
  );

  expect(seen).toEqual({ file: "file:///shot.jpg", language: "ru-RU", mode: "accurate" });
  expect(lines).toEqual(["Молоко 3,20"]);
});

test("на iOS без ru-RU Vision читает кадр без этого языка", () => {
  let seen: { file: string; language: string | null; mode: string } | null = null;

  const lines = readFrame(
    "file:///shot.jpg",
    { platform: "ios", supportedLanguages: ["en-US"] },
    {
      vision: (file, options) => {
        seen = { file, language: options.language, mode: options.mode };
        return ["Хлеб 1,00"];
      },
      tesseract: () => {
        throw new Error("tesseract");
      },
    },
  );

  expect(seen).toEqual({ file: "file:///shot.jpg", language: null, mode: "accurate" });
  expect(lines).toEqual(["Хлеб 1,00"]);
});

test("на Android строки читает Tesseract с моделями rus и bel", () => {
  let seen: { file: string; models: readonly string[] } | null = null;

  const lines = readFrame(
    "file:///shot.jpg",
    { platform: "android", supportedLanguages: ["ru-RU"] },
    {
      vision: () => {
        throw new Error("vision");
      },
      tesseract: (file, models) => {
        seen = { file, models };
        return ["Сыр 4,00"];
      },
    },
  );

  expect(seen).toEqual({ file: "file:///shot.jpg", models: ["rus", "bel"] });
  expect(lines).toEqual(["Сыр 4,00"]);
});

test("файл кадра без обрезки кладёт строки на ленту", () => {
  const lines = readFrame(
    "file:///receipt.jpg",
    { platform: "ios", supportedLanguages: ["ru-RU"] },
    {
      vision: (file, options) => {
        expect(file).toBe("file:///receipt.jpg");
        expect(options).toEqual({ language: "ru-RU", mode: "accurate" });
        return ["Молоко 3,20", "25.09.2026"];
      },
      tesseract: () => {
        throw new Error("tesseract");
      },
    },
  );
  const shot = placeShot(createLedger(), lines, "file:///receipt.jpg");
  if ("refusal" in shot || "opened" in shot) {
    throw new Error("opened" in shot ? "opened" : shot.refusal);
  }

  expect(shot.date).toBe("2026-09-25");
  expect(shot.lines.map((line) => ({ name: line.name, sale: line.sale }))).toEqual([
    { name: "Молоко", sale: 3.2 },
  ]);
});
