"use client";

import { Tabs, TabsList, TabsTrigger } from "@gitflex/ui/components/tabs";
import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const TABS: { href: Route; label: string; value: string }[] = [
  { href: "/dashboard", label: "Overview", value: "overview" },
  { href: "/dashboard/languages", label: "Languages", value: "languages" },
  {
    href: "/dashboard/technologies",
    label: "Technologies",
    value: "technologies",
  },
  {
    href: "/dashboard/repositories",
    label: "Repositories",
    value: "repositories",
  },
];

/** Route-backed tabs: each tab is a layout segment, so the active tab survives reloads and links. */
export function ProfileTabs() {
  const segment = useSelectedLayoutSegment() ?? "overview";

  return (
    <Tabs value={segment}>
      <TabsList variant="line">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            nativeButton={false}
            render={<Link href={tab.href} />}
            value={tab.value}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
