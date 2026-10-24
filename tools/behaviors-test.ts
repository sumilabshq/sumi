import { drawn, layBehaviorGlobals, pause } from "./behaviors-dom.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

layBehaviorGlobals();
const { createElement: h, useRef } = await import("react");
const b = await import("../packages/shared/behaviors/index.ts");

function EscapeProbe({ isActive, onEscape }: { isActive: boolean; onEscape: () => void }) {
	b.useEscape(isActive, onEscape);
	return null;
}
const escapes = { on: 0, off: 0 };
drawn(h(EscapeProbe, { isActive: true, onEscape: () => (escapes.on += 1) }));
drawn(h(EscapeProbe, { isActive: false, onEscape: () => (escapes.off += 1) }));
await pause(200);
window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
check("useEscape answers Escape only, and only while active", escapes, { on: 1, off: 0 });

const picture = new File(["x"], "a.png", { type: "image/png" });
const text = new File(["x"], "a.txt", { type: "text/plain" });
const dropped: string[][] = [];
function DropProbe() {
	const anchor = useRef<HTMLSpanElement | null>(null);
	b.useDroppedFiles(anchor, {
		scope: "[data-drop-scope]",
		typePrefix: "image/",
		onFiles: (files) => void dropped.push(files.map((one) => one.name)),
	});
	return h("div", { "data-drop-scope": "" }, h("span", { ref: anchor }));
}
const dropHost = drawn(h(DropProbe));
await pause(20);
const drop = new Event("drop", { cancelable: true });
Object.defineProperty(drop, "dataTransfer", { value: { files: [picture, text] } });
dropHost.querySelector("[data-drop-scope]")?.dispatchEvent(drop);
check(
	"useDroppedFiles hands over the dropped files of the asked type, on the scope it names",
	[dropped, drop.defaultPrevented],
	[[["a.png"]], true],
);

const pasted: string[][] = [];
function PasteProbe() {
	b.usePastedFiles("image/", (files) => void pasted.push(files.map((one) => one.name)));
	return null;
}
drawn(h(PasteProbe));
await pause(20);
const paste = new Event("paste");
Object.defineProperty(paste, "clipboardData", { value: { files: [text] } });
document.dispatchEvent(paste);
const pasteImage = new Event("paste");
Object.defineProperty(pasteImage, "clipboardData", { value: { files: [picture] } });
document.dispatchEvent(pasteImage);
check("usePastedFiles hands over pasted files of the asked type and ignores the rest", pasted, [["a.png"]]);

const scrolled: unknown[] = [];
const revealed = { reveal: (_depth: number): void => undefined };
function ScrollProbe({ picked }: { picked: string | null }) {
	const scroller = useRef<HTMLDivElement | null>(null);
	revealed.reveal = b.useTreeScroll(scroller, { indent: 14, picked, isShown: true }).revealDepth;
	return h(
		"div",
		{
			ref: (node: HTMLDivElement | null) => {
				scroller.current = node;
				if (node) Object.assign(node, { scrollTo: (to: unknown) => scrolled.push(to) });
			},
		},
		h("div", { ...b.treeRowProps({ id: "m", depth: 3, canHold: true, isHeld: false, scope: "" }), "data-picked": "" }),
	);
}
drawn(h(ScrollProbe, { picked: "m" }));
await waitFor(() => scrolled.length > 0, 1000);
revealed.reveal(4);
check(
	"useTreeScroll scrolls the picked row into view by its depth, and reveals a hovered depth",
	scrolled.map((to) => Reflect.get(Object(to), "left")),
	[28, 42],
);

await import("./behaviors-tree-checks.ts");
await import("./behaviors-stage-checks.ts");
console.log(tally.failed ? `behaviors: ${tally.failed} check(s) failed` : "behaviors: all checks passed");
process.exit(tally.failed ? 1 : 0);
