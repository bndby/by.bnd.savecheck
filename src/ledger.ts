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

export type Spend = {
  name: string;
  amount: number;
  category: string;
  date: string;
};

export type Ledger = {
  categories: readonly string[];
  spends: readonly Spend[];
};

export function createLedger(): Ledger {
  return { categories: starterCategories, spends: [] };
}

export function listCategories(ledger: Ledger): readonly string[] {
  return ledger.categories;
}

export type LineInput = {
  name?: string;
  sale?: number | null;
  discount?: number;
  surcharge?: number;
  currency?: string;
  category?: string | null;
};

export type TapeLine = {
  name: string;
  sale: number | null;
  discount: number;
  surcharge: number;
  currency: string;
  category: string | null;
  amount: number | null;
};

export type Tape = {
  date: string | null;
  lines: TapeLine[];
  receiptTotal: number | null;
  receiptDiscount: number | null;
};

export function openTape(): Tape {
  return { date: null, lines: [], receiptTotal: null, receiptDiscount: null };
}

function hintKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function applyHint(ledger: Ledger, tape: Tape): Tape {
  return {
    ...tape,
    lines: tape.lines.map((line) => {
      if (line.category !== null) {
        return line;
      }
      const key = hintKey(line.name);
      const match = [...ledger.spends].reverse().find((spend) => hintKey(spend.name) === key);
      return { ...line, category: match?.category ?? "прочее" };
    }),
  };
}

function toLine(input: LineInput, previous?: TapeLine): TapeLine {
  const sale = input.sale !== undefined ? input.sale : (previous?.sale ?? null);
  const discount = input.discount ?? previous?.discount ?? 0;
  const surcharge = input.surcharge ?? previous?.surcharge ?? 0;
  return {
    name: input.name ?? previous?.name ?? "",
    sale,
    discount,
    surcharge,
    currency: input.currency ?? previous?.currency ?? "BYN",
    category: input.category !== undefined ? input.category : (previous?.category ?? null),
    amount:
      sale === null ? null : (cents(sale) - cents(discount) + cents(surcharge)) / 100,
  };
}

function cents(amount: number): number {
  return Math.round(amount * 100);
}

export function addLine(tape: Tape, input: LineInput): Tape {
  return { ...tape, lines: [...tape.lines, toLine(input)] };
}

export function editLine(tape: Tape, index: number, input: LineInput): Tape {
  return {
    ...tape,
    lines: tape.lines.map((line, lineIndex) =>
      lineIndex === index ? toLine(input, line) : line,
    ),
  };
}

export function setReceiptDate(tape: Tape, date: string | null): Tape {
  return { ...tape, date };
}

export function setReconciliation(
  tape: Tape,
  reconciliation: { receiptTotal: number | null; receiptDiscount: number | null },
): Tape {
  return {
    ...tape,
    receiptTotal: reconciliation.receiptTotal,
    receiptDiscount: reconciliation.receiptDiscount,
  };
}

export function listSpends(ledger: Ledger): readonly Spend[] {
  return ledger.spends;
}

export type ConfirmRefusal = {
  refusal:
    | "missing-date"
    | "missing-name"
    | "missing-sale"
    | "negative-amount"
    | "not-byn"
    | "missing-category";
};

export function confirmTape(ledger: Ledger, tape: Tape): Ledger | ConfirmRefusal {
  if (tape.date === null || tape.date.trim() === "") {
    return { refusal: "missing-date" };
  }
  if (tape.lines.some((line) => line.name.trim() === "")) {
    return { refusal: "missing-name" };
  }
  if (tape.lines.some((line) => line.sale === null)) {
    return { refusal: "missing-sale" };
  }
  if (tape.lines.some((line) => line.amount !== null && line.amount < 0)) {
    return { refusal: "negative-amount" };
  }
  if (tape.lines.some((line) => line.currency !== "BYN")) {
    return { refusal: "not-byn" };
  }
  if (tape.lines.some((line) => !knownCategory(ledger, line.category))) {
    return { refusal: "missing-category" };
  }
  const date = tape.date;
  return {
    ...ledger,
    spends: [
      ...ledger.spends,
      ...tape.lines.map((line) => ({
        name: line.name,
        amount: line.amount ?? 0,
        category: line.category ?? "",
        date,
      })),
    ],
  };
}

function knownCategory(ledger: Ledger, category: string | null): category is string {
  return category !== null && ledger.categories.includes(category);
}

function monthIndex(month: CalendarMonth): number {
  return month.year * 12 + month.month;
}

function sameMonth(date: string, month: CalendarMonth): boolean {
  const [year, monthNumber] = date.split("-");
  return Number(year) === month.year && Number(monthNumber) === month.month;
}

export function openMonth(
  ledger: Ledger,
  today: CalendarMonth,
  month: CalendarMonth,
): OpenedMonth | MonthRefusal {
  if (monthIndex(month) > monthIndex(today)) {
    return { refusal: "future-month" };
  }
  const spends = ledger.spends.filter((spend) => sameMonth(spend.date, month));
  const categories = ledger.categories
    .map((name) => ({
      name,
      amount:
        spends
          .filter((spend) => spend.category === name)
          .reduce((sum, spend) => sum + cents(spend.amount), 0) / 100,
    }))
    .filter((line) => line.amount !== 0);
  return {
    total: spends.reduce((sum, spend) => sum + cents(spend.amount), 0) / 100,
    categories,
  };
}
