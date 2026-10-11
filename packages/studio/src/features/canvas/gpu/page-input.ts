import type { Viewport } from "./camera.js";
import type { PointerSink } from "./view-pointer.js";

export function viewportOf(canvas: HTMLCanvasElement): Viewport {
	return { width: canvas.clientWidth, height: canvas.clientHeight, dpr: globalThis.devicePixelRatio || 1 };
}

export function forwardInput(
	canvas: HTMLCanvasElement,
	sink: PointerSink,
	resized: (viewport: Viewport) => void,
): () => void {
	const local = (event: MouseEvent): readonly [number, number] => {
		const rect = canvas.getBoundingClientRect();
		return [event.clientX - rect.left, event.clientY - rect.top];
	};
	const onMove = (event: PointerEvent): void => sink.move(...local(event));
	const onLeave = (): void => sink.leave();
	const onDown = (event: PointerEvent): void => {
		canvas.setPointerCapture(event.pointerId);
		sink.down(...local(event), event.button);
	};
	const onUp = (event: PointerEvent): void => sink.up(...local(event));
	const onWheel = (event: WheelEvent): void => {
		event.preventDefault();
		sink.wheel(...local(event), event.deltaX, event.deltaY, event.ctrlKey || event.metaKey);
	};
	let seen = JSON.stringify(viewportOf(canvas));
	const sizes = new ResizeObserver(() => {
		const viewport = viewportOf(canvas);
		if (JSON.stringify(viewport) === seen) return;
		seen = JSON.stringify(viewport);
		resized(viewport);
	});
	canvas.addEventListener("pointermove", onMove);
	canvas.addEventListener("pointerleave", onLeave);
	canvas.addEventListener("pointerdown", onDown);
	canvas.addEventListener("pointerup", onUp);
	canvas.addEventListener("wheel", onWheel, { passive: false });
	sizes.observe(canvas);
	return () => {
		sizes.disconnect();
		canvas.removeEventListener("pointermove", onMove);
		canvas.removeEventListener("pointerleave", onLeave);
		canvas.removeEventListener("pointerdown", onDown);
		canvas.removeEventListener("pointerup", onUp);
		canvas.removeEventListener("wheel", onWheel);
	};
}
