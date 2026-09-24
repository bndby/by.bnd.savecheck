export type CalendarMonth = {
  year: number;
  month: number;
};

export type MonthCategoryLine = {
  name: string;
  amount: number;
};

export type OpenedMonth = {
  total: number;
  categories: MonthCategoryLine[];
};

export type MonthRefusal = {
  refusal: "future-month";
};

export const starterCategories = [
  "продукты",
  "аптека",
  "транспорт",
  "кафе",
  "дом",
  "прочее",
] as const;

export type Ledger = {
  categories: readonly string[];
};

export function createLedger(): Ledger {
  return { categories: starterCategories };
}

export function listCategories(ledger: Ledger): readonly string[] {
  return ledger.categories;
}

function monthIndex(month: CalendarMonth): number {
  return month.year * 12 + month.month;
}

export function openMonth(
  _ledger: Ledger,
  today: CalendarMonth,
  month: CalendarMonth,
): OpenedMonth | MonthRefusal {
  if (monthIndex(month) > monthIndex(today)) {
    return { refusal: "future-month" };
  }
  return { total: 0, categories: [] };
}
