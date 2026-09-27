import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Building2, Phone } from "lucide-react";

export default function ProfileCard({ profile }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="h-fit bg-white shadow-md border border-slate-200/80 rounded-xl overflow-hidden">
      <CardContent className="p-6 space-y-5">
        {/* Avatar & Name */}
        <div className="text-center space-y-3">
          <Avatar className="w-24 h-24 mx-auto border-2 border-blue-100">
            <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
              {getInitials(profile?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {profile?.name || "No Name"}
            </h2>
            {profile?.branch && (
              <p className="text-sm text-slate-500 mt-1">{profile.branch}</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          {profile?.college && (
            <div className="flex items-start gap-2.5 text-sm">
              <Building2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                  College
                </p>
                <p className="text-gray-900">{profile.college}</p>
              </div>
            </div>
          )}

          {profile?.degree && (
            <div className="text-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                Degree
              </p>
              <p className="text-gray-900">{profile.degree}</p>
            </div>
          )}

          {profile?.graduation_year && (
            <div className="text-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                Graduation year
              </p>
              <p className="text-gray-900">{profile.graduation_year}</p>
            </div>
          )}

          {(profile?.cgpa != null || profile?.backlogs != null) && (
            <div className="text-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                Academic record
              </p>
              <p className="text-gray-900">
                {profile?.cgpa != null ? `CGPA ${profile.cgpa}` : ""}
                {profile?.cgpa != null && profile?.backlogs != null ? " · " : ""}
                {profile?.backlogs != null ? `Backlogs ${profile.backlogs}` : ""}
              </p>
            </div>
          )}

          {profile?.email && (
            <div className="flex items-start gap-2.5 text-sm">
              <Mail size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                  Email
                </p>
                <p className="text-gray-900 break-all">{profile.email}</p>
              </div>
            </div>
          )}
          {profile?.phone && (
            <div className="flex items-start gap-2.5 text-sm">
              <Phone size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                  Phone
                </p>
                <p className="text-gray-900 break-all">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Edit Button */}
        <Button
          asChild
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium mt-4"
        >
          <Link href="/profile/edit">Edit Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
