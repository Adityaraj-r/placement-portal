"use client"
import { getAllApplications } from "@/app/actions/applications.actions";
import { getAllOpportunities } from "@/app/actions/opportunities.actions";
import { getAllProfiles } from "@/app/actions/profile.actions";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState([
    { title: "Total Students", value: 0 },
    { title: "Total Opportunities", value: 0 },
    { title: "Applications Submitted", value: 0 },
    { title: "Students Placed", value: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    async function getData() {
      try {
        const opportunities = await getAllOpportunities();
        const profiles = await getAllProfiles();
        const applications = await getAllApplications();
        const opp = opportunities?.data?.length;
        const stu = profiles?.data?.length;
        const app = applications?.data?.length;
        setLoadFailed([opportunities, profiles, applications].some((result) => result?.success === false));
        setStats([
          { title: "Total Students", value: stu },
          { title: "Total Opportunities", value: opp },
          { title: "Applications Submitted", value: app },
          { title: "Students Placed", value: 0 },
        ]);
      } catch {
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }
    getData()
  }, [])

  return (
    <div className="w-full max-w-7xl space-y-8">
      <PageHeader title="Dashboard" description="Overview of students, opportunities, and applications." />

      {/* Stats Grid */}
      {loadFailed ? <ErrorState title="Unable to load dashboard data" description="Something went wrong while retrieving one or more dashboard totals." /> : null}
      {loading ? <LoadingState label="Loading dashboard totals">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => <Card key={stat.title}><CardContent className="space-y-3 px-6 py-6"><div className="h-3 w-2/3 animate-pulse rounded bg-muted" /><div className="h-8 w-1/3 animate-pulse rounded bg-muted" /></CardContent></Card>)}
        </div>
      </LoadingState> : !loadFailed ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card
            key={i}
            className="border-border border-t-2 border-t-primary/50 bg-card transition-shadow hover:shadow-md"
          >
            <CardContent className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div> : null}
    </div>
  );
}
