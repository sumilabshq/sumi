import { z } from "zod";

export const DomProbeAskSchema = z.object({
	id: z.number().int(),
	kind: z.literal("dom"),
	action: z.enum(["inspect", "wheel", "drag", "pinch"]),
	selector: z.string().min(1).max(300),
	deltaX: z.number().default(0),
	deltaY: z.number().default(0),
	ctrlKey: z.boolean().default(false),
	scale: z.number().positive().default(1),
});

export type DomProbeAsk = z.infer<typeof DomProbeAskSchema>;

interface Box {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

const MOST_MATCHES = 5;
const MOST_ANCESTORS = 8;
const NO_MATCH = "No element in this window matches {selector}.";

export async function answerDomProbe(asked: DomProbeAsk): Promise<unknown> {
	const element = document.querySelector(asked.selector);

	if (!(element instanceof HTMLElement)) {
		throw new Error(NO_MATCH.replace("{selector}", asked.selector));
	}

	if (asked.action === "wheel") {
		element.dispatchEvent(wheelAt(element, asked));
	}

	if (asked.action === "drag") {
		await dragAcross(element, asked);
	}

	if (asked.action === "pinch") {
		await pinchOn(element, asked.scale);
	}

	await nextFrames();
	return snapshotOf(asked.selector);
}

function snapshotOf(selector: string): unknown {
	const matches = [...document.querySelectorAll(selector)].slice(0, MOST_MATCHES);
	return matches.map((match) => {
		const box = boxOf(match);
		return {
			element: labelOf(match),
			box,
			transform: match instanceof HTMLElement ? match.style.transform : "",
			style: match.getAttribute("style") ?? "",
			text: (match.textContent ?? "").trim().slice(0, 80),
			connected: match.isConnected,
			pointerEvents: getComputedStyle(match).pointerEvents,
			onTopAtCentre: ancestorsOf(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)),
		};
	});
}

function ancestorsOf(element: Element | null): readonly string[] {
	const chain: string[] = [];
	let at = element;

	while (at !== null && chain.length < MOST_ANCESTORS) {
		chain.push(labelOf(at));
		at = at.parentElement;
	}

	return chain;
}

function labelOf(element: Element): string {
	const classes = typeof element.className === "string" ? element.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
	return classes === "" ? element.tagName.toLowerCase() : `${element.tagName.toLowerCase()}.${classes}`;
}

function boxOf(element: Element): Box {
	const rect = element.getBoundingClientRect();
	return {
		x: Math.round(rect.x),
		y: Math.round(rect.y),
		width: Math.round(rect.width),
		height: Math.round(rect.height),
	};
}

function wheelAt(element: HTMLElement, asked: DomProbeAsk): WheelEvent {
	const box = boxOf(element);
	return new WheelEvent("wheel", {
		bubbles: true,
		cancelable: true,
		clientX: box.x + box.width / 2,
		clientY: box.y + box.height / 2,
		deltaX: asked.deltaX,
		deltaY: asked.deltaY,
		ctrlKey: asked.ctrlKey,
	});
}

// TRADE-OFF: a synthetic pointer cannot be captured, so capture is stubbed on the probed element for the drag
async function dragAcross(element: HTMLElement, asked: DomProbeAsk): Promise<void> {
	const box = boxOf(element);
	const start = {
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	};
	const captured = element.setPointerCapture.bind(element);
	element.setPointerCapture = () => undefined;
	const fire = (type: string, share: number): void => {
		element.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				button: 0,
				pointerId: 1,
				clientX: start.x + asked.deltaX * share,
				clientY: start.y + asked.deltaY * share,
			}),
		);
	};
	fire("pointerdown", 0);
	await nextFrames();
	fire("pointermove", 0.5);
	await nextFrames();
	fire("pointermove", 1);
	await nextFrames();
	fire("pointerup", 1);
	element.setPointerCapture = captured;
}

async function pinchOn(element: HTMLElement, scale: number): Promise<void> {
	const box = boxOf(element);
	const fire = (type: string, at: number): void => {
		const event = new Event(type, {
			bubbles: true,
			cancelable: true,
		});
		Object.defineProperties(event, {
			scale: { value: at },
			clientX: { value: box.x + box.width / 2 },
			clientY: { value: box.y + box.height / 2 },
		});
		element.dispatchEvent(event);
	};
	fire("gesturestart", 1);
	await nextFrames();
	fire("gesturechange", scale);
	await nextFrames();
	fire("gestureend", scale);
}

function nextFrames(): Promise<void> {
	return new Promise((settled) => requestAnimationFrame(() => requestAnimationFrame(() => settled())));
}
