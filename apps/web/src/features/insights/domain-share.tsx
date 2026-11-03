import { categoryLabel } from "./confidence";
import { ShareBar } from "./share-bar";
import { chartColor, type DomainShare } from "./technologies";

export function DomainShareBar({ domains }: { domains: DomainShare[] }) {
  return (
    <div className="grid gap-2">
      <ShareBar
        slices={domains.map((domain, index) => ({
          color: chartColor(index),
          name: categoryLabel(domain.category),
          value: domain.value,
        }))}
      />
      <p className="text-muted-foreground text-xs">
        Weighted by repositories × average confidence. Each technology counts
        once, under its primary category; languages and developer tooling are
        excluded.
      </p>
    </div>
  );
}
