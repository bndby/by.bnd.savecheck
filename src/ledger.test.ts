import {
  addCategory,
  addLine,
  applyHint,
  confirmTape,
  correctLine,
  correctReceiptDate,
  createLedger,
  editLine,
  listCategories,
  listReceipts,
  listSpends,
  openMonth,
  openTape,
  removeCategory,
  removeLine,
  removeReceipt,
  renameCategory,
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

test("подсказка берёт категорию последней траты с тем же названием", () => {
  const earlier = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-01"), {
      name: "Молоко",
      sale: 2,
      category: "продукты",
    }),
  );
  if ("refusal" in earlier) {
    throw new Error(earlier.refusal);
  }

  const ledger = confirmTape(
    earlier,
    addLine(setReceiptDate(openTape(), "2026-09-03"), {
      name: "Молоко",
      sale: 2.5,
      category: "дом",
    }),
  );
  if ("refusal" in ledger) {
    throw new Error(ledger.refusal);
  }

  const tape = applyHint(ledger, addLine(openTape(), { name: "Молоко", sale: 3 }));

  expect(tape.lines[0].category).toBe("дом");
});

test("краевые пробелы, повторные пробелы и регистр не меняют подсказку", () => {
  const ledger = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-01"), {
      name: "Молоко пастеризованное",
      sale: 2,
      category: "аптека",
    }),
  );
  if ("refusal" in ledger) {
    throw new Error(ledger.refusal);
  }

  const tape = applyHint(
    ledger,
    addLine(
      addLine(addLine(openTape(), { name: "  молоко пастеризованное", sale: 1 }), {
        name: "МОЛОКО   ПАСТЕРИЗОВАННОЕ  ",
        sale: 1,
      }),
      { name: "Молоко  пастеризованное", sale: 1 },
    ),
  );

  expect(tape.lines.map((line) => line.category)).toEqual(["аптека", "аптека", "аптека"]);
});

test("«е» и «ё», знаки и лишние слова оставляют название другим", () => {
  const ledger = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-01"), {
      name: "Молоко",
      sale: 2,
      category: "продукты",
    }),
  );
  if ("refusal" in ledger) {
    throw new Error(ledger.refusal);
  }

  const tape = applyHint(
    ledger,
    addLine(
      addLine(addLine(openTape(), { name: "Молёко", sale: 1 }), {
        name: "Молоко!",
        sale: 1,
      }),
      { name: "Молоко 1л", sale: 1 },
    ),
  );

  expect(tape.lines.map((line) => line.category)).toEqual(["прочее", "прочее", "прочее"]);
});

test("без прошлой траты подсказка — прочее", () => {
  const tape = applyHint(createLedger(), addLine(openTape(), { name: "Сыр", sale: 4 }));

  expect(tape.lines[0].category).toBe("прочее");
});

test("категорию можно сменить до подтверждения", () => {
  const ledger = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-01"), {
      name: "Молоко",
      sale: 2,
      category: "продукты",
    }),
  );
  if ("refusal" in ledger) {
    throw new Error(ledger.refusal);
  }

  const tape = applyHint(
    ledger,
    addLine(setReceiptDate(openTape(), "2026-09-04"), {
      name: "Молоко",
      sale: 3,
      category: "кафе",
    }),
  );

  const result = confirmTape(ledger, tape);
  if ("refusal" in result) {
    throw new Error(result.refusal);
  }

  expect(tape.lines[0].category).toBe("кафе");
  expect(listSpends(result)).toEqual([
    { name: "Молоко", amount: 2, category: "продукты", date: "2026-09-01" },
    { name: "Молоко", amount: 3, category: "кафе", date: "2026-09-04" },
  ]);
});

test("владелец добавляет категорию к стартовому набору", () => {
  const ledger = addCategory(createLedger(), "дача");

  expect(listCategories(ledger)).toEqual([
    "продукты",
    "аптека",
    "транспорт",
    "кафе",
    "дом",
    "прочее",
    "дача",
  ]);
});

test("переименование оставляет ту же метку: прошлые траты показывают новое имя", () => {
  const confirmed = confirmTape(
    addCategory(createLedger(), "дача"),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Саженец",
      sale: 12,
      category: "дача",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const renamed = renameCategory(confirmed, "дача", "участок");
  if ("refusal" in renamed) {
    throw new Error(renamed.refusal);
  }

  expect(listCategories(renamed)).toEqual([
    "продукты",
    "аптека",
    "транспорт",
    "кафе",
    "дом",
    "прочее",
    "участок",
  ]);
  expect(listSpends(renamed)).toEqual([
    { name: "Саженец", amount: 12, category: "участок", date: "2026-09-02" },
  ]);
  expect(openMonth(renamed, september, september)).toEqual({
    total: 12,
    categories: [{ name: "участок", amount: 12 }],
  });
});

test("пустую категорию можно удалить", () => {
  const ledger = removeCategory(addCategory(createLedger(), "дача"), "дача");
  if ("refusal" in ledger) {
    throw new Error(ledger.refusal);
  }

  expect(listCategories(ledger)).toEqual([
    "продукты",
    "аптека",
    "транспорт",
    "кафе",
    "дом",
    "прочее",
  ]);
});

test("после переноса трат категорию можно удалить", () => {
  const confirmed = confirmTape(
    addCategory(createLedger(), "дача"),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Саженец",
      sale: 12,
      category: "дача",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const moved = correctLine(confirmed, 0, 0, { category: "дом" });
  if ("refusal" in moved) {
    throw new Error(moved.refusal);
  }
  const removed = removeCategory(moved, "дача");
  if ("refusal" in removed) {
    throw new Error(removed.refusal);
  }

  expect(listCategories(removed)).toEqual([
    "продукты",
    "аптека",
    "транспорт",
    "кафе",
    "дом",
    "прочее",
  ]);
  expect(listSpends(removed)).toEqual([
    { name: "Саженец", amount: 12, category: "дом", date: "2026-09-02" },
  ]);
});

test("категорию с тратами удалить нельзя, пока траты не перенесены", () => {
  const confirmed = confirmTape(
    addCategory(createLedger(), "дача"),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Саженец",
      sale: 12,
      category: "дача",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const result = removeCategory(confirmed, "дача");

  expect(result).toEqual({ refusal: "category-has-spends" });
  expect(listCategories(confirmed)).toContain("дача");
  expect(listSpends(confirmed)).toEqual([
    { name: "Саженец", amount: 12, category: "дача", date: "2026-09-02" },
  ]);
});

test("продукты, аптека, транспорт, кафе и дом подчиняются тем же правилам", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 3,
        category: "продукты",
      }),
      { name: "Бинт", sale: 2, category: "аптека" },
    ),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const renamed = renameCategory(confirmed, "аптека", "лекарства");
  if ("refusal" in renamed) {
    throw new Error(renamed.refusal);
  }

  const withoutTransport = removeCategory(renamed, "транспорт");
  if ("refusal" in withoutTransport) {
    throw new Error(withoutTransport.refusal);
  }
  const withoutCafe = removeCategory(withoutTransport, "кафе");
  if ("refusal" in withoutCafe) {
    throw new Error(withoutCafe.refusal);
  }
  const withoutHome = removeCategory(withoutCafe, "дом");
  if ("refusal" in withoutHome) {
    throw new Error(withoutHome.refusal);
  }

  expect(removeCategory(withoutHome, "продукты")).toEqual({ refusal: "category-has-spends" });
  expect(listCategories(withoutHome)).toEqual(["продукты", "лекарства", "прочее"]);
  expect(listSpends(withoutHome)).toEqual([
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
    { name: "Бинт", amount: 2, category: "лекарства", date: "2026-09-02" },
  ]);
});

test("прочее нельзя переименовать или удалить", () => {
  const ledger = createLedger();

  expect(renameCategory(ledger, "прочее", "разное")).toEqual({ refusal: "protected-category" });
  expect(removeCategory(ledger, "прочее")).toEqual({ refusal: "protected-category" });
  expect(listCategories(ledger)).toEqual([
    "продукты",
    "аптека",
    "транспорт",
    "кафе",
    "дом",
    "прочее",
  ]);
});

test("та же дата и тот же набор позиций открывают уже подтверждённый чек", () => {
  const tape = addLine(
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
    { name: "Хлеб", sale: 2, category: "продукты" },
  );
  const first = confirmTape(createLedger(), tape);
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }

  const second = confirmTape(first, tape);
  if ("refusal" in second) {
    throw new Error(second.refusal);
  }

  expect(listReceipts(second)).toEqual([
    {
      date: "2026-09-02",
      lines: [
        { name: "Молоко", amount: 3, category: "продукты" },
        { name: "Хлеб", amount: 2, category: "продукты" },
      ],
    },
  ]);
  expect(listSpends(second)).toEqual(listSpends(first));
});

test("название сравнивается как у подсказки, сумма — сумма траты", () => {
  const first = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3.2,
      discount: 0.2,
      category: "продукты",
    }),
  );
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }

  const second = confirmTape(
    first,
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "  МОЛОКО ",
      sale: 4,
      discount: 1,
      category: "кафе",
    }),
  );
  if ("refusal" in second) {
    throw new Error(second.refusal);
  }

  expect(listReceipts(second)).toEqual(listReceipts(first));
  expect(listSpends(second)).toEqual([
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
  ]);
});

test("порядок строк не различает чеки", () => {
  const first = confirmTape(
    createLedger(),
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 3,
        category: "продукты",
      }),
      { name: "Хлеб", sale: 2, category: "продукты" },
    ),
  );
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }

  const second = confirmTape(
    first,
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Хлеб",
        sale: 2,
        category: "продукты",
      }),
      { name: "Молоко", sale: 3, category: "продукты" },
    ),
  );
  if ("refusal" in second) {
    throw new Error(second.refusal);
  }

  expect(listReceipts(second)).toEqual(listReceipts(first));
  expect(listSpends(second)).toEqual([
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
    { name: "Хлеб", amount: 2, category: "продукты", date: "2026-09-02" },
  ]);
});

test("другой набор позиций создаёт другой чек", () => {
  const first = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }

  const second = confirmTape(
    first,
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 3,
        category: "продукты",
      }),
      { name: "Хлеб", sale: 2, category: "продукты" },
    ),
  );
  if ("refusal" in second) {
    throw new Error(second.refusal);
  }

  expect(listReceipts(second)).toEqual([
    {
      date: "2026-09-02",
      lines: [{ name: "Молоко", amount: 3, category: "продукты" }],
    },
    {
      date: "2026-09-02",
      lines: [
        { name: "Молоко", amount: 3, category: "продукты" },
        { name: "Хлеб", amount: 2, category: "продукты" },
      ],
    },
  ]);
  expect(listSpends(second)).toEqual([
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
    { name: "Хлеб", amount: 2, category: "продукты", date: "2026-09-02" },
  ]);
});

test("другая дата создаёт другой чек", () => {
  const milk = (date: string) =>
    addLine(setReceiptDate(openTape(), date), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    });
  const first = confirmTape(createLedger(), milk("2026-09-02"));
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }

  const second = confirmTape(first, milk("2026-08-02"));
  if ("refusal" in second) {
    throw new Error(second.refusal);
  }

  expect(listReceipts(second).map((receipt) => receipt.date)).toEqual(["2026-09-02", "2026-08-02"]);
  expect(listSpends(second)).toEqual([
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-08-02" },
  ]);
});

test("«е» и «ё» оставляют чек другим", () => {
  const milk = (name: string) =>
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name,
      sale: 3,
      category: "продукты",
    });
  const first = confirmTape(createLedger(), milk("Молоко"));
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }

  const second = confirmTape(first, milk("Молёко"));
  if ("refusal" in second) {
    throw new Error(second.refusal);
  }

  expect(listReceipts(second).map((receipt) => receipt.lines[0].name)).toEqual(["Молоко", "Молёко"]);
  expect(listSpends(second)).toHaveLength(2);
});

test("две одинаковые позиции не совпадают с одной", () => {
  const one = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 2,
      category: "продукты",
    }),
  );
  if ("refusal" in one) {
    throw new Error(one.refusal);
  }

  const two = confirmTape(
    one,
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 2,
        category: "продукты",
      }),
      { name: "Молоко", sale: 2, category: "продукты" },
    ),
  );
  if ("refusal" in two) {
    throw new Error(two.refusal);
  }

  expect(listReceipts(two)).toHaveLength(2);
  expect(listSpends(two)).toHaveLength(3);
});

test("сумму, категорию и дату чека можно исправить, месяц пересчитывается", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 3,
        category: "продукты",
      }),
      { name: "Хлеб", sale: 2, category: "продукты" },
    ),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const withAmount = correctLine(confirmed, 0, 0, { amount: 4 });
  if ("refusal" in withAmount) {
    throw new Error(withAmount.refusal);
  }
  const withCategory = correctLine(withAmount, 0, 1, { category: "дом" });
  if ("refusal" in withCategory) {
    throw new Error(withCategory.refusal);
  }
  const withDate = correctReceiptDate(withCategory, 0, "2026-08-15");
  if ("refusal" in withDate) {
    throw new Error(withDate.refusal);
  }

  expect(listSpends(withDate)).toEqual([
    { name: "Молоко", amount: 4, category: "продукты", date: "2026-08-15" },
    { name: "Хлеб", amount: 2, category: "дом", date: "2026-08-15" },
  ]);
  expect(openMonth(withDate, september, september)).toEqual({ total: 0, categories: [] });
  expect(openMonth(withDate, september, { year: 2026, month: 8 })).toEqual({
    total: 6,
    categories: [
      { name: "продукты", amount: 4 },
      { name: "дом", amount: 2 },
    ],
  });
});

test("название можно исправить, пустым оно не становится", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const renamed = correctLine(confirmed, 0, 0, { name: "Кефир" });
  if ("refusal" in renamed) {
    throw new Error(renamed.refusal);
  }

  expect(listSpends(renamed)).toEqual([
    { name: "Кефир", amount: 3, category: "продукты", date: "2026-09-02" },
  ]);
  expect(correctLine(renamed, 0, 0, { name: "  " })).toEqual({ refusal: "missing-name" });
  expect(listSpends(renamed)).toEqual([
    { name: "Кефир", amount: 3, category: "продукты", date: "2026-09-02" },
  ]);
});

test("категория этой траты при смене названия не меняется", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const renamed = correctLine(confirmed, 0, 0, { name: "Кефир" });
  if ("refusal" in renamed) {
    throw new Error(renamed.refusal);
  }

  expect(listSpends(renamed)).toEqual([
    { name: "Кефир", amount: 3, category: "продукты", date: "2026-09-02" },
  ]);
});

test("новое название сразу участвует в подсказке", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const renamed = correctLine(confirmed, 0, 0, { name: "Кефир" });
  if ("refusal" in renamed) {
    throw new Error(renamed.refusal);
  }

  const tape = applyHint(renamed, addLine(openTape(), { name: "Кефир", sale: 4 }));

  expect(tape.lines[0].category).toBe("продукты");
});

test("одну позицию можно удалить, остальные траты чека остаются", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(
      addLine(setReceiptDate(openTape(), "2026-09-02"), {
        name: "Молоко",
        sale: 3,
        category: "продукты",
      }),
      { name: "Хлеб", sale: 2, category: "продукты" },
    ),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const remaining = removeLine(confirmed, 0, 0);

  expect(listReceipts(remaining)).toEqual([
    {
      date: "2026-09-02",
      lines: [{ name: "Хлеб", amount: 2, category: "продукты" }],
    },
  ]);
  expect(openMonth(remaining, september, september)).toEqual({
    total: 2,
    categories: [{ name: "продукты", amount: 2 }],
  });
});

test("удаление последней позиции удаляет чек", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  const remaining = removeLine(confirmed, 0, 0);

  expect(listReceipts(remaining)).toEqual([]);
  expect(openMonth(remaining, september, september)).toEqual({ total: 0, categories: [] });
});

test("удаление чека убирает все его траты из месяца", () => {
  const first = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in first) {
    throw new Error(first.refusal);
  }
  const both = confirmTape(
    first,
    addLine(setReceiptDate(openTape(), "2026-09-04"), {
      name: "Бинт",
      sale: 2,
      category: "аптека",
    }),
  );
  if ("refusal" in both) {
    throw new Error(both.refusal);
  }

  const remaining = removeReceipt(both, 0);

  expect(listSpends(remaining)).toEqual([
    { name: "Бинт", amount: 2, category: "аптека", date: "2026-09-04" },
  ]);
  expect(openMonth(remaining, september, september)).toEqual({
    total: 2,
    categories: [{ name: "аптека", amount: 2 }],
  });
});

test("после подтверждения отрицательную сумму и чужую категорию поставить нельзя", () => {
  const confirmed = confirmTape(
    createLedger(),
    addLine(setReceiptDate(openTape(), "2026-09-02"), {
      name: "Молоко",
      sale: 3,
      category: "продукты",
    }),
  );
  if ("refusal" in confirmed) {
    throw new Error(confirmed.refusal);
  }

  expect(correctLine(confirmed, 0, 0, { amount: -1 })).toEqual({ refusal: "negative-amount" });
  expect(correctLine(confirmed, 0, 0, { category: "нет такой" })).toEqual({
    refusal: "missing-category",
  });
  expect(correctReceiptDate(confirmed, 0, "  ")).toEqual({ refusal: "missing-date" });
  expect(listSpends(confirmed)).toEqual([
    { name: "Молоко", amount: 3, category: "продукты", date: "2026-09-02" },
  ]);
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
