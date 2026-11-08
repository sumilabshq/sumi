import type { Plugin } from "./plugin";
import type { AnyApp, ApiOf, CallerFacts, Dependency, ProvideFor } from "./plugin-app";
import { sentenceOf } from "./sentence";
import { Service } from "./service";
import { SlotFills } from "./slot-fills";
import type { SlotFilled } from "./slot-fills";
import { UiSlot } from "./ui-slot";
import type { SlotAdding, SlotComponent, SlotReplacing, SlotShape } from "./ui-slot";

export interface ServiceProvision {
	readonly service: Service<unknown>;
	readonly provideFor: ProvideFor<unknown>;
}

export interface AppliedPlugins {
	readonly appliedIds: ReadonlySet<string>;
	readonly refusals: readonly string[];
	readonly slotFills: SlotFills;
}

interface ApplyRun {
	readonly provisions: ReadonlyMap<string, ServiceProvision>;
	readonly apis: Map<string, unknown>;
	readonly failed: Set<string>;
	readonly refusals: string[];
	readonly closers: (() => void)[];
	readonly slotFilled: SlotFilled[];
}

const NO_PROVIDER = "plugin {plugin} requires the service {service}, which no host provides";
const REQUIRED_FAILED = "plugin {plugin} requires {required}, which did not start";
const APPLY_THREW = "plugin {plugin} could not apply: {reason}";
const NOT_LISTED = "plugin {plugin} uses {used}, which it does not list in .require or .optional";
const CALLED_LATE = "{plugin}.{method} was called after start: call it inside apply";
const SLOT_LATE = "slot {slot}.{kind} was called after start: call it inside apply";
const REPLACED_TWICE = "plugin {plugin} replaces slot {slot}, which {other} already replaces: one replacement per slot";
const SLOTS_TAKEN = "plugin {plugin} returns an API field named slots, which its UI slots take: rename the field";

export function appliedPluginsOf(started: readonly Plugin[], provisions: readonly ServiceProvision[]): AppliedPlugins {
	const run: ApplyRun = {
		provisions: new Map(provisions.map((provision) => [provision.service.id, provision])),
		apis: new Map(),
		failed: new Set(),
		refusals: [],
		closers: [],
		slotFilled: [],
	};

	for (const each of started) {
		applyPlugin(each, run);
	}

	for (const close of run.closers) {
		close();
	}

	return {
		appliedIds: new Set(started.filter(({ id }) => !run.failed.has(id)).map(({ id }) => id)),
		refusals: run.refusals,
		slotFills: new SlotFills(run.slotFilled.filter(({ pluginId }) => !run.failed.has(pluginId))),
	};
}

function applyPlugin(target: Plugin, run: ApplyRun): void {
	const refusal = refusalBeforeApply(target, run);

	if (refusal !== null) {
		run.failed.add(target.id);
		run.refusals.push(refusal);
		return;
	}

	try {
		const api = target.applyWith(appFor(target, run));
		run.apis.set(target.id, closableApiOf(target.id, api, run));
	} catch (thrown) {
		run.failed.add(target.id);
		run.refusals.push(sentenceOf(APPLY_THREW, { plugin: target.id, reason: reasonOf(thrown) }));
	}
}

function refusalBeforeApply(target: Plugin, run: ApplyRun): string | null {
	const failedRequired = target.parts.requiredPlugins.find(({ id }) => run.failed.has(id));

	if (failedRequired !== undefined) {
		return sentenceOf(REQUIRED_FAILED, { plugin: target.id, required: failedRequired.id });
	}

	const unprovided = target.parts.requiredServices.find(({ id }) => !run.provisions.has(id));
	return unprovided === undefined ? null : sentenceOf(NO_PROVIDER, { plugin: target.id, service: unprovided.id });
}

function appFor(target: Plugin, run: ApplyRun): AnyApp {
	const caller: CallerFacts = {
		pluginId: target.id,
		prefix: target.isAliased ? target.id : null,
	};
	const provided = new Map<string, unknown>();
	return {
		use: <D extends Dependency>(dependency: D): ApiOf<D> => {
			if (!target.isRequired(dependency) && !target.isOptional(dependency)) {
				throw new Error(sentenceOf(NOT_LISTED, { plugin: target.id, used: dependency.id }));
			}

			// TRADE-OFF: the one cast of the container: an API is stored untyped and read back by its dependency's type
			return usedApiOf(dependency, { caller, provided, run }) as ApiOf<D>;
		},
	};
}

interface UseAsk {
	readonly caller: CallerFacts;
	readonly provided: Map<string, unknown>;
	readonly run: ApplyRun;
}

function usedApiOf(dependency: Dependency, { caller, provided, run }: UseAsk): unknown {
	if (!(dependency instanceof Service)) {
		return run.apis.has(dependency.id) ? withSlotsOf(dependency, run.apis.get(dependency.id), { caller, run }) : null;
	}

	const provision = run.provisions.get(dependency.id);

	if (provision === undefined) {
		return null;
	}

	if (!provided.has(dependency.id)) {
		provided.set(dependency.id, provision.provideFor(caller));
	}

	return provided.get(dependency.id);
}

interface FillAsk {
	readonly caller: CallerFacts;
	readonly run: ApplyRun;
}

function withSlotsOf(dependency: Dependency, api: unknown, ask: FillAsk): unknown {
	const slots = slotsOf(dependency);

	if (slots.length === 0) {
		return api;
	}

	if (isRecord(api) && "slots" in api) {
		throw new Error(sentenceOf(SLOTS_TAKEN, { plugin: dependency.id }));
	}

	return {
		...(isRecord(api) ? api : {}),
		slots: Object.fromEntries(slots.map(([key, slot]) => [key, fillingOf(slot, ask)])),
	};
}

function slotsOf(dependency: Dependency): readonly (readonly [string, UiSlot<unknown, SlotShape>])[] {
	if (!("slots" in dependency) || !isRecord(dependency.slots)) {
		return [];
	}

	return Object.entries(dependency.slots).flatMap(([key, slot]) =>
		slot instanceof UiSlot ? [[key, slot] as const] : [],
	);
}

function fillingOf(
	slot: UiSlot<unknown, SlotShape>,
	{ caller, run }: FillAsk,
): SlotReplacing<never> | SlotAdding<never> {
	const state = { isOpen: true };
	run.closers.push(() => {
		state.isOpen = false;
	});
	const filled =
		(kind: SlotFilled["kind"]) =>
		(component: SlotComponent<never>): void => {
			if (!state.isOpen) {
				throw new Error(sentenceOf(SLOT_LATE, { slot: slot.name, kind }));
			}

			const replacing = run.slotFilled.find(
				(each) => each.slot === slot.name && each.kind === "replace" && !run.failed.has(each.pluginId),
			);

			if (kind === "replace" && replacing !== undefined) {
				throw new Error(
					sentenceOf(REPLACED_TWICE, { plugin: caller.pluginId, slot: slot.name, other: replacing.pluginId }),
				);
			}

			run.slotFilled.push({ slot: slot.name, pluginId: caller.pluginId, kind, component });
		};
	return slot.shape === "list" ? { add: filled("add") } : { replace: filled("replace") };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null;
}

function closableApiOf(pluginId: string, api: unknown, run: ApplyRun): unknown {
	if (!isMethods(api)) {
		return api;
	}

	const state = { isOpen: true };
	run.closers.push(() => {
		state.isOpen = false;
	});
	return Object.fromEntries(
		Object.entries(api).map(([method, call]) => [
			method,
			(...args: readonly unknown[]): unknown => {
				if (!state.isOpen) {
					throw new Error(sentenceOf(CALLED_LATE, { plugin: pluginId, method }));
				}

				return call(...args);
			},
		]),
	);
}

function isMethods(api: unknown): api is Readonly<Record<string, (...args: readonly unknown[]) => unknown>> {
	return typeof api === "object" && api !== null && Object.values(api).every((value) => typeof value === "function");
}

function reasonOf(thrown: unknown): string {
	return thrown instanceof Error ? thrown.message : String(thrown);
}
