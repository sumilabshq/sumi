import type { Setup } from "../../shared/schema/setups.schema.js";

export type SetupsParts = {
	readonly setups: readonly Setup[];
};

const BUILT_IN_SETUPS: readonly Setup[] = [
	{
		id: "code",
		title: "Code",
		panes: [
			{ app: "git", title: "Git", side: "right", besideAt: 0 },
			{ app: "terminal", title: "Terminal", side: "bottom", besideAt: 1 },
		],
	},
	{
		id: "review",
		title: "Review",
		panes: [
			{ app: "tasks", title: "Tasks", side: "right", besideAt: 0 },
			{ app: "git", title: "Git", side: "bottom", besideAt: 1 },
		],
	},
	{
		id: "research",
		title: "Research",
		panes: [{ app: "browser", title: "Browser", side: "right", besideAt: 0 }],
	},
	{
		id: "design",
		title: "Design",
		panes: [{ app: "canvas", title: "Canvas", side: "right", besideAt: 0 }],
	},
];

export function setupsPartsOn(): SetupsParts {
	return { setups: BUILT_IN_SETUPS };
}
