import { Tape } from "./ledger";

let pending: Tape | null = null;

export function holdTape(tape: Tape): void {
  pending = tape;
}

export function peekTape(): Tape | null {
  return pending;
}

export function clearTape(): void {
  pending = null;
}
