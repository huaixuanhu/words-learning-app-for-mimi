export const PRODUCTION_CUTOVER_MODE_ENV_VAR =
  "MIMI_PRODUCTION_CUTOVER_MODE" as const;

export const PRODUCTION_CUTOVER_MODES = [
  "maintenance",
  "schema6-readiness",
  "live",
] as const;

export type ProductionCutoverMode =
  (typeof PRODUCTION_CUTOVER_MODES)[number];

export function resolveProductionCutoverMode(
  env: Readonly<Record<string, string | undefined>>,
): ProductionCutoverMode | null {
  const value = env[PRODUCTION_CUTOVER_MODE_ENV_VAR];

  return PRODUCTION_CUTOVER_MODES.includes(value as ProductionCutoverMode)
    ? (value as ProductionCutoverMode)
    : null;
}
