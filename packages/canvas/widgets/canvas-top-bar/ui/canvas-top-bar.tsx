import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { COMPONENTS_PAGE } from "../../../schemas/canvas-page.schema.js";
import type { CanvasPages } from "../../../schemas/canvas-page.schema.js";
import type { ReadDesign } from "../../../schemas/design.schema.js";
import type { DrawingKit } from "../../../schemas/drawing.schema.js";
import type { CanvasTopBarPorts } from "../widget.js";
import { SaidLine } from "../../canvas-ui/said-line.js";
import { useRefusal } from "../../canvas-ui/use-refusal.js";
import { CanvasTools } from "./canvas-tools.js";
import { AgentLookChip, PageLabel, PicturesProgress, RendererToggle } from "./status-chips.js";
import { TopBar } from "./top-bar.js";
import type { CanvasTab } from "./top-bar.js";

export interface CanvasTopBarProps {
	readonly ports: CanvasTopBarPorts;
	readonly design: ReadDesign;
	readonly drawing: DrawingKit;
	readonly pages: CanvasPages;
}

const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const LAYERS_SAID = "Layers";
const PAGE_FADE_MS = 140;
const FADED_ON_TURN = "[data-canvas-layer], [data-canvas-layers='open']";

export function CanvasTopBar({ ports, design, drawing, pages }: CanvasTopBarProps): ReactElement {
	const bar = useRef<HTMLDivElement | null>(null);
	const { refusal, heard } = useRefusal();
	const viewOf = (): Element | null => bar.current?.closest("[data-canvas-view]") ?? null;
	const onPage = (page: string): void => fadedTurn(viewOf(), () => heard(ports.showPage({ page })));
	const frames = design.screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(design.screens.length)).replace("{frames}", String(frames));
	const head = (
		<div className="cv:relative cv:flex cv:items-center cv:gap-2 cv:py-1.5 cv:text-base">
			{pages.shown === COMPONENTS_PAGE ? null : (
				<IconButton
					size="s"
					variant={ports.getIsLayersOpen ? "raised" : "ghost"}
					label={LAYERS_SAID}
					onClick={() => heard(ports.toggleLayers())}
				>
					<Icon name="panel-left" size={16} />
				</IconButton>
			)}
			<b>{design.app}</b>
			<span className="cv:text-muted-foreground">{said}</span>
			<CanvasTools
				mode={ports.getMode}
				onMode={(mode) => heard(ports.setMode({ mode }))}
				onAddPhotos={(photos) => heard(ports.addPhotos({ photos: [...photos] }))}
			/>
			<PicturesProgress waiting={ports.getFramePictures.waiting} />
			<SaidLine said={refusal} />
			<AgentLookChip look={ports.getAgentLook} onPage={onPage} />
			{drawing.gpu ? (
				<RendererToggle
					renderer={ports.getRenderer}
					onRenderer={(renderer) => heard(ports.chooseRenderer({ renderer }))}
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
			onReturn={() => heard(ports.returnToView())}
			start={cornerOf(ports.start)}
			end={cornerOf(ports.end)}
			hasCorners={ports.start.length + ports.end.length > 0}
		/>
	);
}

function cornerOf(items: CanvasTopBarPorts["start"]): ReactNode {
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
