import { EVIDENCE_KIND_LABELS } from "./confidence";

export function EvidenceList({
  evidence,
}: {
  evidence: { kind: string; source: string }[];
}) {
  return (
    <ul className="grid gap-0.5 text-xs">
      {evidence.map((record) => (
        <li className="flex gap-2" key={`${record.kind}:${record.source}`}>
          <span className="w-44 shrink-0 text-muted-foreground">
            {EVIDENCE_KIND_LABELS[record.kind] ?? record.kind}
          </span>
          <code className="min-w-0 truncate" title={record.source}>
            {record.source}
          </code>
        </li>
      ))}
    </ul>
  );
}
