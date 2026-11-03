import { categoryLabel } from "./confidence";
import { ShareChart } from "./share-chart";
import { chartColor, type DomainShare } from "./technologies";

export function DomainShareBar({
  domains,
  limit,
}: {
  domains: DomainShare[];
  limit?: number;
}) {
  return (
    <div className="grid gap-2">
      <ShareChart
        limit={limit}
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
