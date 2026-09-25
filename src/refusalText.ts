import { CategoryRefusal, ConfirmRefusal, ShotRefusal } from "./ledger";

export const confirmRefusalText: Record<ConfirmRefusal["refusal"], string> = {
  "missing-date": "Нет даты чека",
  "missing-name": "Нет названия",
  "missing-sale": "Нет суммы продажи",
  "negative-amount": "Сумма меньше нуля",
  "not-byn": "Не BYN",
  "missing-category": "Нет категории",
};

export const categoryRefusalText: Record<CategoryRefusal["refusal"], string> = {
  "protected-category": "«Прочее» остаётся в списке",
  "category-has-spends": "Сначала перенесите траты",
};

export const shotRefusalText: Record<ShotRefusal["refusal"], string> = {
  "several-receipts": "В кадре несколько чеков. Переснимите один.",
};

export const saveFailedText = "Не удалось сохранить учёт";
