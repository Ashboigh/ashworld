export interface ModelComparisonEntry {
  provider: string;
  model: string;
  latencyMs: number;
  costPerTokenUsd: number;
  qualityScore: number; // aggregated metric
}

export function listModelComparisons(): ModelComparisonEntry[] {
  return [
    { provider: "openai", model: "gpt-4o-mini", latencyMs: 450, costPerTokenUsd: 0.00003, qualityScore: 92 },
    { provider: "openai", model: "gpt-4o", latencyMs: 650, costPerTokenUsd: 0.00012, qualityScore: 96 },
    { provider: "anthropic", model: "claude-3.5", latencyMs: 540, costPerTokenUsd: 0.00009, qualityScore: 91 },
    { provider: "anthropic", model: "claude-3-opus", latencyMs: 480, costPerTokenUsd: 0.00007, qualityScore: 90 },
  ];
}
