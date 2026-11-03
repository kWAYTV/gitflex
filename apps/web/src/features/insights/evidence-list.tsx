import { EVIDENCE_KIND_LABELS } from "./confidence";

export function EvidenceList({
  evidence,
}: {
  evidence: { kind: string; source: string }[];
}) {
  return (
    <ul className="grid divide-y text-sm">
      {evidence.map((record) => (
        <li
          className="grid gap-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3"
          key={`${record.kind}:${record.source}`}
        >
          <span className="text-muted-foreground">
            {EVIDENCE_KIND_LABELS[record.kind] ?? record.kind}
          </span>
          <code
            className="min-w-0 truncate font-mono text-[0.8125rem]"
            title={record.source}
          >
            {record.source}
          </code>
        </li>
      ))}
    </ul>
  );
}
