import type { BranchRow } from "@sumi/git";
import { LAST_COMMIT } from "./git-address.js";
import type { GlyphName } from "./glyph-paths.js";

export interface BaseChoice {
	readonly base: string;
	readonly label: string;
	readonly hint: string;
	readonly glyph: GlyphName;
}

const TRUNKS: readonly string[] = ["main", "master"];
const LAST_COMMIT_CHOICE: BaseChoice = {
	base: LAST_COMMIT,
	label: "Last commit",
	hint: "only uncommitted",
	glyph: "commit",
};
const WHOLE_BRANCH_HINT = "the whole branch";
const UPSTREAM_HINT = "its remote copy";

// TODO: move to a base-choices query; which bases make sense is a git rule, not a view's
export function presetBasesOf(branches: readonly BranchRow[], head: string): BaseChoice[] {
	const trunk = branches.find(({ name }) => TRUNKS.includes(name) && name !== head);
	const upstream = branches.find(({ name }) => name === head)?.upstream ?? null;
	const trunkChoices: BaseChoice[] =
		trunk === undefined
			? []
			: [
					{
						base: trunk.name,
						label: trunk.name,
						hint: WHOLE_BRANCH_HINT,
						glyph: "branch",
					},
				];
	const upstreamChoices: BaseChoice[] =
		upstream === null
			? []
			: [
					{
						base: upstream,
						label: upstream,
						hint: UPSTREAM_HINT,
						glyph: "cloud",
					},
				];
	return [LAST_COMMIT_CHOICE, ...trunkChoices, ...upstreamChoices];
}
