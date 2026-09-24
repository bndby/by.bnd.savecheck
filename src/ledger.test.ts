import { createLedger, listCategories, openMonth } from "./ledger";

const september = { year: 2026, month: 9 };

test("текущий месяц открывается с итогом 0", () => {
  const opened = openMonth(createLedger(), september, september);
  expect(opened).toEqual({ total: 0, categories: [] });
});

test("будущий месяц не открывается", () => {
  const opened = openMonth(createLedger(), september, { year: 2026, month: 10 });
  expect(opened).toEqual({ refusal: "future-month" });
});

test("прошлый месяц открывается с итогом 0", () => {
  const opened = openMonth(createLedger(), september, { year: 2026, month: 8 });
  expect(opened).toEqual({ total: 0, categories: [] });
});

test("в учёте есть стартовые категории", () => {
  expect(listCategories(createLedger())).toEqual([
    "продукты",
    "аптека",
    "транспорт",
    "кафе",
    "дом",
    "прочее",
  ]);
});
