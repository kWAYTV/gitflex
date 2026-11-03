import { Card, CardContent } from "@gitflex/ui/components/card";

export function Stats({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  return (
    <Card size="sm">
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
          {items.map((item) => (
            <div
              className="grid gap-1 border-l px-4 first:border-l-0 first:pl-0 max-sm:nth-3:border-l-0 max-sm:nth-3:pl-0"
              key={item.label}
            >
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="font-semibold text-3xl tabular-nums tracking-tight">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
