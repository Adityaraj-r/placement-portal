"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getAllProfiles } from "@/app/actions/profile.actions";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function getData() {
      try {
        const temp = await getAllProfiles();
        if (temp?.success === false) setLoadFailed(true);
        setStudents(temp.data ?? []);
      } catch (error) {
        console.log(error);
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSkillsArray = (skills) => {
    if (!skills) return [];
    if (typeof skills === "string") {
      return skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return Array.isArray(skills) ? skills : [];
  };

  return (
    <div className="w-full max-w-7xl space-y-8">
      <PageHeader title="Students" description="Browse student profiles and academic information." />

      {loading ? <LoadingState label="Loading students">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <Card key={item}><CardContent className="space-y-5 px-6 py-5"><div className="h-14 w-14 animate-pulse rounded-full bg-muted" /><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>)}</div>
      </LoadingState> : loadFailed ? <ErrorState title="Unable to load students" description="Something went wrong while retrieving student profiles." /> : students.length === 0 ? <EmptyState title="No students found" description="There are currently no student profiles to display." /> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => {
          const skills = getSkillsArray(student?.skills);
          return (
            <Card
              key={student?.id}
              className="border-border bg-card transition-shadow hover:shadow-md"
            >
              <CardContent className="px-6 py-5">
                <div className="space-y-4">
                  {/* Header with Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-blue-100">
                      <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                        {getInitials(student?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="truncate text-base font-semibold text-foreground">
                        {student?.name || "Unknown"}
                      </h2>
                      {student?.email && (
                        <p className="text-xs text-slate-500 truncate">
                          {student.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 border-t border-border pt-3">
                    {student?.college && (
                      <div>
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          College
                        </Label>
                        <p className="mt-0.5 text-sm text-foreground">
                          {student.college}
                        </p>
                      </div>
                    )}

                    {student?.branch && (
                      <div>
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Branch
                        </Label>
                        <p className="mt-0.5 text-sm text-foreground">
                          {student.branch}
                        </p>
                      </div>
                    )}

                    {skills.length > 0 && (
                      <div>
                        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Skills
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.slice(0, 3).map((skill, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {skills.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-slate-50 text-slate-600"
                            >
                              +{skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>}
    </div>
  );
}
