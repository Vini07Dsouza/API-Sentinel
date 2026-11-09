import { CheckCheck, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSentinel } from "@/lib/store/sentinel-store";
import type { Incident } from "@/lib/types";

export function IncidentActions({ incident, size = "sm" }: { incident: Incident; size?: "sm" | "default" }) {
  const { actions } = useSentinel();
  if (incident.status === "resolved") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {incident.status === "open" ? (
        <Button
          variant="outline"
          size={size}
          onClick={() => {
            actions.acknowledgeIncident(incident.id);
            toast.success("Incident acknowledged", { description: incident.title });
          }}
        >
          <Eye /> Acknowledge
        </Button>
      ) : null}
      <Button
        size={size}
        onClick={() => {
          actions.resolveIncident(incident.id);
          toast.success("Incident resolved", { description: incident.title });
        }}
      >
        <CheckCheck /> Resolve
      </Button>
    </div>
  );
}
