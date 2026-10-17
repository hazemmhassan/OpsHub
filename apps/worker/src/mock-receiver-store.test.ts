import { describe, expect, it } from "vitest";

import type { ApprovedRequestEvent } from "./delivery-event.js";
import {
  InMemoryApprovedRequestStore,
  mapApprovedRequestToRow,
} from "./mock-receiver-store.js";

const firstEvent = {
  event_id: "11111111-1111-4111-8111-111111111111",
  event_type: "request.approved" as const,
  event_version: 1 as const,
  occurred_at: "2026-12-18T10:00:00.000Z",
  request: {
    reference: "7K3M9Q2R8D",
    submitted_at: "2026-12-18T09:00:00.000Z",
    approved_at: "2026-12-18T10:00:00.000Z",
    submitted_locale: "en" as const,
    requester_type: "individual" as const,
    contact_name: "Synthetic Demo User",
    email: "demo@example.test",
    phone_e164: "+201000000000",
    country_code: "EG",
    preferred_contact_method: "email" as const,
    company_name: null,
    job_title: null,
    company_website: null,
    service_category: "consulting",
    request_title: "Synthetic service request",
    description: "Synthetic portfolio demonstration data only.",
    desired_start_date: null,
  },
} satisfies ApprovedRequestEvent;

describe("local mock receiver store", () => {
  it("maps the approved event to the exact flat destination row", () => {
    expect(mapApprovedRequestToRow(firstEvent)).toEqual({
      reference: "7K3M9Q2R8D",
      submitted_at: "2026-12-18T09:00:00.000Z",
      approved_at: "2026-12-18T10:00:00.000Z",
      submitted_locale: "en",
      requester_type: "individual",
      contact_name: "Synthetic Demo User",
      email: "demo@example.test",
      phone_e164: "+201000000000",
      country_code: "EG",
      preferred_contact_method: "email",
      company_name: null,
      job_title: null,
      company_website: null,
      service_category: "consulting",
      request_title: "Synthetic service request",
      description: "Synthetic portfolio demonstration data only.",
      desired_start_date: null,
    });
  });

  it("updates the same request reference instead of creating a duplicate row", () => {
    const store = new InMemoryApprovedRequestStore();
    const firstRow = mapApprovedRequestToRow(firstEvent);
    const updatedRow = {
      ...firstRow,
      request_title: "Updated synthetic title",
    };

    store.upsert(firstRow);
    store.upsert(updatedRow);

    expect(store.list()).toEqual([updatedRow]);
  });
});
