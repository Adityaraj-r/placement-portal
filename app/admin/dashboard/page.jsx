"use client"
import { getAllApplications } from "@/app/actions/applications.actions";
import { getAllOpportunities } from "@/app/actions/opportunities.actions";
import { getAllProfiles } from "@/app/actions/profile.actions";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState([
    { title: "Total Students", value: 0 },
    { title: "Total Opportunities", value: 0 },
    { title: "Applications Submitted", value: 0 },
    { title: "Students Placed", value: 0 },
  ]);
  useEffect(() => {
    async function getData() {
      const opp = ((await getAllOpportunities())?.data?.length)
      const stu = ((await getAllProfiles())?.data?.length)
      const app = ((await getAllApplications())?.data?.length)
      setStats([
        { title: "Total Students", value: stu },
        { title: "Total Opportunities", value: opp },
        { title: "Applications Submitted", value: app },
        { title: "Students Placed", value: 0 },
      ])
      console.log(stats)
    }
    getData()
  }, [])

  return (
    <div className="w-full max-w-7xl space-y-8">
      <PageHeader title="Dashboard" description="Overview of students, opportunities, and applications." />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card
            key={i}
            className="border-border bg-card transition-shadow hover:shadow-md"
          >
            <CardContent className="px-6 py-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.title}
              </p>
              <p className="text-3xl font-semibold tracking-tight text-primary">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
