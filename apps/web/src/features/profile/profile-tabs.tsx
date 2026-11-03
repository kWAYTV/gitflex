"use client";

import { Tabs, TabsList, TabsTrigger } from "@gitflex/ui/components/tabs";
import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const TABS: { label: string; segment: string | null; value: string }[] = [
  { label: "Overview", segment: null, value: "overview" },
  { label: "Score", segment: "score", value: "score" },
  { label: "Languages", segment: "languages", value: "languages" },
  { label: "Technologies", segment: "technologies", value: "technologies" },
  { label: "Repositories", segment: "repositories", value: "repositories" },
];

/** Route-backed tabs: each tab is a layout segment, so the active tab survives reloads and links. */
export function ProfileTabs({ basePath }: { basePath: string }) {
  const segment = useSelectedLayoutSegment() ?? "overview";

  return (
    <Tabs value={segment}>
      <TabsList variant="line">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            nativeButton={false}
            render={
              <Link
                href={
                  (tab.segment
                    ? `${basePath}/${tab.segment}`
                    : basePath) as Route
                }
              />
            }
            value={tab.value}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
