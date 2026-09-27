import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function SkillsList({ skills }) {
  return (
    <Card className="bg-white shadow-md border border-slate-200/80 rounded-xl overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" />
          <CardTitle className="text-slate-800 text-lg font-bold">
            Skills
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {skills?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <Badge
                key={index}
                className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors text-sm font-medium px-3 py-1"
              >
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">
            No skills added yet. Add your skills in the profile editor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
