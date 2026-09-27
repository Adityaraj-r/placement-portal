"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabaseClient";
import { getProfileByUserId } from "@/app/actions/profile.actions";
import { getMyApplications } from "@/app/actions/applications.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Briefcase, Building2, Calendar, FileText } from "lucide-react";

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

  useEffect(() => {
    async function getData() {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      // NOTE: applications.student_id in this project refers to the student's profile id,
      // so we resolve user.id -> profile.id before calling getMyApplications.
      const profileRes = await getProfileByUserId(user.id);
      if (!profileRes.success || !profileRes.data?.id) {
        router.replace("/profile/edit");
        return;
      }

      const appsRes = await getMyApplications(profileRes.data.id);
      setApplications(appsRes?.data ?? []);
      setLoading(false);
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
    <div className="px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-sm text-muted-foreground">
            Track the status of applications you&apos;ve submitted.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border border-slate-200/80 bg-white rounded-xl">
            <CardContent className="px-6 py-5 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {applications.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/80 bg-white rounded-xl">
            <CardContent className="px-6 py-5 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Applied
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.applied ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/80 bg-white rounded-xl">
            <CardContent className="px-6 py-5 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Shortlisted
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.shortlisted ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : hasApps ? (
            <div className="grid grid-cols-1 gap-4">
              {applications.map((app) => {
                const opp = app.opportunities;
                return (
                  <Card
                    key={app.id}
                    className="border border-slate-200/80 bg-white hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden group"
                  >
                    <CardContent className="px-6 py-5">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Briefcase
                                size={18}
                                className="text-blue-600 shrink-0"
                              />
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {opp?.role || "Unknown Role"}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                              <Building2 size={14} />
                              <span>{opp?.company_name || "Unknown Company"}</span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              app.status === "shortlisted"
                                ? "default"
                                : app.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                            className="shrink-0"
                          >
                            {app.status || "applied"}
                          </Badge>
                        </div>

                        {/* Opportunity Details */}
                        {opp && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                            {opp.description && (
                              <div className="sm:col-span-2">
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Description
                                </Label>
                                <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">
                                  {opp.description}
                                </p>
                              </div>
                            )}

                            {opp.required_skills && (
                              <div>
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Required Skills
                                </Label>
                                <p className="text-sm text-gray-700 mt-1.5">
                                  {opp.required_skills}
                                </p>
                              </div>
                            )}

                            {opp.deadline && (
                              <div>
                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Deadline
                                </Label>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Calendar size={14} className="text-slate-400" />
                                  <p className="text-sm text-gray-700">
                                    {new Date(opp.deadline).toLocaleDateString(
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

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FileText size={12} />
                            <span>Applied on {formatDate(app.applied_at)}</span>
                          </div>
                          {opp?.status && (
                            <Badge variant="outline" className="text-xs">
                              {opp.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border border-slate-200/80 bg-white rounded-xl">
              <CardContent className="px-6 py-6">
                <p className="text-sm text-muted-foreground">
                  You haven’t applied to any opportunities yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

