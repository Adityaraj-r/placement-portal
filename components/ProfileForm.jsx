"use client";

import { createProfile, getProfileById } from "@/app/actions/profile.actions";
import { useEffect, useState } from "react";

export default function ProfileForm() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    college: "",
    branch: "",
    skills: "",
  });
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };
  // for testing
  async function handleSubmit(params) {
    // await createProfile(profile);
  }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {[
        { label: "Name", name: "name", placeholder: "Eg: John Doe" },
        { label: "Email", name: "email", placeholder: "Eg: johndoe@gmail.com" },
        { label: "College", name: "college", placeholder: "Eg: IIT Dhanbad" },
        { label: "Branch", name: "branch", placeholder: "Eg: Computer Science" },
        { label: "Skills", name: "skills", placeholder: "Eg: React, Node, Python" },
      ].map((field) => (
        <div key={field.name} className="space-y-1">
          <label className="text-sm font-semibold text-blue-200">
            {field.label}
          </label>
          <input
            type="text"
            name={field.name}
            placeholder={field.placeholder}
            value={profile[field.name]}
            onChange={handleChange}
            className="w-full bg-[#243552] border border-blue-300/30 rounded-lg px-4 py-2 text-white placeholder:text-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-lg py-2 font-semibold"
      >
        SAVE PROFILE
      </button>
    </form>
  );
}
