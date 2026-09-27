"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getAllProfiles } from "@/app/actions/profile.actions";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    async function getData() {
      try {
        const temp = await getAllProfiles();
        setStudents(temp.data ?? []);
      } catch (error) {
        console.log(error);
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
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-muted-foreground text-base">
          Browse all registered student profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => {
          const skills = getSkillsArray(student?.skills);
          return (
            <Card
              key={student?.id}
              className="border border-slate-200/80 bg-white hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden group"
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
                      <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {student?.name || "Unknown"}
                      </h3>
                      {student?.email && (
                        <p className="text-xs text-slate-500 truncate">
                          {student.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    {student?.college && (
                      <div>
                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          College
                        </Label>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {student.college}
                        </p>
                      </div>
                    )}

                    {student?.branch && (
                      <div>
                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Branch
                        </Label>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {student.branch}
                        </p>
                      </div>
                    )}

                    {skills.length > 0 && (
                      <div>
                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">
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
      </div>
    </div>
  );
}
