import { boxed, drawn, pause, redrawable } from "./behaviors-dom.ts";
import { check, waitFor } from "./mediator-check.ts";

const { createElement: h, useRef } = await import("react");
const b = await import("../packages/behaviors/index.ts");

const MARKS = { frame: "data-frame", screen: "data-screen", liveScreen: "data-live", chrome: "[data-chrome]" };
const ROOM = { top: 0, margin: 0, least: 0.5, most: 1, view: "[data-view]", coveredBy: "[data-cover]" };
const kept: unknown[] = [];
const seen: { pan: ReturnType<typeof b.usePanZoom> | null; hovered: unknown } = { pan: null, hovered: null };
const picks: unknown[] = [];
const resolved: unknown[] = [];
const flown = { done: 0 };

function StageProbe({ flyTo, asked }: { flyTo: string | null; asked: { widget: string; mark: string } | null }) {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const grips = { isHand: true, pressable: "button", ownScroll: null };
	const pan = b.usePanZoom({ layerRef, fieldRef }, grips, { camera: null, onKept: (look) => void kept.push(look) });
	seen.pan = pan;
	const pointing = { marks: MARKS, scaleNow: () => 1, picked: null, onPick: (pick: unknown) => void picks.push(pick) };
	const pointed = b.usePointedLayer(layerRef, pointing);
	seen.hovered = pointed.hovered;
	b.useResolvedSpot(layerRef, {
		pan,
		marks: MARKS,
		room: ROOM,
		asked,
		onResolved: (spot) => void resolved.push(spot.mark),
	});
	b.useFlyToElement({ pan, layerRef, selector: flyTo, room: ROOM, onDone: () => (flown.done += 1) });
	return h(
		"div",
		{ "data-view": "", ref: pan.fieldRef, ...pointed.handlers, "data-field": "" },
		h(
			"div",
			{ ref: layerRef, "data-layer": "" },
			h(
				"div",
				{ "data-frame": "w" },
				h("div", { "data-screen": "" }, h("div", { "data-wg-node": "m1", "data-target": "" })),
			),
		),
	);
}

const stageHost = document.body;
const redraw = redrawable(h(StageProbe, { flyTo: "[data-target]", asked: null }));
await pause(20);
const field = stageHost.querySelector<HTMLElement>("[data-field]");
const layer = stageHost.querySelector<HTMLElement>("[data-layer]");
for (const element of [field, layer, ...stageHost.querySelectorAll("[data-screen], [data-wg-node]")])
	if (element) boxed(element, { x: 0, y: 0, width: 400, height: 300 });
await waitFor(() => flown.done > 0, 1500);
check("useFlyToElement flies to the element it names and says when it is done", flown.done > 0, true);
field?.dispatchEvent(
	new window.WheelEvent("wheel", { deltaX: 40, deltaY: 0, clientX: 10, clientY: 10, cancelable: true }),
);
await waitFor(() => kept.length > 0, 1500);
check(
	"usePanZoom moves the layer on a wheel and keeps the camera once it settles",
	[Boolean(layer?.style.transform), kept.length > 0],
	[true, true],
);
field?.dispatchEvent(new window.MouseEvent("mousemove", { clientX: 200, clientY: 150, bubbles: true }));
field?.dispatchEvent(new window.MouseEvent("click", { clientX: 200, clientY: 150, bubbles: true }));
await waitFor(() => picks.length > 0, 1000);
check(
	"usePointedLayer picks the marked layer under the pointer, inside the frame under it",
	Reflect.get(Object(picks[0]), "mark"),
	"m1",
);
redraw(h(StageProbe, { flyTo: null, asked: { widget: "w", mark: "m1" } }));
await waitFor(() => resolved.length > 0, 1000);
check("useResolvedSpot finds a picked mark on the canvas and hands its spot back", resolved.includes("m1"), true);

const callouts = [{ at: [0.1, 0.2] as const }, { at: [0.9, 0.8] as const }];
const laidSeen: { laid: ReturnType<typeof b.useLaidCallouts> } = { laid: null };
function CalloutProbe() {
	const body = useRef<HTMLDivElement | null>(null);
	laidSeen.laid = b.useLaidCallouts(body, callouts);
	return h(
		"div",
		{ ref: body },
		h("div", { [b.CALLOUT_COLUMN]: "left" }, h("div", { [b.CALLOUT]: 0 })),
		h("img", {
			ref: (node: HTMLImageElement | null) => node && boxed(node, { x: 300, y: 0, width: 400, height: 500 }),
		}),
		h("div", { [b.CALLOUT_COLUMN]: "right" }, h("div", { [b.CALLOUT]: 1 })),
	);
}
drawn(h(CalloutProbe));
await waitFor(() => laidSeen.laid !== null, 1000);
check(
	"useLaidCallouts sets each callout on the side its point is nearer and draws a line to it",
	[laidSeen.laid?.placed.map((place) => place.side), laidSeen.laid?.lines.length],
	[["left", "right"], 2],
);
