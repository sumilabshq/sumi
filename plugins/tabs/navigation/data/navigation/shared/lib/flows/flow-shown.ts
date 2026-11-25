import { GENERAL_PROJECT_ID } from "../../schema/flows.schema.js";
import type { Flow, FlowsDoc } from "../../schema/flows.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { flowOfId, folderOfId, isArchived, withFlowAdded, withFlowChanged } from "./flow-docs.js";
import { layoutOfTabs } from "./flow-layouts.js";
import { projectIdOfFlow, projectsOf } from "./flow-projects.js";
import { topLevelOf } from "./flow-top-level.js";
import { flowHolderOf } from "./flow-rows.js";

export interface ShownKeeping {
	readonly was: FlowsDoc | null;
	readonly doc: FlowsDoc;
	readonly placed: PlacedTabs;
	readonly now: number;
}

export interface ShownKept {
	readonly doc: FlowsDoc;
	readonly said: readonly string[];
}

interface DefaultSession {
	readonly doc: FlowsDoc;
	readonly flowId: string;
	readonly said: string;
}

export const DEFAULT_SESSION_NAME = "New session";
const DEFAULT_FLOW_PREFIX = "flow-default-";
const SESSION_MADE = "sessions outside the archive {count} → {after}: default session {id} made in General";
const SHOWN_MOVED = "window {window} flow {gone} → {next} ({why})";

export function blankFlowOf(id: string, name: string, at: number): Flow {
	return {
		id,
		name,
		icon: null,
		layout: layoutOfTabs({ flowId: id, mainTabId: "", tabIds: [] }),
		createdAt: at,
		lastOpenedAt: at,
		archivedAt: null,
	};
}

export function isSessionLive(doc: FlowsDoc, flowId: string): boolean {
	const flow = flowOfId(doc, flowId);
	return flow !== undefined && !isArchived(flow);
}

export function sidebarOrderOf(doc: FlowsDoc): readonly string[] {
	return projectsOf(doc)
		.flatMap((project) =>
			topLevelOf(doc, project.id).flatMap(({ kind, id }) =>
				kind === "flow" ? [id] : (folderOfId(doc, id)?.flowIds ?? []),
			),
		)
		.filter((id) => isSessionLive(doc, id));
}

export function neighbourOf(order: readonly string[], goneId: string, isFree: (id: string) => boolean): string | null {
	const at = order.indexOf(goneId);
	const above = at === -1 ? [] : order.slice(0, at).reverse();
	return above.find(isFree) ?? order.slice(at + 1).find(isFree) ?? null;
}

export function withShownKept({ was, doc, placed, now }: ShownKeeping): ShownKept {
	const left = Object.entries(was?.windowFlows ?? {}).filter(
		([window, flowId]) => !isSessionLive(doc, flowId) && (doc.windowFlows[window] ?? flowId) === flowId,
	);
	const order = was === null ? [] : sidebarOrderOf(was);
	const moved = left.reduce<ShownKept>(
		(kept, [window, flowId]) => withWindowMoved(kept, { window, goneId: flowId, order, placed, now }),
		{ doc, said: [] },
	);

	if (moved.doc.flows.some((flow) => !isArchived(flow))) {
		return moved;
	}

	const made = withDefaultSession(moved.doc, now);
	return { doc: made.doc, said: [...moved.said, made.said] };
}

interface WindowMove {
	readonly window: string;
	readonly goneId: string;
	readonly order: readonly string[];
	readonly placed: PlacedTabs;
	readonly now: number;
}

function withWindowMoved({ doc, said }: ShownKept, { window, goneId, order, placed, now }: WindowMove): ShownKept {
	const isFree = (id: string): boolean =>
		isSessionLive(doc, id) && flowHolderOf(placed, doc, { flowId: id, window }) === null;
	const neighbour = neighbourOf(order, goneId, isFree);
	const made = neighbour === null ? withDefaultSession(doc, now) : null;
	const target = neighbour ?? made?.flowId ?? goneId;
	const shown = withFlowChanged(
		{ ...(made?.doc ?? doc), windowFlows: { ...doc.windowFlows, [window]: target } },
		target,
		{ lastOpenedAt: now },
	);
	const why = neighbour === null ? "no session left beside it" : "its neighbour in the sidebar";
	const told = SHOWN_MOVED.replace("{window}", window)
		.replace("{gone}", goneId)
		.replace("{next}", target)
		.replace("{why}", why);
	return { doc: shown, said: [...said, ...(made === null ? [] : [made.said]), told] };
}

function withDefaultSession(doc: FlowsDoc, now: number): DefaultSession {
	const flowId = freeFlowIdOf(doc, `${DEFAULT_FLOW_PREFIX}${now}`, 0);
	const before = sidebarOrderOf(doc).find((id) => doc.looseFlowIds.includes(id) && isInGeneral(doc, id)) ?? null;
	const live = doc.flows.filter((flow) => !isArchived(flow)).length;
	return {
		doc: withFlowAdded(doc, blankFlowOf(flowId, DEFAULT_SESSION_NAME, now), {
			folderId: null,
			before,
			projectId: GENERAL_PROJECT_ID,
		}),
		flowId,
		said: SESSION_MADE.replace("{count}", String(live))
			.replace("{after}", String(live + 1))
			.replace("{id}", flowId),
	};
}

function isInGeneral(doc: FlowsDoc, flowId: string): boolean {
	const flow = flowOfId(doc, flowId);
	return flow !== undefined && projectIdOfFlow(doc, flow) === GENERAL_PROJECT_ID;
}

function freeFlowIdOf(doc: FlowsDoc, base: string, tried: number): string {
	const id = tried === 0 ? base : `${base}-${tried}`;
	return flowOfId(doc, id) === undefined ? id : freeFlowIdOf(doc, base, tried + 1);
}
