import { PlanUsageSchema } from "@widgetarium/assistant";
import type { PlanUsage } from "@widgetarium/assistant";
import { localJsonMemory } from "@widgetarium/behaviors";
import type { JsonMemory } from "@widgetarium/behaviors";
import { DEFAULT_CLAUDE_OPTIONS, claudeOptionsCell } from "./claude-options-cell.js";
import type { ClaudeOptionsCell } from "./claude-options-cell.js";

export type UsageMemory = JsonMemory<PlanUsage>;

const CLAUDE_USAGE_KEY = "widgetarium.claude-usage";

const HEARD_USAGE = "the provider reported its plan usage";

type UsageWindow = PlanUsage["fiveHour"];

export function browserUsageMemory(): UsageMemory {
	return localJsonMemory<PlanUsage>(CLAUDE_USAGE_KEY);
}

export function claudeOptionsKeptIn(memory: UsageMemory): ClaudeOptionsCell {
	const cell = claudeOptionsCell({
		...DEFAULT_CLAUDE_OPTIONS,
		usage: keptUsageIn(memory, Date.now()),
	});
	cell.changed(() => keepUsage(cell, memory));
	return cell;
}

export function keptUsageIn(memory: UsageMemory, now: number): PlanUsage | null {
	const read = PlanUsageSchema.safeParse(rememberedIn(memory));

	if (!read.success) {
		return null;
	}

	const fiveHour = liveWindowOf(read.data.fiveHour, now);
	const week = liveWindowOf(read.data.week, now);

	if (fiveHour === null && week === null) {
		return null;
	}

	return {
		fiveHour,
		week,
	};
}

function keepUsage(cell: ClaudeOptionsCell, memory: UsageMemory): void {
	const { usage } = cell.value();

	if (usage === null) {
		return;
	}

	memory.write(usage, HEARD_USAGE);
}

function rememberedIn(memory: UsageMemory): unknown {
	try {
		return memory.read();
	} catch {
		return null;
	}
}

function liveWindowOf(usageWindow: UsageWindow, now: number): UsageWindow {
	if (usageWindow === null || usageWindow.resetsAt <= now) {
		return null;
	}

	return usageWindow;
}
