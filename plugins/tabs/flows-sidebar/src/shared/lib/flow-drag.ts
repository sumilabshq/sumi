import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { usePeekHold } from "./peek-hold.js";
import type { FlowActs, FlowPlace } from "./use-flow-acts.js";

export type DragSource =
	| { readonly kind: "flow"; readonly id: string }
	| { readonly kind: "folder"; readonly id: string }
	| { readonly kind: "project"; readonly id: string };

export type DropTarget =
	| { readonly kind: "flow"; readonly flowId: string; readonly folderId: string | null; readonly projectId: string }
	| { readonly kind: "folder"; readonly folderId: string }
	| { readonly kind: "project"; readonly projectId: string; readonly nextProjectId: string | null };

export interface ProjectLine {
	readonly beforeId: string | null;
}

export type DragActs = Pick<FlowActs, "move" | "moveFolderToProject" | "reorderProject">;

export interface FlowDrag {
	readonly overKey: string | null;
	readonly draggingKey: string | null;
	readonly projectLine: ProjectLine | null;
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
	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const [overKey, setOverKey] = useState<string | null>(null);
	const [projectLine, setProjectLine] = useState<ProjectLine | null>(null);
	usePeekHold(draggingKey !== null);
	const reset = (): void => {
		dragging.current = null;
		setDraggingKey(null);
		setOverKey(null);
		setProjectLine(null);
	};
	const drop = (source: DragSource, target: DropTarget, event: DragEvent): void => {
		if (source.kind === "folder" && target.kind === "project") {
			acts.moveFolderToProject(source.id, target.projectId);
		}

		if (source.kind === "flow" && !isDraggedFlow(target, source.id)) {
			acts.move(source.id, placeOf(target));
		}

		if (source.kind === "project" && target.kind === "project") {
			const { beforeId } = lineOf(event, target);

			if (beforeId !== source.id) {
				acts.reorderProject(source.id, beforeId);
			}
		}
	};
	return {
		overKey,
		draggingKey,
		projectLine,
		sourceProps: (source) => ({
			draggable: true,
			onDragStart: (event) => {
				event.stopPropagation();
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", source.id);
				dragging.current = source;
				setDraggingKey(dragKeyOf(source));
			},
			onDragEnd: reset,
		}),
		targetProps: (target) => ({
			onDragOver: (event) => {
				const source = dragging.current;

				if (source === null || !accepts(source, target)) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();

				if (source.kind === "project" && target.kind === "project") {
					setOverKey(null);
					setProjectLine(lineOf(event, target));
					return;
				}

				setProjectLine(null);
				setOverKey(dropKeyOf(target));
			},
			onDrop: (event) => {
				const source = dragging.current;

				if (source === null || !accepts(source, target)) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
				drop(source, target, event);
				reset();
			},
		}),
	};
}

export function dragKeyOf(source: DragSource): string {
	return `${source.kind}:${source.id}`;
}

export function dropKeyOf(target: DropTarget): string {
	if (target.kind === "flow") {
		return `flow:${target.flowId}`;
	}

	return target.kind === "folder" ? `folder:${target.folderId}` : `project:${target.projectId}`;
}

function accepts(source: DragSource, target: DropTarget): boolean {
	return source.kind === "flow" || target.kind === "project";
}

function isDraggedFlow(target: DropTarget, draggingId: string): boolean {
	return target.kind === "flow" && target.flowId === draggingId;
}

function lineOf(event: DragEvent, target: Extract<DropTarget, { kind: "project" }>): ProjectLine {
	const box = event.currentTarget.getBoundingClientRect();
	const isUpperHalf = event.clientY < box.top + box.height / 2;
	return { beforeId: isUpperHalf ? target.projectId : target.nextProjectId };
}

function placeOf(target: DropTarget): FlowPlace {
	if (target.kind === "flow") {
		return {
			folderId: target.folderId,
			before: target.flowId,
			projectId: target.folderId === null ? target.projectId : undefined,
		};
	}

	if (target.kind === "folder") {
		return { folderId: target.folderId, before: null };
	}

	return { folderId: null, before: null, projectId: target.projectId };
}
