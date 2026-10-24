import { Profiler, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { IsTooltipHosted, TooltipHost, tooltipMarks } from "../packages/shared/kit/src/index.js";
import { HeaderButton } from "../apps/studio/src/features/plate/ui/plate-header/header-button.js";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const commits = {
	targets: 0,
	tip: 0,
};
Reflect.set(window, "__TIP_COMMITS__", commits);

const shownAfter = {
	pointedAt: 0,
	openedAt: 0,
};
Reflect.set(window, "__TIP_SHOWN_AFTER__", shownAfter);
document.addEventListener(
	"pointerover",
	(event) => {
		if (event.target instanceof Element && event.target.closest("[data-tip-said]")) {
			shownAfter.pointedAt = performance.now();
		}
	},
	true,
);
new MutationObserver(() => {
	if (
		document.querySelector('[data-tip-bubble][data-phase="open"]') !== null &&
		shownAfter.openedAt < shownAfter.pointedAt
	) {
		shownAfter.openedAt = performance.now();
	}
}).observe(document.body, {
	subtree: true,
	attributes: true,
	attributeFilter: ["data-phase"],
});

if (new URLSearchParams(location.search).get("theme") === "dark") {
	document.documentElement.classList.add("dark");
}

const ROW_STYLE = {
	position: "absolute",
	left: "120px",
	top: "220px",
	display: "flex",
	gap: "2px",
} as const;
const FOOT_STYLE = {
	position: "absolute",
	left: "80px",
	bottom: "8px",
	display: "flex",
	gap: "2px",
} as const;

const root = document.getElementById("root");
if (root === null) {
	throw new Error("the page holds no #root");
}

createRoot(root).render(
	<IsTooltipHosted.Provider value={true}>
		<Profiler
			id="targets"
			onRender={() => {
				commits.targets += 1;
			}}
		>
			<div className="wg-plate-head" style={ROW_STYLE} data-tip-row="">
				<HeaderButton label="Hide chats" icon="panel-left" data-at="a" />
				<HeaderButton label="Open a new chat with everything" icon="square-pen" data-at="b" />
				<HeaderButton label="Share" icon="share" data-at="c" />
				<button type="button" data-at="d" {...tooltipMarks({ said: "Search", keys: "⌘K", side: "bottom" })}>
					Find
				</button>
			</div>
			<div style={FOOT_STYLE}>
				<button
					type="button"
					data-at="foot"
					{...tooltipMarks({ said: "Urcraft", keys: "⌘3", side: "top", align: "start" })}
				>
					U
				</button>
			</div>
		</Profiler>
		<Profiler
			id="tip"
			onRender={() => {
				commits.tip += 1;
			}}
		>
			<TooltipHost />
		</Profiler>
	</IsTooltipHosted.Provider>,
);
