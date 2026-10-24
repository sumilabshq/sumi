import { boxed, drawn, pause } from "./behaviors-dom.ts";
import { check, waitFor } from "./check-helpers.ts";

const { createElement: h, useRef, useState } = await import("react");
const b = await import("../packages/shared/behaviors/index.ts");

const ROWS = [
	{ id: "a", depth: 0, canHold: true },
	{ id: "b", depth: 1, canHold: false },
	{ id: "c", depth: 1, canHold: false },
];
const drops: unknown[] = [];
const held: { drag: ReturnType<typeof b.useTreeDrag> | null } = { drag: null };
function DragProbe() {
	const tree = useRef<HTMLDivElement | null>(null);
	const drag = b.useTreeDrag(tree, { indent: 14, rebuilt: "one", onDrop: (drop) => void drops.push(drop) });
	held.drag = drag;
	return h(
		"div",
		{ ref: tree },
		ROWS.map((row) =>
			h("div", {
				key: row.id,
				...b.treeRowProps({ ...row, isHeld: false, scope: "" }),
				onPointerDown: (event: Parameters<typeof drag.onPointerDown>[0]) => drag.onPointerDown(event, row.id, true),
			}),
		),
	);
}
const dragHost = drawn(h(DragProbe));
await pause(20);
dragHost
	.querySelectorAll<HTMLElement>("[data-tree-row]")
	.forEach((row, at) => boxed(row, { x: 0, y: at * 26, width: 200, height: 26 }));
const pointer = (type: string, y: number): void =>
	void window.dispatchEvent(Object.assign(new window.Event(type), { clientX: 10, clientY: y }));
dragHost
	.querySelector('[data-tree-id="b"]')
	?.dispatchEvent(new window.MouseEvent("pointerdown", { button: 0, clientX: 10, clientY: 30, bubbles: true }));
pointer("pointermove", 50);
pointer("pointermove", 75);
pointer("pointerup", 75);
check(
	"useTreeDrag drops a lifted row where the pointer leaves it: b under a, after c",
	[drops, held.drag?.wasDragged()],
	[[{ dragged: "b", parent: "a", before: null }], true],
);

const told: number[] = [];
function LayersProbe() {
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	b.useMarkedLayers(node, (layers) => void told.push(layers.length));
	return h("div", { ref: setNode }, h("section", { "data-wg-node": "page.tsx#0:1", "data-name": "Header" }));
}
const layersHost = drawn(h(LayersProbe));
await waitFor(() => told.length > 0, 1500);
const more = document.createElement("section");
more.setAttribute("data-wg-node", "page.tsx#2:3");
layersHost.querySelector("section")?.after(more);
await waitFor(() => told.length > 1, 1500);
check("useMarkedLayers reads the marked layers of a node and reads them again when they change", told, [1, 2]);
