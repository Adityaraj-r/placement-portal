"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StudentProfileCard() {
  const profile = {
    name: "John Doe",
    email: "john@gmail.com",
    college: "IIT Dhanbad",
    branch: "Computer Science",
    about:
      "Full-stack developer passionate about scalable systems, AI, and competitive programming.",
    skills: ["React", "Next.js", "Node.js", "Python", "PostgreSQL"],
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-blue-800/40 rounded-2xl shadow-2xl p-8 max-w-4xl space-y-8">

      {/* HEADER */}
      <div className="flex items-center gap-6">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=john"
          className="w-28 h-28 rounded-full border-4 border-blue-600 shadow-lg"
        />

        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <p className="text-blue-400">{profile.college} • {profile.branch}</p>
          <p className="text-sm text-gray-400">{profile.email}</p>
        </div>
      </div>

      {/* PROFILE COMPLETION BAR */}
      <div>
        <p className="text-sm text-blue-300 mb-1">Profile Completion</p>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full w-[70%]"></div>
        </div>
        <p className="text-xs text-gray-400 mt-1">70% Complete</p>
      </div>

      {/* ABOUT */}
      <div>
        <h2 className="text-lg font-semibold text-blue-400 mb-2">About</h2>
        <p className="text-gray-300">{profile.about}</p>
      </div>

      {/* SKILLS */}
      <div>
        <h2 className="text-lg font-semibold text-blue-400 mb-2">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <Badge key={skill} className="bg-blue-600/20 border border-blue-500">
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4">
        <Button className="bg-green-600 hover:bg-green-700 px-6">
          Download Resume
        </Button>

        <Button className="bg-blue-600 hover:bg-blue-700 px-6">
          Edit Profile
        </Button>
      </div>

    </div>
  );
}
