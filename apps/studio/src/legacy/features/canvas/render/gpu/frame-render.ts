import type { ReactNode } from "react";
import Reconciler from "react-reconciler";
import { ConcurrentRoot, DiscreteEventPriority } from "react-reconciler/constants.js";
import type { FrameRoot } from "./frame-root.js";
import { HOST_CONFIG, withUpdatePriority } from "./host-config.js";

export interface MountedFrame {
	render(element: ReactNode): void;
	unmount(): void;
}

const RENDERER = Reconciler(HOST_CONFIG);

export function mountFrame(frame: FrameRoot, onFailure?: (failure: Error) => void): MountedFrame {
	const report = (error: Error): void => {
		console.error("gpu canvas: a frame failed to render", error);
		onFailure?.(error);
	};
	const container = RENDERER.createContainer(
		frame,
		ConcurrentRoot,
		null,
		false,
		null,
		frame.spec.id,
		report,
		report,
		report,
		() => {},
		null,
	);
	const render = (element: ReactNode): void => {
		RENDERER.updateContainerSync(element, container, null, null);
		RENDERER.flushSyncWork();
	};
	return { render, unmount: () => render(null) };
}

export function pressInside(press: () => void): void {
	withUpdatePriority(DiscreteEventPriority, press);
}
