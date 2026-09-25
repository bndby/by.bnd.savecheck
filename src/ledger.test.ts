import {
  addLine,
  confirmTape,
  createLedger,
  editLine,
  listCategories,
  listSpends,
  openMonth,
  openTape,
  setReceiptDate,
  setReconciliation,
} from "./ledger";

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

test("пустая лента принимает вписанные строки, и каждая правится отдельно", () => {
  const tape = editLine(
    addLine(addLine(openTape(), { name: "Молоко", sale: 3.2 }), {
      name: "Хлеб",
      sale: 2.1,
    }),
    0,
    { name: "Кефир" },
  );

  expect(tape.lines.map((line) => ({ name: line.name, sale: line.sale }))).toEqual([
    { name: "Кефир", sale: 3.2 },
    { name: "Хлеб", sale: 2.1 },
  ]);
});

test("сумма позиции равна сумме продажи минус скидка строки плюс надбавка", () => {
  const tape = addLine(openTape(), {
    name: "Молоко",
    sale: 3.2,
    discount: 0.2,
    surcharge: 0.1,
  });

  expect(tape.lines[0].amount).toBe(3.1);
});

test("нулевую сумму можно подтвердить", () => {
  const result = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Пакет",
      sale: 0.4,
      discount: 0.4,
      category: "дом",
    }),
  );

  if ("refusal" in result) {
    throw new Error(result.refusal);
  }

  expect(listSpends(result)).toEqual([
    { name: "Пакет", amount: 0, category: "дом", date: "2026-09-02" },
  ]);
  expect(openMonth(result, september, september)).toEqual({ total: 0, categories: [] });
});

test("отрицательную сумму подтвердить нельзя", () => {
  const ledger = createLedger();
  const result = confirmTape(
    ledger,
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 1,
      discount: 1.5,
      category: "продукты",
    }),
  );

  expect(result).toEqual({ refusal: "negative-amount" });
  expect(listSpends(ledger)).toEqual([]);
});

test("позицию не в BYN подтвердить нельзя", () => {
  const result = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Coffee",
      sale: 2,
      currency: "USD",
      category: "кафе",
    }),
  );

  expect(result).toEqual({ refusal: "not-byn" });
});

test("итог чека и скидка на чек видны как сверка и не входят в позиции", () => {
  const tape = setReconciliation(
    addLine(addLine(openTape(), { name: "Молоко", sale: 3, category: "продукты" }), {
      name: "Хлеб",
      sale: 2,
      category: "продукты",
    }),
    { receiptTotal: 4, receiptDiscount: 1 },
  );

  expect({
    receiptTotal: tape.receiptTotal,
    receiptDiscount: tape.receiptDiscount,
    amounts: tape.lines.map((line) => line.amount),
  }).toEqual({
    receiptTotal: 4,
    receiptDiscount: 1,
    amounts: [3, 2],
  });
});

test("расхождение с итогом не закрывает подтверждение", () => {
  const result = confirmTape(
    createLedger(),
    setReconciliation(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 5,
        category: "продукты",
      }),
      { receiptTotal: 4, receiptDiscount: 1 },
    ),
  );

  if ("refusal" in result) {
    throw new Error(result.refusal);
  }

  expect(listSpends(result)).toEqual([
    { name: "Молоко", amount: 5, category: "продукты", date: "2026-09-02" },
  ]);
  expect(openMonth(result, september, september)).toEqual({
    total: 5,
    categories: [{ name: "продукты", amount: 5 }],
  });
});

test("без названия подтвердить нельзя", () => {
  const result = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "  ",
      sale: 1,
      category: "продукты",
    }),
  );

  expect(result).toEqual({ refusal: "missing-name" });
});

test("без суммы продажи подтвердить нельзя", () => {
  const result = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      category: "продукты",
    }),
  );

  expect(result).toEqual({ refusal: "missing-sale" });
});

test("без даты чека подтвердить нельзя", () => {
  const result = confirmTape(
    createLedger(),
    addLine(openTape(), { name: "Молоко", sale: 1, category: "продукты" }),
  );

  expect(result).toEqual({ refusal: "missing-date" });
});

test("без категории подтвердить нельзя", () => {
  const result = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), { name: "Молоко", sale: 1 }),
  );

  expect(result).toEqual({ refusal: "missing-category" });
});

test("одно подтверждение делает все позиции тратами месяца даты чека", () => {
  const result = confirmTape(
    createLedger(),
    addLine(
      addLine(setReceiptDate(openTape(), "2026-08-15"), {
        name: "Молоко",
        sale: 3,
        category: "продукты",
      }),
      { name: "Бинт", sale: 2, category: "аптека" },
    ),
  );

  if ("refusal" in result) {
    throw new Error(result.refusal);
  }

  expect(openMonth(result, september, { year: 2026, month: 8 })).toEqual({
    total: 5,
    categories: [
      { name: "продукты", amount: 3 },
      { name: "аптека", amount: 2 },
    ],
  });
  expect(openMonth(result, september, september)).toEqual({ total: 0, categories: [] });
});

test("неподтверждённая лента не попадает в месяц", () => {
  const ledger = createLedger();
  addLine(setReceiptDate(openTape(), "2026-09-02"), {
    name: "Молоко",
    sale: 3,
    category: "продукты",
  });

  expect(openMonth(ledger, september, september)).toEqual({ total: 0, categories: [] });
});
