import { TECHNOLOGIES } from "./registry";
import type { Technology } from "./types";

const byId = new Map(
  TECHNOLOGIES.map((technology) => [technology.id, technology])
);

export function getTechnology(id: string): Technology | undefined {
  return byId.get(id);
}

export function listTechnologies(): readonly Technology[] {
  return TECHNOLOGIES;
}
