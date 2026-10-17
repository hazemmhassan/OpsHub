import type { ApprovedRequestEvent } from "./delivery-event.js";

export type ApprovedRequestRow = ApprovedRequestEvent["request"];

export function mapApprovedRequestToRow(
  event: ApprovedRequestEvent,
): ApprovedRequestRow {
  return { ...event.request };
}

export class InMemoryApprovedRequestStore {
  readonly #rows = new Map<string, ApprovedRequestRow>();

  upsert(row: ApprovedRequestRow): void {
    this.#rows.set(row.reference, { ...row });
  }

  list(): ApprovedRequestRow[] {
    return [...this.#rows.values()].map((row) => ({ ...row }));
  }
}
