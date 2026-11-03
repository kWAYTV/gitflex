"use client";

import type { ProfileSettings } from "@gitflex/db/queries/profile";
import { Button } from "@gitflex/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@gitflex/ui/components/field";
import { Switch } from "@gitflex/ui/components/switch";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { updateProfileSettingsAction } from "./actions";

export function PublicProfilePanel({
  hasPrivateRepositories,
  settings,
  username,
}: {
  hasPrivateRepositories: boolean;
  settings: ProfileSettings;
  username: string;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, applyPatch] = useOptimistic(
    settings,
    (current, patch: Partial<ProfileSettings>) => ({ ...current, ...patch })
  );
  const isPublic = optimistic.visibility === "public";

  const update = useCallback(
    (patch: Partial<ProfileSettings>) => {
      startTransition(async () => {
        applyPatch(patch);
        const result = await updateProfileSettingsAction(patch);
        if (!result.ok) {
          toast.error(result.message);
        }
      });
    },
    [applyPatch]
  );
  const setPublic = useCallback(
    (checked: boolean) =>
      update({ visibility: checked ? "public" : "private" }),
    [update]
  );
  const setPrivateAggregates = useCallback(
    (checked: boolean) => update({ publishPrivateAggregates: checked }),
    [update]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public profile</CardTitle>
        <CardDescription>
          Only public repositories are ever listed or named. Private analysis
          stays on this dashboard unless you publish its aggregates.
        </CardDescription>
        {isPublic ? (
          <CardAction>
            <Button
              nativeButton={false}
              render={<Link href={`/u/${username}` as Route} />}
              size="sm"
              variant="outline"
            >
              View profile
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="profile-visibility">
                Publish profile
              </FieldLabel>
              <FieldDescription>
                Anyone with the link can see /u/{username}.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={isPublic}
              id="profile-visibility"
              onCheckedChange={setPublic}
            />
          </Field>
          <Field data-disabled={!isPublic} orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="profile-private-aggregates">
                Include private repositories in totals
              </FieldLabel>
              <FieldDescription>
                {hasPrivateRepositories
                  ? "Adds private repositories to the score, language and technology totals. Names, descriptions and evidence stay hidden."
                  : "None of your included repositories are private, so this changes nothing yet."}
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={optimistic.publishPrivateAggregates}
              disabled={!isPublic}
              id="profile-private-aggregates"
              onCheckedChange={setPrivateAggregates}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
