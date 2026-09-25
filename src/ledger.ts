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

export type ReceiptLine = {
  name: string;
  amount: number;
  category: string;
};

export type Receipt = {
  date: string;
  lines: readonly ReceiptLine[];
};

export type Ledger = {
  categories: readonly string[];
  receipts: readonly Receipt[];
};

export function createLedger(): Ledger {
  return { categories: starterCategories, receipts: [] };
}

export function listCategories(ledger: Ledger): readonly string[] {
  return ledger.categories;
}

export function addCategory(ledger: Ledger, name: string): Ledger {
  return { ...ledger, categories: [...ledger.categories, name] };
}

export type CategoryRefusal = {
  refusal: "protected-category" | "category-has-spends";
};

function isProtectedCategory(name: string): boolean {
  return name === "прочее";
}

export function removeCategory(ledger: Ledger, name: string): Ledger | CategoryRefusal {
  if (isProtectedCategory(name)) {
    return { refusal: "protected-category" };
  }
  if (ledger.receipts.some((receipt) => receipt.lines.some((line) => line.category === name))) {
    return { refusal: "category-has-spends" };
  }
  return { ...ledger, categories: ledger.categories.filter((category) => category !== name) };
}

export function renameCategory(
  ledger: Ledger,
  name: string,
  nextName: string,
): Ledger | CategoryRefusal {
  if (isProtectedCategory(name)) {
    return { refusal: "protected-category" };
  }
  return {
    ...ledger,
    categories: ledger.categories.map((category) => (category === name ? nextName : category)),
    receipts: ledger.receipts.map((receipt) => ({
      ...receipt,
      lines: receipt.lines.map((line) =>
        line.category === name ? { ...line, category: nextName } : line,
      ),
    })),
  };
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

export type ShotRefusal = {
  refusal: "several-receipts";
};

export type OpenedShot = {
  opened: Receipt;
};

export function placeShot(
  ledger: Ledger,
  lines: readonly string[],
): Tape | ShotRefusal | OpenedShot {
  const receiptsInFrame = lines.filter((line) => hintKey(line) === "платежный документ").length;
  if (receiptsInFrame > 1) {
    return { refusal: "several-receipts" };
  }
  let date: string | null = null;
  let receiptTotal: number | null = null;
  let receiptDiscount: number | null = null;
  let tape = openTape();
  for (const raw of lines) {
    const text = raw.trim();
    const dated = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(text);
    if (dated) {
      date = `${dated[3]}-${dated[2]}-${dated[1]}`;
      continue;
    }
    const position = /^(.*\S)\s+(\d+[.,]\d{2})$/.exec(text);
    if (!position) {
      continue;
    }
    const name = position[1];
    const sale = Number(position[2].replace(",", "."));
    const key = hintKey(name);
    if (key === "итого к оплате" || key === "итого") {
      if (key === "итого к оплате" || receiptTotal === null) {
        receiptTotal = sale;
      }
      continue;
    }
    if (key === "скидка на итог") {
      receiptDiscount = sale;
      continue;
    }
    if (key === "скидка" && tape.lines.length > 0) {
      tape = editLine(tape, tape.lines.length - 1, { discount: sale });
      continue;
    }
    if (key === "надбавка" && tape.lines.length > 0) {
      tape = editLine(tape, tape.lines.length - 1, { surcharge: sale });
      continue;
    }
    tape = addLine(tape, { name, sale });
  }
  const hinted = applyHint(
    ledger,
    setReconciliation(setReceiptDate(tape, date), { receiptTotal, receiptDiscount }),
  );
  const shotDate = hinted.date;
  if (shotDate !== null) {
    const candidate = hinted.lines.map((line) => ({
      name: line.name,
      amount: line.amount ?? 0,
      category: line.category ?? "",
    }));
    const existing = ledger.receipts.find((receipt) => sameReceipt(receipt, shotDate, candidate));
    if (existing) {
      return { opened: existing };
    }
  }
  return hinted;
}

export function applyHint(ledger: Ledger, tape: Tape): Tape {
  return {
    ...tape,
    lines: tape.lines.map((line) => {
      if (line.category !== null) {
        return line;
      }
      const key = hintKey(line.name);
      const match = [...listSpends(ledger)].reverse().find((spend) => hintKey(spend.name) === key);
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

export function listReceipts(ledger: Ledger): readonly Receipt[] {
  return ledger.receipts;
}

export function listSpends(ledger: Ledger): readonly Spend[] {
  return ledger.receipts.flatMap((receipt) =>
    receipt.lines.map((line) => ({
      name: line.name,
      amount: line.amount,
      category: line.category,
      date: receipt.date,
    })),
  );
}

function positionKey(name: string, amount: number): string {
  return `${hintKey(name)}\u0000${cents(amount)}`;
}

function sameReceipt(receipt: Receipt, date: string, lines: readonly ReceiptLine[]): boolean {
  if (receipt.date !== date) {
    return false;
  }
  const known = receipt.lines.map((line) => positionKey(line.name, line.amount)).sort();
  const incoming = lines.map((line) => positionKey(line.name, line.amount)).sort();
  if (known.length !== incoming.length) {
    return false;
  }
  return known.every((key, index) => key === incoming[index]);
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
  const lines = tape.lines.map((line) => ({
    name: line.name,
    amount: line.amount ?? 0,
    category: line.category ?? "",
  }));
  const existing = ledger.receipts.find((receipt) => sameReceipt(receipt, date, lines));
  if (existing) {
    return ledger;
  }
  return { ...ledger, receipts: [...ledger.receipts, { date, lines }] };
}

export type LineCorrection = {
  name?: string;
  amount?: number;
  category?: string;
};

export function correctLine(
  ledger: Ledger,
  receiptIndex: number,
  lineIndex: number,
  correction: LineCorrection,
): Ledger | ConfirmRefusal {
  if (correction.name !== undefined && correction.name.trim() === "") {
    return { refusal: "missing-name" };
  }
  if (correction.amount !== undefined && correction.amount < 0) {
    return { refusal: "negative-amount" };
  }
  if (correction.category !== undefined && !knownCategory(ledger, correction.category)) {
    return { refusal: "missing-category" };
  }
  return {
    ...ledger,
    receipts: ledger.receipts.map((receipt, index) => {
      if (index !== receiptIndex) {
        return receipt;
      }
      return {
        ...receipt,
        lines: receipt.lines.map((line, indexInReceipt) => {
          if (indexInReceipt !== lineIndex) {
            return line;
          }
          return {
            name: correction.name ?? line.name,
            amount: correction.amount ?? line.amount,
            category: correction.category ?? line.category,
          };
        }),
      };
    }),
  };
}

export function removeLine(ledger: Ledger, receiptIndex: number, lineIndex: number): Ledger {
  return {
    ...ledger,
    receipts: ledger.receipts.flatMap((receipt, index) => {
      if (index !== receiptIndex) {
        return [receipt];
      }
      const lines = receipt.lines.filter((_, indexInReceipt) => indexInReceipt !== lineIndex);
      return lines.length === 0 ? [] : [{ ...receipt, lines }];
    }),
  };
}

export function removeReceipt(ledger: Ledger, receiptIndex: number): Ledger {
  return {
    ...ledger,
    receipts: ledger.receipts.filter((_, index) => index !== receiptIndex),
  };
}

export function correctReceiptDate(
  ledger: Ledger,
  receiptIndex: number,
  date: string,
): Ledger | ConfirmRefusal {
  if (date.trim() === "") {
    return { refusal: "missing-date" };
  }
  return {
    ...ledger,
    receipts: ledger.receipts.map((receipt, index) =>
      index === receiptIndex ? { ...receipt, date } : receipt,
    ),
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
  const spends = listSpends(ledger).filter((spend) => sameMonth(spend.date, month));
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
