import type { Plugin } from "./plugin";

export interface StartOrder {
	readonly plugins: readonly Plugin[];
	readonly refusals: readonly string[];
}

type StartMark = "visiting" | "started" | "refused";

interface StartRun {
	readonly enabled: ReadonlyMap<string, Plugin>;
	readonly marks: Map<string, StartMark>;
	readonly plugins: Plugin[];
	readonly refusals: string[];
}

export function startOrderOf(installed: readonly Plugin[], enabledIds: readonly string[]): StartOrder {
	const run: StartRun = {
		enabled: enabledById(installed, enabledIds),
		marks: new Map(),
		plugins: [],
		refusals: [],
	};

	for (const each of run.enabled.values()) {
		startPlugin(each, run);
	}

	return {
		plugins: run.plugins,
		refusals: run.refusals,
	};
}

function enabledById(installed: readonly Plugin[], enabledIds: readonly string[]): ReadonlyMap<string, Plugin> {
	const installedById = new Map(installed.map((each) => [each.id, each] as const));

	return new Map(
		enabledIds.flatMap((id) => {
			const found = installedById.get(id);
			return found === undefined ? [] : [[id, found] as const];
		}),
	);
}

function startPlugin(target: Plugin, run: StartRun): boolean {
	const mark = run.marks.get(target.id);

	if (mark !== undefined) {
		return mark === "started";
	}

	run.marks.set(target.id, "visiting");
	return settleStart(target, run, startDependencies(target, run));
}

function settleStart(target: Plugin, run: StartRun, refusal: string | null): boolean {
	if (refusal !== null) {
		run.marks.set(target.id, "refused");
		run.refusals.push(refusal);
		return false;
	}

	run.marks.set(target.id, "started");
	run.plugins.push(target);
	return true;
}

function startDependencies(target: Plugin, run: StartRun): string | null {
	for (const required of target.parts.requiredPlugins) {
		const enabledRequirement = run.enabled.get(required.id);

		if (enabledRequirement === undefined) {
			return `plugin ${target.id} requires ${required.id}, which is not enabled`;
		}

		if (run.marks.get(required.id) === "visiting") {
			return `plugin ${target.id} requires ${required.id}, which requires it back`;
		}

		if (!startPlugin(enabledRequirement, run)) {
			return `plugin ${target.id} requires ${required.id}, which did not start`;
		}
	}

	startEnabledOptional(target, run);
	return null;
}

function startEnabledOptional(target: Plugin, run: StartRun): void {
	for (const wanted of target.parts.optionalPlugins) {
		const enabledOptional = run.enabled.get(wanted.id);

		if (enabledOptional === undefined || run.marks.get(wanted.id) === "visiting") {
			continue;
		}

		startPlugin(enabledOptional, run);
	}
}
