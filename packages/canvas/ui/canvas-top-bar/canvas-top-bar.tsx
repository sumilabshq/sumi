import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { COMPONENTS_PAGE } from "../../schemas/canvas-page.schema.js";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import type { DrawingKit } from "../../schemas/drawing.schema.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import type { Act, Press } from "../said-line/use-refusal.js";
import type { SlotList } from "@widgetarium/core";
import type { AgentLook } from "../../schemas/agent-look.schema.js";
import type { CanvasMode, PageRenderer } from "../../schemas/canvas-view.schema.js";
import type { FramePictures } from "../../schemas/frame-picture.schema.js";
import { CanvasTools } from "./canvas-tools.js";
import { AgentLookChip, PageLabel, PicturesProgress, RendererToggle } from "./status-chips.js";
import { TopBar } from "./top-bar.js";
import type { CanvasTab } from "./top-bar.js";

export interface CanvasTopBarProps {
	readonly getDesign: ReadDesign | null;
	readonly getDrawing: DrawingKit | null;
	readonly getPages: CanvasPages | null;
	readonly showPage: Act<{ readonly page: string }>;
	readonly getIsLayersOpen: boolean;
	readonly toggleLayers: Press;
	readonly getMode: CanvasMode;
	readonly setMode: Act<{ readonly mode: CanvasMode }>;
	readonly addPhotos: Act<{ readonly photos: File[] }>;
	readonly getRenderer: PageRenderer;
	readonly chooseRenderer: Act<{ readonly renderer: PageRenderer }>;
	readonly getFramePictures: FramePictures;
	readonly getAgentLook: AgentLook | null;
	readonly returnToView: Press;
	readonly start: SlotList;
	readonly end: SlotList;
}

const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const LAYERS_SAID = "Layers";
const PAGE_FADE_MS = 140;
const FADED_ON_TURN = "[data-canvas-layer], [data-canvas-layers='open']";

export function CanvasTopBar(props: CanvasTopBarProps): ReactElement | null {
	const bar = useRef<HTMLDivElement | null>(null);
	const { refusal, heard } = useRefusal();
	const { getDesign: design, getDrawing: drawing, getPages: pages } = props;
	if (!design || !drawing || !pages) return null;
	const viewOf = (): Element | null => bar.current?.closest("[data-canvas-view]") ?? null;
	const onPage = (page: string): void => fadedTurn(viewOf(), () => heard(props.showPage({ page })));
	const frames = design.screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(design.screens.length)).replace("{frames}", String(frames));
	const head = (
		<div className="cv:relative cv:flex cv:items-center cv:gap-2 cv:py-1.5 cv:text-base">
			{pages.shown === COMPONENTS_PAGE ? null : (
				<IconButton
					size="s"
					variant={props.getIsLayersOpen ? "raised" : "ghost"}
					label={LAYERS_SAID}
					onClick={() => heard(props.toggleLayers())}
				>
					<Icon name="panel-left" size={16} />
				</IconButton>
			)}
			<b>{design.app}</b>
			<span className="cv:text-muted-foreground">{said}</span>
			<CanvasTools
				mode={props.getMode}
				onMode={(mode) => heard(props.setMode({ mode }))}
				onAddPhotos={(photos) => heard(props.addPhotos({ photos: [...photos] }))}
			/>
			<PicturesProgress waiting={props.getFramePictures.waiting} />
			<SaidLine said={refusal} />
			<AgentLookChip look={props.getAgentLook} onPage={onPage} />
			{drawing.gpu ? (
				<RendererToggle
					renderer={props.getRenderer}
					onRenderer={(renderer) => heard(props.chooseRenderer({ renderer }))}
				/>
			) : null}
		</div>
	);
	return (
		<TopBar
			barRef={bar}
			head={head}
			leading={pages.leading.map(tabOf)}
			pages={pages.screens.map((page) => ({
				value: page,
				label: <PageLabel page={page} isRunning={page in pages.running} />,
			}))}
			trailing={pages.trailing.map(tabOf)}
			page={pages.shown}
			onPage={onPage}
			onReturn={() => heard(props.returnToView())}
			start={cornerOf(props.start)}
			end={cornerOf(props.end)}
			hasCorners={props.start.length + props.end.length > 0}
		/>
	);
}

function cornerOf(items: SlotList): ReactNode {
	if (items.length === 0) return null;
	return (
		<div className="cv:flex cv:h-[var(--wg-studio-band,50px)] cv:items-center cv:gap-parts cv:[--wg-gap-parts:8px]">
			{items.map((Item) => (
				<Item key={Item.id} />
			))}
		</div>
	);
}

function tabOf(page: string): CanvasTab {
	return { value: page, label: page };
}

function fadedTurn(view: Element | null, turn: () => void): void {
	const shown = view ? [...view.querySelectorAll<HTMLElement>(FADED_ON_TURN)] : [];
	if (shown.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return turn();
	const outs = shown.map((element) =>
		element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PAGE_FADE_MS, easing: "ease-out", fill: "forwards" }),
	);
	void Promise.all(outs.map((out) => out.finished)).then(turn);
}
