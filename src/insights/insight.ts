export interface Insight {
  severity: "info" | "warning" | "critical";
  titleKey: string;
  bodyKey: string;
  payload?: Record<string, unknown>;
}
