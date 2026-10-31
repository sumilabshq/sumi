import { dom, layBehaviorGlobals } from "./behaviors-dom.ts";
import { LayoutMotion } from "../apps/studio/src/features/app-host/lib/layout-motion/layout-motion.ts";
import { sightOf } from "../apps/studio/src/features/app-host/lib/layout-motion/layout-sight.ts";
import { tabRefOf } from "../apps/studio/src/features/app-host/lib/tabs-sidebar/pointed-of.ts";
import { check, tally } from "./check-helpers.ts";

layBehaviorGlobals();

const TWINNED = `
	<div data-tabs-list="pinned" data-tabs-in="pinned">
		<div data-tabs-item="tab" data-tabs-id="p1"></div>
		<div data-tabs-item="tab" data-tabs-id="m2"></div>
	</div>
	<div data-tabs-list="workspace" data-tabs-in="workspace">
		<div data-tabs-split="s3">
			<div data-split-members>
				<div data-tabs-item="tab" data-tabs-id="m1"></div>
				<div data-tabs-lifted-holder><div data-tabs-item="tab" data-tabs-id="m2"></div></div>
			</div>
		</div>
	</div>`;

function holderOf(html: string): HTMLElement {
	const holder = document.createElement("div");
	holder.innerHTML = html;
	document.body.replaceChildren(holder);
	return holder;
}

function rowIn(holder: HTMLElement, place: string, id: string): HTMLElement {
	const row = holder.querySelector<HTMLElement>(`${place} [data-tabs-id="${id}"]`);

	if (row === null) {
		throw new Error(`no row ${id} in ${place}`);
	}

	return row;
}

function standAt(element: HTMLElement, top: number): void {
	Reflect.set(element, "getBoundingClientRect", () => ({
		left: 0,
		top,
		height: 20,
	}));
}

function glidesOf(holder: HTMLElement, standing: () => void, change: () => void): readonly string[] {
	const glides: string[] = [];
	Reflect.set(window, "matchMedia", () => ({ matches: false }));
	Reflect.set(dom.window.HTMLElement.prototype, "animate", function (this: HTMLElement, keyframes: Keyframe[]) {
		glides.push(`${this.dataset["tabsId"] ?? ""} ${String(keyframes[0]?.["transform"] ?? "")}`);
		return {
			cancel: () => undefined,
		};
	});
	standing();
	const before = sightOf(holder);
	change();
	new LayoutMotion().glide(before, sightOf(holder));
	return glides;
}

const twinned = holderOf(TWINNED);
check(
	"a row standing twice is keyed by its place, a row standing once by its id alone",
	[...sightOf(twinned).keys()],
	["p1||||", "list:pinned>m2||||", "||s3||", "m1||||", "split:s3>m2||||"],
);
check(
	"a split member drawn inside a lifted holder still names its split",
	tabRefOf(rowIn(twinned, "[data-tabs-split]", "m2"), "m2").splitId,
	"s3",
);

const member = rowIn(twinned, "[data-tabs-split]", "m2");
const glides = glidesOf(
	twinned,
	() => {
		standAt(rowIn(twinned, "[data-tabs-list=pinned]", "m2"), 10);
		standAt(member, 100);
	},
	() => {
		rowIn(twinned, "[data-tabs-list=pinned]", "m2").remove();
		standAt(member, 40);
	},
);
check(
	"when its Pinned copy goes, the split's copy glides from its own place, not from the copy's",
	glides.filter((glide) => glide.startsWith("m2")),
	["m2 translate(0px, 60px)"],
);

console.log(
	tally.failed ? `tabs sidebar keys: ${tally.failed} check(s) failed` : "tabs sidebar keys: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
