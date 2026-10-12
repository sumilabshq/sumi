import { keptFeaturesOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec } from "@widgetarium/core/app-spec.js";

export function specMarkdownOf(spec: AppSpec): string {
	const kept = keptFeaturesOf(spec);
	return [
		`**${spec.job}**`,
		"## Features",
		...kept.map(
			(feature) => `- **${feature.title}** — ${feature.says}${feature.mark === "suggested" ? " _(suggested)_" : ""}`,
		),
		"## Pages",
		...spec.pages.map((page) => `- **${page.name}** — ${page.says}`),
		spec.choices.length ? "## Choices" : "",
		...spec.choices.map((choice) => `- **${choice.name}**: ${choice.picked}`),
		"## Checks",
		...spec.checks.map((check) => `- ${check}`),
	]
		.filter((line) => line !== "")
		.join("\n");
}
