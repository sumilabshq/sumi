import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { FlowActs, FlowPlace } from "./use-flow-acts.js";

export type DropTarget =
	| { readonly kind: "flow"; readonly flowId: string; readonly folderId: string | null }
	| { readonly kind: "folder"; readonly folderId: string }
	| { readonly kind: "loose" };

export interface FlowDrag {
	readonly overKey: string | null;
	sourceProps(flowId: string): SourceProps;
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

export function useFlowDrag(move: FlowActs["move"]): FlowDrag {
	const draggingId = useRef<string | null>(null);
	const [overKey, setOverKey] = useState<string | null>(null);
	const reset = (): void => {
		draggingId.current = null;
		setOverKey(null);
	};
	return {
		overKey,
		sourceProps: (flowId) => ({
			draggable: true,
			onDragStart: (event) => {
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", flowId);
				draggingId.current = flowId;
			},
			onDragEnd: reset,
		}),
		targetProps: (target) => ({
			onDragOver: (event) => {
				if (draggingId.current !== null) {
					event.preventDefault();
					event.stopPropagation();
					setOverKey(dropKeyOf(target));
				}
			},
			onDrop: (event) => {
				event.preventDefault();
				event.stopPropagation();

				const dragged = draggingId.current;

				if (dragged !== null && !isDraggedFlow(target, dragged)) {
					move(dragged, placeOf(target));
				}

				reset();
			},
		}),
	};
}

export function dropKeyOf(target: DropTarget): string {
	if (target.kind === "flow") {
		return `flow:${target.flowId}`;
	}

	return target.kind === "folder" ? `folder:${target.folderId}` : "loose";
}

function isDraggedFlow(target: DropTarget, draggingId: string): boolean {
	return target.kind === "flow" && target.flowId === draggingId;
}

function placeOf(target: DropTarget): FlowPlace {
	if (target.kind === "flow") {
		return { folderId: target.folderId, before: target.flowId };
	}

	return { folderId: target.kind === "folder" ? target.folderId : null, before: null };
}
