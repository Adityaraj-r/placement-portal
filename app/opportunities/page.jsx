"use client";

import { useCallback, useEffect, useState } from "react";
import OpportunityCard from "@/components/OpportunityCard";
// import { opportunities } from "@/data/opportunities";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getAllOpportunities } from "../actions/opportunities.actions";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const router = useRouter()

  const filteredOpportunities = opportunities?.filter((item) =>
    `${item.role} ${item.company_name} ${item.allowed_departments?.join(" ") || ""}`
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
      const temp = await getAllOpportunities()
      return temp.data ?? [];
    }
  }, [router]);
  useEffect(() => {
    getData().then(setOpportunities)
  }, [getData])
  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Opportunities"
          description="Explore available placement opportunities."
        />

        {/* Search Bar */}
        <div className="mx-auto w-full max-w-2xl">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder="Search by role, company, or skill..."
              className="h-12 border-input pl-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
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
