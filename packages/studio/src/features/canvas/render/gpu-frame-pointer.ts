import type { GpuCanvas } from "./gpu/index.js";

export function forwardFramePointer(node: HTMLElement, gpu: GpuCanvas): () => void {
	const canvasOf = (): Element | null => node.closest(".wg-design-field")?.querySelector(".wg-design-gpu") ?? null;
	const local = (event: PointerEvent): readonly [number, number] => {
		const box = canvasOf()?.getBoundingClientRect();
		return [event.clientX - (box?.left ?? 0), event.clientY - (box?.top ?? 0)];
	};
	const onMove = (event: PointerEvent): void => gpu.pointer.move(...local(event));
	const onLeave = (): void => gpu.pointer.leave();
	const onDown = (event: PointerEvent): void => {
		const [x, y] = local(event);
		if (!gpu.isPressableAt(x, y)) return;
		event.stopPropagation();
		gpu.pointer.down(x, y, event.button);
	};
	const onUp = (event: PointerEvent): void => gpu.pointer.up(...local(event));
	node.addEventListener("pointermove", onMove);
	node.addEventListener("pointerleave", onLeave);
	node.addEventListener("pointerdown", onDown);
	node.addEventListener("pointerup", onUp);
	return () => {
		node.removeEventListener("pointermove", onMove);
		node.removeEventListener("pointerleave", onLeave);
		node.removeEventListener("pointerdown", onDown);
		node.removeEventListener("pointerup", onUp);
	};
}
