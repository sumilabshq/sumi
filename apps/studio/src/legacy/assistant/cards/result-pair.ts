import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Blocker, Tally, TurnResult } from "@widgetarium/core/engine/assistant-cards.js";
import { countText } from "@widgetarium/core/engine/count-text.js";
import { BlockerCard } from "./blocker-card.js";
import { ChecksStrip } from "./checks-strip.js";
import { checksText } from "./checks-text.js";
import { HeroCard } from "./hero-card.js";
import type { Headline } from "./hero-card.js";

export interface ResultPairProps {
	readonly result: TurnResult;
	readonly onFix: (blocker: Blocker) => void;
}

const REPORT = "Report · {all} features";
const CHANGED_ONE = "Changed · 1 file";
const CHANGED_MANY = "Changed · {count} files";
const CHIP_JOINER = " · ";
const WORK_FIRST = "{passed} of {all}";
const WORK_SECOND = "features work";
const FILES_ONE = "1 file";
const FILES_MANY = "{count} files";
const FILES_SECOND = "changed";

export function ResultPair({ result, onFix }: ResultPairProps): ReactElement | null {
	const hero = headlineOf(result);
	if (!hero) {
		return result.checks ? h(ChecksStrip, { checks: result.checks }) : null;
	}

	const { blockedBy } = result;
	return h(
		"div",
		{ className: "wg-studio-ai-result-space" },
		h("div", { className: blockedBy ? "wg-studio-ai-result is-pair" : "wg-studio-ai-result" }, [
			h(HeroCard, { key: "hero", chip: heroChipOf(result), headline: hero }),
			blockedBy ? h(BlockerCard, { key: "blocker", blocker: blockedBy, onFix: () => onFix(blockedBy) }) : null,
		]),
	);
}

function headlineOf({ features, changedFiles }: TurnResult): Headline | null {
	if (features) {
		return { first: filledTally(WORK_FIRST, features), second: WORK_SECOND };
	}

	return changedFiles > 0 ? { first: countText(changedFiles, FILES_ONE, FILES_MANY), second: FILES_SECOND } : null;
}

function heroChipOf({ features, changedFiles, checks }: TurnResult): string {
	const parts = [
		features ? REPORT.replace("{all}", String(features.all)) : null,
		changedFiles > 0 ? countText(changedFiles, CHANGED_ONE, CHANGED_MANY) : null,
		checks ? checksText(checks) : null,
	];
	return parts.filter((part) => part !== null).join(CHIP_JOINER);
}

function filledTally(said: string, tally: Tally): string {
	return said.replace("{passed}", String(tally.passed)).replace("{all}", String(tally.all));
}
