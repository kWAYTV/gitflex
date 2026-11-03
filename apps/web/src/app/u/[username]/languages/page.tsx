import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";

import { LanguageExplorer } from "@/features/insights/language-explorer";
import { PublicEmpty } from "@/features/profile/public-empty";
import { requirePublicProfile } from "@/server/public-profile";

export default async function PublicLanguagesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { analyzedRepositories, languages } =
    await requirePublicProfile(params);
  if (languages.length === 0) {
    return <PublicEmpty />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Languages</CardTitle>
        <CardDescription>
          Classified by GitHub Linguist, which already ignores vendored and
          generated files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LanguageExplorer
          analyzedRepositories={analyzedRepositories}
          languages={languages}
        />
      </CardContent>
    </Card>
  );
}
