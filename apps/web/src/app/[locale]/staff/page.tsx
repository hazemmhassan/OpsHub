import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import { StaffLoading } from "@/components/staff-loading";
import {
  StaffRequests,
  type StaffRequestSummary,
} from "@/components/staff-requests";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";

type StaffPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
};
type RequestRow = {
  id: string;
  reference: string;
  status: string;
  submitted_at: string;
  request_submission_snapshots:
    | { request_title: string; contact_name: string; submitted_locale: string }
    | {
        request_title: string;
        contact_name: string;
        submitted_locale: string;
      }[];
};

export default function StaffPage(props: StaffPageProps) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <StaffPageContent {...props} />
    </Suspense>
  );
}

async function StaffPageContent({ params, searchParams }: StaffPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect(`/${locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${locale}/staff/access-denied`);

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const staff = await getTranslations("StaffHome");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, reference, status, submitted_at, request_submission_snapshots!inner(request_title, contact_name, submitted_locale)",
    )
    .order("submitted_at", { ascending: false });
  if (error) throw new Error("Unable to load requests.");

  const query = await searchParams;
  const q = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const allowedStatuses = new Set([
    "submitted",
    "under_review",
    "approved",
    "rejected",
  ]);
  const status =
    query.status && allowedStatuses.has(query.status) ? query.status : "";
  const requests = ((data ?? []) as unknown as RequestRow[])
    .map((row): StaffRequestSummary => {
      const snapshot = Array.isArray(row.request_submission_snapshots)
        ? row.request_submission_snapshots[0]
        : row.request_submission_snapshots;
      return {
        id: row.id,
        reference: row.reference,
        status: row.status,
        submittedAt: row.submitted_at,
        title: snapshot?.request_title ?? row.reference,
        contactName: snapshot?.contact_name ?? "",
        submittedLocale: snapshot?.submitted_locale ?? "en",
      };
    })
    .filter((request) => {
      const haystack =
        `${request.reference} ${request.title} ${request.contactName}`.toLocaleLowerCase(
          locale,
        );
      return (
        (!status || request.status === status) && (!q || haystack.includes(q))
      );
    });

  return (
    <div className="page-shell staff-shell">
      <SiteHeader
        area="staff"
        locale={locale}
        labels={{
          brand: common("brand"),
          home: common("home"),
          teamWorkspace: common("teamWorkspace"),
          languages: { ar: common("arabic"), en: common("english") },
        }}
      />
      <StaffRequests
        filters={{ q: query.q ?? "", status }}
        locale={locale}
        organizationName={access.organizationName}
        requests={requests}
        roleLabel={staff(`roles.${access.role}`)}
        signOutAction={signOut.bind(null, locale)}
      />
    </div>
  );
}
