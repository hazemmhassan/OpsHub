import { describe, expect, it } from "vitest";

import { decideStaffAccess } from "./staff-access";

describe("decideStaffAccess", () => {
  it("requires a verified identity", () => {
    expect(decideStaffAccess(null, [])).toEqual({ status: "signed-out" });
  });

  it("denies an authenticated user without an active membership", () => {
    expect(decideStaffAccess("user-1", [])).toEqual({
      status: "access-denied",
    });
  });

  it("returns the active organization and effective role", () => {
    expect(
      decideStaffAccess("user-1", [
        {
          org_id: "org-1",
          role: "admin",
          organizations: { name: "OpsHub Demo" },
        },
      ]),
    ).toEqual({
      status: "authorized",
      userId: "user-1",
      organizationId: "org-1",
      organizationName: "OpsHub Demo",
      role: "admin",
    });
  });
});
