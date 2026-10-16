type StaffRole = "admin" | "approver";

type ActiveMembership = {
  org_id: string;
  role: string;
  organizations: { name: string } | { name: string }[] | null;
};

export type StaffAccess =
  | { status: "signed-out" }
  | { status: "access-denied" }
  | {
      status: "authorized";
      userId: string;
      organizationId: string;
      organizationName: string;
      role: StaffRole;
    };

function getOrganizationName(
  organization: ActiveMembership["organizations"],
): string | null {
  if (Array.isArray(organization)) {
    return organization[0]?.name ?? null;
  }

  return organization?.name ?? null;
}

export function decideStaffAccess(
  userId: string | null,
  memberships: ActiveMembership[],
): StaffAccess {
  if (!userId) {
    return { status: "signed-out" };
  }

  const membership = memberships[0];
  const organizationName = membership
    ? getOrganizationName(membership.organizations)
    : null;

  if (
    !membership ||
    !organizationName ||
    (membership.role !== "admin" && membership.role !== "approver")
  ) {
    return { status: "access-denied" };
  }

  return {
    status: "authorized",
    userId,
    organizationId: membership.org_id,
    organizationName,
    role: membership.role,
  };
}
