const PAN_PX = 18;
const ZOOM_DELTA = 6;
const ZOOM_EVERY = 5;

export async function benchedPan(steps: number): Promise<number> {
	const field = document.querySelector(".wg-design-field");
	if (!field) return 0;
	const box = field.getBoundingClientRect();
	for (let step = 0; step < steps; step += 1) {
		const phase = (step / steps) * Math.PI * 2;
		const zooms = step % ZOOM_EVERY === 0;
		const deltaY = zooms ? Math.sin(phase) * ZOOM_DELTA : Math.cos(phase) * PAN_PX;
		const at = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
		field.dispatchEvent(
			new WheelEvent("wheel", { ...at, deltaX: Math.sin(phase) * PAN_PX, deltaY, ctrlKey: zooms, cancelable: true }),
		);
		await nextFrame();
	}
	await nextFrame();
	return steps;
}

function nextFrame(): Promise<number> {
	return new Promise((drawn) => requestAnimationFrame(drawn));
}

const PINCH_RATE = 0.012;
const PINCH_STEP_MAX = 29;
const SETTLE_TRIES = 80;
const AT_LEFT_PX = 40;
const AT_TOP_PX = 90;

export async function lookedAtFrame(index: number, scale: number): Promise<number> {
	const field = document.querySelector(".wg-design-field");
	const layer = document.querySelector<HTMLElement>(".wg-design-layer");
	if (!field || !layer) return 0;
	const box = field.getBoundingClientRect();
	const centre = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
	for (let tries = 0; tries < SETTLE_TRIES && Math.abs(scaleOf(layer) / scale - 1) > 0.005; tries += 1) {
		const wanted = -Math.log(scale / scaleOf(layer)) / PINCH_RATE;
		const deltaY = Math.max(-PINCH_STEP_MAX, Math.min(PINCH_STEP_MAX, wanted));
		field.dispatchEvent(new WheelEvent("wheel", { ...centre, deltaY, ctrlKey: true, cancelable: true }));
		await nextFrame();
		await nextFrame();
	}
	const frame = document.querySelectorAll(".wg-design-frame")[index]?.getBoundingClientRect();
	if (!frame) return scaleOf(layer);
	const deltaX = frame.left - (box.left + AT_LEFT_PX);
	const deltaY = frame.top - (box.top + AT_TOP_PX);
	field.dispatchEvent(new WheelEvent("wheel", { ...centre, deltaX, deltaY, cancelable: true }));
	await nextFrame();
	await nextFrame();
	return scaleOf(layer);
}

function scaleOf(layer: HTMLElement): number {
	const scale = /scale\(([\d.]+)\)/.exec(layer.style.transform)?.[1];
	return scale === undefined ? 1 : Number(scale);
}
