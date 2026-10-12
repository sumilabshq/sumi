import { FRAME_GAP_PX } from "./frame-titles.js";
import type { FrameRoot } from "./frame-root.js";

export function arrangeFrames(all: readonly FrameRoot[]): void {
	for (const frame of all) frame.update();
	const frames = all.filter((frame) => !frame.spec.at);
	const columns = Math.max(1, Math.ceil(Math.sqrt(frames.length * 1.6)));
	let y = 0;
	for (let start = 0; start < frames.length; start += columns) {
		const row = frames.slice(start, start + columns);
		let x = 0;
		for (const frame of row) {
			frame.x = x;
			frame.y = y;
			x += frame.width + FRAME_GAP_PX;
		}
		y += Math.max(...row.map((frame) => frame.height)) + FRAME_GAP_PX;
	}
}
