import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { dropLineOf } from "./drop-line.js";
import type { DropLine } from "./drop-line.js";
import { useHapticTap } from "./haptic-tap.js";
import { liftCopyOf } from "./lift-copy.js";
import { usePeekHold } from "./peek-hold.js";
import { placeBeforeOf } from "./flow-facts.js";
import type { FlowActs, FlowPlace, TopRef } from "./use-flow-acts.js";

export type DragSource =
	| { readonly kind: "flow"; readonly id: string }
	| { readonly kind: "folder"; readonly id: string }
	| { readonly kind: "project"; readonly id: string };

export type DropTarget =
	| {
			readonly kind: "flow";
			readonly flowId: string;
			readonly nextFlowId: string | null;
			readonly nextTop: TopRef | null;
			readonly top: TopRef;
			readonly folderId: string | null;
			readonly projectId: string;
	  }
	| {
			readonly kind: "folder";
			readonly folderId: string;
			readonly isOpen: boolean;
			readonly nextTop: TopRef | null;
			readonly projectId: string;
	  }
	| { readonly kind: "project"; readonly projectId: string; readonly nextProjectId: string | null };

type Landing =
	| { readonly kind: "flow"; readonly place: FlowPlace }
	| { readonly kind: "folder-place"; readonly projectId: string; readonly before: TopRef | null }
	| { readonly kind: "folder-to-project"; readonly projectId: string }
	| { readonly kind: "project"; readonly beforeId: string | null };

interface Aim {
	readonly key: string;
	readonly container: string | null;
	readonly line: DropLine | null;
	readonly landing: Landing;
}

export type DragActs = Pick<FlowActs, "move" | "moveFolderToProject" | "placeFolder" | "reorderProject">;

const FOLDER_BLOCK = ".sumi-flows-folder";
const FOLDER_EDGE_SHARE = 0.3;

export interface FlowDrag {
	readonly containerKey: string | null;
	readonly draggingKey: string | null;
	readonly line: DropLine | null;
	sourceProps(source: DragSource): SourceProps;
	targetProps(target: DropTarget): TargetProps;
}

export interface SourceProps {
	readonly draggable: true;
	readonly onDragStart: (event: DragEvent) => void;
	readonly onDragEnd: () => void;
}

export interface TargetProps {
	readonly onDragOver: (event: DragEvent) => void;
	readonly onDrop: (event: DragEvent) => void;
}

export function useFlowDrag(acts: DragActs): FlowDrag {
	const dragging = useRef<DragSource | null>(null);
	const aimed = useRef<Aim | null>(null);
	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const [aim, setAim] = useState<Aim | null>(null);
	const tap = useHapticTap();
	usePeekHold(draggingKey !== null);
	const reset = (): void => {
		dragging.current = null;
		aimed.current = null;
		setDraggingKey(null);
		setAim(null);
	};
	const land = (source: DragSource, landing: Landing): void => {
		if (source.kind === "flow" && landing.kind === "flow" && landing.place.before !== source.id) {
			acts.move(source.id, landing.place);
		}

		if (source.kind === "folder" && landing.kind === "folder-to-project") {
			acts.moveFolderToProject(source.id, landing.projectId);
		}

		if (
			source.kind === "folder" &&
			landing.kind === "folder-place" &&
			!(landing.before?.kind === "folder" && landing.before.id === source.id)
		) {
			acts.placeFolder(source.id, landing.projectId, landing.before);
		}

		if (source.kind === "project" && landing.kind === "project" && landing.beforeId !== source.id) {
			acts.reorderProject(source.id, landing.beforeId);
		}
	};
	return {
		containerKey: aim?.container ?? null,
		draggingKey,
		line: aim?.line ?? null,
		sourceProps: (source) => ({
			draggable: true,
			onDragStart: (event) => {
				event.stopPropagation();
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", source.id);
				liftCopyOf(event);
				dragging.current = source;
				setDraggingKey(dragKeyOf(source));
			},
			onDragEnd: reset,
		}),
		targetProps: (target) => ({
			onDragOver: (event) => {
				const source = dragging.current;
				const next = source === null ? null : aimOf(source, target, event);

				if (next === null) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();

				if (next.key === aimed.current?.key) {
					return;
				}

				aimed.current = next;
				setAim(next);
				tap();
			},
			onDrop: (event) => {
				const source = dragging.current;
				const landing = aimed.current?.landing;

				if (source === null || landing === undefined) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
				land(source, landing);
				reset();
			},
		}),
	};
}

export function dragKeyOf(source: DragSource): string {
	return `${source.kind}:${source.id}`;
}

export function folderKeyOf(folderId: string): string {
	return `folder:${folderId}`;
}

export function projectKeyOf(projectId: string): string {
	return `project:${projectId}`;
}

function aimOf(source: DragSource, target: DropTarget, event: DragEvent): Aim | null {
	const element = event.currentTarget;
	const box = element.getBoundingClientRect();
	const isUpper = event.clientY < box.top + box.height / 2;

	if (source.kind === "project") {
		return target.kind === "project" ? projectGapOf(target, element, isUpper) : null;
	}

	if (target.kind === "project") {
		const landing: Landing =
			source.kind === "flow"
				? { kind: "flow", place: { folderId: null, before: null, projectId: target.projectId } }
				: { kind: "folder-to-project", projectId: target.projectId };
		const key = projectKeyOf(target.projectId);
		return { key, container: key, line: null, landing };
	}

	if (source.kind === "folder") {
		return topGapOf(source.kind, target.projectId, isUpper ? topOf(target) : target.nextTop, {
			element: blockOf(element),
			isUpper,
		});
	}

	if (target.kind === "folder") {
		return sessionOverFolderAimOf(target, element, event);
	}

	if (target.folderId === null) {
		return topGapOf(source.kind, target.projectId, isUpper ? target.top : target.nextTop, { element, isUpper });
	}

	const before = isUpper ? target.flowId : target.nextFlowId;
	return {
		key: `gap:${target.folderId}:${before ?? "end"}`,
		container: folderKeyOf(target.folderId),
		line: dropLineOf(element, isUpper),
		landing: {
			kind: "flow",
			place: {
				folderId: target.folderId,
				before,
				projectId: target.folderId === null ? target.projectId : undefined,
			},
		},
	};
}

interface GapAt {
	readonly element: Element;
	readonly isUpper: boolean;
}

function topGapOf(
	sourceKind: "flow" | "folder",
	projectId: string,
	before: TopRef | null,
	{ element, isUpper }: GapAt,
): Aim {
	const landing: Landing =
		sourceKind === "folder"
			? { kind: "folder-place", projectId, before }
			: { kind: "flow", place: placeBeforeOf(projectId, before) };
	return {
		key: `gap:${projectId}:${before === null ? "end" : `${before.kind}:${before.id}`}`,
		container: projectKeyOf(projectId),
		line: dropLineOf(element, isUpper),
		landing,
	};
}

function topOf(target: Exclude<DropTarget, { kind: "project" }>): TopRef {
	return target.kind === "folder" ? { kind: "folder", id: target.folderId } : target.top;
}

function blockOf(element: Element): Element {
	return element.closest(FOLDER_BLOCK) ?? element;
}

function sessionOverFolderAimOf(
	target: Extract<DropTarget, { kind: "folder" }>,
	element: Element,
	event: DragEvent,
): Aim {
	const box = element.getBoundingClientRect();
	const edge = box.height * FOLDER_EDGE_SHARE;
	const block = blockOf(element);

	if (event.clientY < box.top + edge) {
		return topGapOf("flow", target.projectId, topOf(target), { element: block, isUpper: true });
	}

	if (event.clientY > box.bottom - edge && !target.isOpen) {
		return topGapOf("flow", target.projectId, target.nextTop, { element: block, isUpper: false });
	}

	const key = folderKeyOf(target.folderId);
	return {
		key,
		container: key,
		line: null,
		landing: { kind: "flow", place: { folderId: target.folderId, before: null } },
	};
}

function projectGapOf(target: Extract<DropTarget, { kind: "project" }>, element: Element, isUpper: boolean): Aim {
	const beforeId = isUpper ? target.projectId : target.nextProjectId;
	return {
		key: `projects:${beforeId ?? "end"}`,
		container: null,
		line: dropLineOf(element, isUpper),
		landing: { kind: "project", beforeId },
	};
}
