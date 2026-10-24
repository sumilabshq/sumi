import { SHADCN_CHART_TOKENS, SHADCN_REQUIRED_TOKENS, SHADCN_SIDEBAR_TOKENS } from "./token-contract";

export const SHADCN_COLOUR_TOKENS: readonly string[] = [
	...SHADCN_REQUIRED_TOKENS.filter((name) => name !== "radius"),
	...SHADCN_CHART_TOKENS,
	...SHADCN_SIDEBAR_TOKENS,
	"brand",
	"brand-foreground",
];

export const SHADCN_TOKENS: readonly string[] = [...SHADCN_COLOUR_TOKENS, "radius"];
