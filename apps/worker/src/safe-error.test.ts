import { describe, expect, it } from "vitest";

import { getSafeWorkerErrorCode } from "./safe-error.js";
import { DeliveryRepositoryError } from "./supabase-repository.js";

describe("getSafeWorkerErrorCode", () => {
  it("preserves the fixed repository operation code", () => {
    expect(getSafeWorkerErrorCode(new DeliveryRepositoryError("claim"))).toBe(
      "delivery_repository_claim_failed",
    );
  });

  it("does not log an arbitrary error message that may contain a secret", () => {
    expect(
      getSafeWorkerErrorCode(
        new Error("request failed with secret phase-six-private-value"),
      ),
    ).toBe("unknown_worker_error");
  });
});
