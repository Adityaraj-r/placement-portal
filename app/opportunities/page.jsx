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
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
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
      setLoadFailed(true);
      router.push('/login')
      return [];
    }
    else {
      const temp = await getAllOpportunities()
      if (temp?.success === false) setLoadFailed(true);
      return temp.data ?? [];
    }
  }, [router]);
  useEffect(() => {
    Promise.resolve()
      .then(getData)
      .then(setOpportunities)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
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
        {loading ? (
          <LoadingState label="Loading placement opportunities">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} aria-hidden="true" className="rounded-xl border border-border bg-card p-5"><div className="mb-4 h-5 w-2/3 animate-pulse rounded bg-muted" /><div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /></div>)}</div>
          </LoadingState>
        ) : loadFailed ? (
          <ErrorState title="Unable to load opportunities" description="Something went wrong while retrieving published placement opportunities." />
        ) : filteredOpportunities.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities?.map((opportunity, index) => (
              <OpportunityCard key={opportunity.id || index} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={search ? "No matching opportunities" : "No published opportunities available"}
            description={search ? "Try a different search, or clear it to see all available opportunities." : "There are currently no published placement opportunities available."}
            action={search ? <Button type="button" variant="outline" onClick={() => setSearch("")}>Clear search</Button> : null}
          />
        )}
      </div>
    </div>
  );
}
