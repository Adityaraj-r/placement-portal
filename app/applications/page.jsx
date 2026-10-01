"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabaseClient";
import { getMyApplications } from "@/app/actions/applications.actions";
import { respondToPlacementOffer } from "@/app/actions/lifecycle.actions";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Briefcase, Building2, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "-";
  }
}

export default function MyApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [respondingOfferId, setRespondingOfferId] = useState(null);

  async function handleOfferResponse(offerId, accept) {
    setRespondingOfferId(offerId);
    try {
      const result = await respondToPlacementOffer(offerId, accept);
      if (!result?.success) {
        toast.error(result?.error || "Could not respond to offer");
        return;
      }
      toast.success(accept ? "Offer accepted." : "Offer declined.");
      const refreshed = await getMyApplications();
      if (refreshed?.success) setApplications(refreshed.data || []);
    } catch {
      toast.error("Could not respond to offer");
    } finally {
      setRespondingOfferId(null);
    }
  }

  useEffect(() => {
    async function getData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        const appsRes = await getMyApplications();
        if (appsRes?.success === false) setLoadFailed(true);
        setApplications(appsRes?.data ?? []);
      } catch {
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, [router]);

  const hasApps = applications.length > 0;

  const stats = useMemo(() => {
    const counts = applications.reduce(
      (acc, app) => {
        const key = (app?.status || "unknown").toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );
    return counts;
  }, [applications]);

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <PageHeader title="My Applications" description="Track the status of applications you’ve submitted." />

        {loading ? <LoadingState label="Loading your applications">
          <div className="space-y-6"><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <Card key={item}><CardContent className="space-y-3 px-6 py-5"><div className="h-3 w-1/3 animate-pulse rounded bg-muted" /><div className="h-7 w-1/4 animate-pulse rounded bg-muted" /></CardContent></Card>)}</div><div className="space-y-4">{[0, 1].map((item) => <Card key={item}><CardContent className="space-y-3 p-5"><div className="h-5 w-1/2 animate-pulse rounded bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded bg-muted" /><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>)}</div></div>
        </LoadingState> : loadFailed ? <ErrorState title="Unable to load your applications" description="Something went wrong while retrieving your application records. Please try again later." /> : <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="px-6 py-5 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-semibold tracking-tight text-primary">
                {applications.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="px-6 py-5 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Applied
              </p>
              <p className="text-2xl font-semibold tracking-tight text-primary">
                {stats.applied ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="px-6 py-5 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Shortlisted
              </p>
              <p className="text-2xl font-semibold tracking-tight text-primary">
                {stats.shortlisted ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {hasApps ? (
            <div className="grid grid-cols-1 gap-4">
              {applications.map((app) => {
                const drive = app.placement_drives;
                const company = drive?.companies;
                return (
                  <Card
                    key={app.id}
                    className="border-border bg-card transition-shadow hover:shadow-md"
                  >
                    <CardContent className="px-6 py-5">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex min-w-0 flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Briefcase
                                size={18}
                                className="shrink-0 text-primary"
                              />
                              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                {drive?.title || "Unknown Role"}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Building2 size={14} />
                              <span>{company?.name || "Unknown Company"}</span>
                            </div>
                          </div>
                          <StatusBadge status={app.status || "applied"} className="self-start sm:shrink-0" />
                        </div>

                        {/* Opportunity Details */}
                        {drive && (
                          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                            {drive.job_description && (
                              <div className="sm:col-span-2">
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Description
                                </Label>
                                <p className="mt-1.5 line-clamp-2 text-sm text-foreground/85">
                                  {drive.job_description}
                                </p>
                              </div>
                            )}

                            {drive.job_location && (
                              <div>
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Location
                                </Label>
                                <p className="mt-1.5 text-sm text-foreground/85">
                                  {drive.job_location}
                                </p>
                              </div>
                            )}

                            {drive.package_lpa != null && (
                              <div>
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Package
                                </Label>
                                <p className="mt-1.5 text-sm text-foreground/85">
                                  {drive.package_lpa} LPA
                                </p>
                              </div>
                            )}

                            {drive.registration_deadline && (
                              <div>
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Deadline
                                </Label>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Calendar size={14} className="text-slate-400" />
                                  <p className="text-sm text-foreground/85">
                                    {new Date(drive.registration_deadline).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {app.interview && (
                          <section className="space-y-2 border-t border-border pt-4 text-sm">
                            <h4 className="font-semibold">Interview</h4>
                            <p className="flex flex-wrap items-center gap-2"><span>Status:</span><StatusBadge status={app.interview.status} /></p>
                            <p>When: {new Date(app.interview.scheduled_at).toLocaleString()}</p>
                            <p>Mode: {app.interview.mode}</p>
                            {app.interview.location && <p>Location / link: {app.interview.location}</p>}
                            {app.interview.details && <p>Details: {app.interview.details}</p>}
                          </section>
                        )}

                        {app.offer && (
                          <section className="space-y-2 border-t border-border pt-4 text-sm">
                            <h4 className="font-semibold">Offer</h4>
                            <p>Package: {app.offer.offered_ctc} LPA</p>
                            <p className="flex flex-wrap items-center gap-2"><span>Status:</span><StatusBadge status={app.offer.is_accepted === null ? "offered" : app.offer.is_accepted ? "accepted" : "rejected"} /></p>
                            {app.offer.is_accepted === null && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Button size="sm" className="min-w-28" disabled={respondingOfferId === app.offer.id} onClick={() => handleOfferResponse(app.offer.id, true)}>
                                  {respondingOfferId === app.offer.id ? "Saving…" : "Accept offer"}
                                </Button>
                                <Button size="sm" variant="destructive" className="min-w-28" disabled={respondingOfferId === app.offer.id} onClick={() => handleOfferResponse(app.offer.id, false)}>
                                  Reject offer
                                </Button>
                              </div>
                            )}
                          </section>
                        )}

                        {app.placement && (
                          <section className="space-y-2 border-t border-border pt-4 text-sm">
                            <h4 className="font-semibold">Placement</h4>
                            <p className="flex flex-wrap items-center gap-2"><span>{app.placement.job_title}</span><StatusBadge status={app.placement.offer_status} /></p>
                            {app.placement.placement_date && <p>Placement date: {app.placement.placement_date}</p>}
                            {app.placement.joining_date && <p>Joining date: {app.placement.joining_date}</p>}
                          </section>
                        )}

                        {/* Footer */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FileText size={12} />
                            <span>Applied on {formatDate(app.applied_at)}</span>
                          </div>
                          {drive?.status && <StatusBadge status={drive.status} className="text-xs" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No applications yet" description="Applications will appear here after you apply to a placement opportunity." />
          )}
        </div>
        </>}
      </div>
    </div>
  );
}

