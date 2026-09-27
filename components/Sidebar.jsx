"use client";

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#0f172a] border-r border-blue-800/40 p-6 space-y-6">
      <h1 className="text-xl font-bold text-blue-400">Coding Savvy</h1>

      <nav className="space-y-3 text-sm">
        <p className="text-blue-300">Dashboard</p>
        <p className="hover:text-blue-400 cursor-pointer">Profile</p>
        <p className="hover:text-blue-400 cursor-pointer">Opportunities</p>
        <p className="hover:text-blue-400 cursor-pointer">Applications</p>
        <p className="hover:text-blue-400 cursor-pointer">Settings</p>
      </nav>
    </div>
  );
}
