"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { createCompany, getCompanies, updateCompany } from "@/app/actions/company.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_COMPANY = {
  name: "",
  industry: "",
  location: "",
  website: "",
  hr_contact_name: "",
  hr_contact_email: "",
  description: "",
};

const COMPANY_FIELDS = [
  { key: "industry", label: "Industry" },
  { key: "location", label: "Location" },
  { key: "website", label: "Website", type: "url" },
  { key: "hr_contact_name", label: "HR contact name" },
  { key: "hr_contact_email", label: "HR contact email", type: "email" },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCompanies = useCallback(async () => {
    const result = await getCompanies();
    if (!result?.success) {
      toast.error(result?.error || "Could not load companies");
      return;
    }
    setCompanies(result.data ?? []);
  }, []);

  useEffect(() => {
    async function load() {
      await loadCompanies();
      setLoading(false);
    }
    load();
  }, [loadCompanies]);

  function startEditing(selectedCompany) {
    setCompany({
      ...EMPTY_COMPANY,
      ...Object.fromEntries(Object.keys(EMPTY_COMPANY).map((key) => [key, selectedCompany[key] || ""])),
    });
    setEditingId(selectedCompany.id);
  }

  function resetForm() {
    setCompany(EMPTY_COMPANY);
    setEditingId(null);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = editingId
        ? await updateCompany(editingId, company)
        : await createCompany(company);
      if (!result?.success) {
        toast.error(result?.error || `Could not ${editingId ? "update" : "create"} company`);
        return;
      }
      toast.success(editingId ? "Company updated." : "Company added.");
      resetForm();
      await loadCompanies();
    } catch {
      toast.error(`Could not ${editingId ? "update" : "create"} company`);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setCompany((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
        <p className="text-base text-muted-foreground">Manage the companies linked to placement drives.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Company" : "Add Company"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-1">
                <Label htmlFor="company-name">Company name</Label>
                <Input id="company-name" value={company.name} onChange={(event) => updateField("name", event.target.value)} required />
              </div>
              {COMPANY_FIELDS.map((field) => (
                <div className="space-y-1" key={field.key}>
                  <Label htmlFor={`company-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`company-${field.key}`}
                    type={field.type || "text"}
                    value={company[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label htmlFor="company-description">Description</Label>
                <Textarea id="company-description" value={company.description} onChange={(event) => updateField("description", event.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Add Company"}</Button>
                {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4" aria-label="Company list">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading companies…</p>
          ) : companies.length ? companies.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Building2 className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-semibold text-gray-900">{item.name}</h2>
                    <p className="text-sm text-slate-600">{[item.industry, item.location].filter(Boolean).join(" · ") || "Industry and location not provided"}</p>
                    {item.website && (
                      <a className="block truncate text-sm text-blue-600 hover:underline" href={item.website} target="_blank" rel="noreferrer">{item.website}</a>
                    )}
                    {(item.hr_contact_name || item.hr_contact_email) && (
                      <p className="text-sm text-slate-600">HR: {[item.hr_contact_name, item.hr_contact_email].filter(Boolean).join(" · ")}</p>
                    )}
                    {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => startEditing(item)}>Edit</Button>
              </CardContent>
            </Card>
          )) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">No companies yet. Add one to use it when creating a placement drive.</CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
