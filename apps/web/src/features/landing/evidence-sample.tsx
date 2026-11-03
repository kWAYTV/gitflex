import { Badge } from "@gitflex/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";

import { EvidenceList } from "@/features/insights/evidence-list";

import { SAMPLE_EVIDENCE } from "./sample";

export function EvidenceSample() {
  return (
    <div className="rounded-3xl bg-secondary/60 p-4 sm:p-8 lg:p-10">
      <Card className="shadow-(--shadow-card)">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Next.js</CardTitle>
            <Badge variant="outline">Full-stack</Badge>
            <Badge className="ml-auto">Strong evidence</Badge>
          </div>
          <CardDescription>
            Detected in 13 repositories. Evidence from one of them:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvidenceList evidence={SAMPLE_EVIDENCE} />
        </CardContent>
      </Card>
    </div>
  );
}
