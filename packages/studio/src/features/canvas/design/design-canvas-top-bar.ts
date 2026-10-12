import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { COMPONENTS_PAGE, canvasTabsOf, shownPageOf } from "./design-canvas-page.js";
import type { DesignCanvasProps } from "./design-canvas.js";
import { pageLabelOf } from "./design-job.js";
import { CanvasTools } from "./design-tools.js";
import { PicturesProgress } from "./design-pictures-progress.js";
import { AgentLookChip } from "./design-agent-look.js";
import { TopBar } from "./design-top-bar.js";
import type { CanvasTab, TopBarCorners } from "./design-top-bar.js";
import { PageRendererToggle } from "./page-renderer-toggle.js";

const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const LAYERS_SAID = "Layers";
const PAGE_FADE_MS = 140;
const FADED_ON_TURN = ".wg-design-layer, .wg-design-layers.is-open";

export interface CanvasTopBarProps extends DesignCanvasProps {
	readonly fieldOf: () => HTMLElement | null;
	readonly corners?: TopBarCorners | undefined;
}

export function CanvasTopBar(props: CanvasTopBarProps): ReactElement {
	const page = shownPageOf(props.page, props);
	const onPage = (next: string): void => fadedTurn(props.fieldOf(), () => props.onPage(next));
	return topBarOf({ ...props, onPage }, page);
}

function topBarOf(
	{
		app,
		screens,
		references,
		jobs,
		docs,
		keptPage,
		onPage,
		onAddPhotos,
		mode,
		onMode,
		onReturn,
		isLayersOpen,
		onLayers,
		corners,
	}: CanvasTopBarProps,
	page: string,
): ReactElement {
	const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames));
	const status = [
		h(PicturesProgress, { key: "pictures" }),
		h(AgentLookChip, { key: "agent", app, onPage }),
		h(PageRendererToggle, { key: "renderer" }),
	];
	const tabs = canvasTabsOf({ screens, references, jobs, docs, keptPage });
	const layers =
		page === COMPONENTS_PAGE
			? null
			: h(
					IconButton,
					{
						key: "layers",
						size: "s",
						variant: isLayersOpen ? "raised" : "ghost",
						label: LAYERS_SAID,
						onClick: onLayers,
					},
					h(Icon, { name: "panel-left", size: 16 }),
				);
	return h(TopBar, {
		key: "top",
		app,
		said,
		leading: tabs.leading.map(tabOf),
		pages: tabs.screens.map((one) => ({ value: one, label: pageLabelOf(one, jobs) })),
		trailing: tabs.trailing.map(tabOf),
		page,
		onPage,
		canvasTools: h(CanvasTools, { key: "canvas-tools", mode, onMode, onAddPhotos }),
		onReturn,
		status,
		layers,
		corners,
	});
}

function tabOf(page: string): CanvasTab {
	return { value: page, label: page };
}

function fadedTurn(field: HTMLElement | null, turn: () => void): void {
	const shown = field ? [...field.querySelectorAll<HTMLElement>(FADED_ON_TURN)] : [];
	if (shown.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return turn();
	const outs = shown.map((element) =>
		element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PAGE_FADE_MS, easing: "ease-out", fill: "forwards" }),
	);
	void Promise.all(outs.map((out) => out.finished)).then(turn);
}
