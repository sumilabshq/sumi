import type { DroppedFile, FileDragEvent } from "@widgetarium/assistant";
import { isObject } from "@widgetarium/framework/is-object";
import type { AssistantBridge, DroppedEntry } from "./assistant-bridge.js";

export interface DragPoint {
	readonly x: number;
	readonly y: number;
}

export interface DragRect {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

export interface WebviewDragSource {
	onDragDropEvent(handler: (event: { readonly payload: unknown }) => void): Promise<() => void>;
}

export interface ChatSpot {
	rect(): DragRect | null;
	scale(): number;
}

export type DragStep =
	{ readonly kind: "enter" | "over" | "leave" } | { readonly kind: "drop"; readonly paths: readonly string[] };

type DropReach = Pick<AssistantBridge, "dropPaths" | "readDropped">;

const LEAVE = { kind: "leave" } as const;

export function isInside(rect: DragRect | null, at: DragPoint): boolean {
	return rect !== null && at.x >= rect.left && at.x <= rect.right && at.y >= rect.top && at.y <= rect.bottom;
}

export function cssPointOf(held: unknown, scale: number): DragPoint | null {
	if (!isObject(held) || typeof held["x"] !== "number" || typeof held["y"] !== "number" || scale <= 0) {
		return null;
	}

	return {
		x: held["x"] / scale,
		y: held["y"] / scale,
	};
}

export function dragStepOf(payload: unknown, spot: ChatSpot): DragStep | null {
	if (!isObject(payload)) {
		return null;
	}

	const { type } = payload;

	if (type === "leave") {
		return LEAVE;
	}

	const at = cssPointOf(payload["position"], spot.scale());

	if (at === null || !isInside(spot.rect(), at)) {
		return LEAVE;
	}

	if (type === "enter" || type === "over") {
		return { kind: type };
	}

	const paths = payload["paths"];

	if (type !== "drop" || !Array.isArray(paths)) {
		return null;
	}

	return {
		kind: "drop",
		paths: paths.filter((path) => typeof path === "string"),
	};
}

export async function droppedEventOf(paths: readonly string[], bridge: DropReach): Promise<FileDragEvent> {
	if (paths.length === 0) {
		return LEAVE;
	}

	const entries = await bridge.dropPaths(paths);
	return {
		kind: "drop",
		files: entries.filter(({ kind }) => kind === "file").map((entry) => droppedFileOf(entry, bridge)),
		folders: entries.filter(({ kind }) => kind === "folder").map(({ path }) => path),
	};
}

export class TauriFileDrops {
	constructor(
		private readonly source: WebviewDragSource,
		private readonly spot: ChatSpot,
		private readonly bridge: DropReach,
	) {}

	fileDragged(heard: (event: FileDragEvent) => void): () => void {
		const held: { stop: (() => void) | null; isStopped: boolean } = {
			stop: null,
			isStopped: false,
		};
		const listening = this.source.onDragDropEvent(({ payload }) => void this.hearOne(payload, heard));
		void listening.then(
			(stop) => {
				if (held.isStopped) {
					stop();
					return;
				}

				held.stop = stop;
			},
			(failure: unknown) => console.error("[widgetarium] file drops are not heard", failure),
		);
		return () => {
			held.isStopped = true;
			held.stop?.();
		};
	}

	private async hearOne(payload: unknown, heard: (event: FileDragEvent) => void): Promise<void> {
		const step = dragStepOf(payload, this.spot);

		if (step === null) {
			return;
		}

		if (step.kind !== "drop") {
			heard(step);
			return;
		}

		try {
			heard(await droppedEventOf(step.paths, this.bridge));
		} catch (failure: unknown) {
			console.error("[widgetarium] dropped files could not be read", failure);
			heard(LEAVE);
		}
	}
}

function droppedFileOf({ path, name, size }: DroppedEntry, bridge: DropReach): DroppedFile {
	return {
		name,
		size,
		file: async () => new File([await bridge.readDropped(path)], name),
	};
}
