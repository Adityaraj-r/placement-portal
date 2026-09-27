"use client";

import { useCallback, useEffect, useState } from "react";
import OpportunityCard from "@/components/OpportunityCard";
// import { opportunities } from "@/data/opportunities";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getAllNonAppliedOpportunities, getAllOpportunities } from "../actions/opportunities.actions";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const router = useRouter()

  const filteredOpportunities = opportunities?.filter((item) =>
    `${item.role} ${item.company_name} ${item.tags?.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const getData = useCallback(async () => {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      router.push('/login')
      return [];
    }
    else {
      const temp = await getAllNonAppliedOpportunities(user.id)
      console.log(user.id)
      return temp.data ?? [];
    }
  }, [router]);
  useEffect(() => {
    getData().then(setOpportunities)
  }, [getData])
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">
            Explore Opportunities
          </h1>
          <p className="text-muted-foreground text-base">
            Find jobs, internships, and career opportunities
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder="Search by role, company, or skill..."
              className="pl-12 h-12 text-base border-slate-300 focus-visible:ring-blue-500 focus-visible:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <p className="text-sm text-slate-500 mt-2 text-center">
              {filteredOpportunities.length} opportunity
              {filteredOpportunities.length !== 1 ? "ies" : "y"} found
            </p>
          )}
        </div>

        {/* Opportunities Grid */}
        {filteredOpportunities.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities?.map((opportunity, index) => (
              <OpportunityCard key={opportunity.id || index} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {search
                ? "No opportunities match your search."
                : "No opportunities available at the moment."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2 underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
