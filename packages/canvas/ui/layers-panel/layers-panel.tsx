import { Fragment, createElement as h, useCallback, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import type { CanvasMode } from "../../schemas/canvas-view.schema.js";
import type { DrawnScreen, ReadDesign } from "../../schemas/design.schema.js";
import type { Drawing, DrawingKit } from "../../schemas/drawing.schema.js";
import type { Selection } from "../../schemas/selection.schema.js";
import type { Act, Answer } from "../said-line/use-refusal.js";
import { useLayerDrag } from "./hooks/use-layer-drag.js";
import { useLayersOf } from "./hooks/use-layers-of.js";
import { useScrolledToPicked } from "./hooks/use-scrolled-to-picked.js";
import { useShownForAWhile } from "../shown-for-a-while/use-shown-for-a-while.js";
import { ancestorsOf, parentsOf } from "../layers/hits.js";
import type { Projection } from "./lib/layer-drag.js";
import type { Layer } from "../layers/layer-tree.js";
import { INDENT_PX, LayerRow } from "./layer-row.js";
import { LiveCopy } from "./live-copy.js";

export interface LayerDropped {
	readonly widget: string;
	readonly dragged: string;
	readonly parent: string;
	readonly before: string | null;
}

export interface LayersPanelProps extends Pick<Drawing, "registry"> {
	readonly screen: DrawnScreen;
	readonly isOpen: boolean;
	readonly keepsLiveCopy: boolean;
	readonly picked: string | null;
	readonly onDrop: (dropped: LayerDropped) => Promise<string | null>;
	readonly onPick: (widget: string, mark: string | null) => Promise<string | null>;
}

export interface LayersPanelViewProps {
	readonly getDesign: ReadDesign | null;
	readonly getDrawing: DrawingKit | null;
	readonly getPages: CanvasPages | null;
	readonly getIsLayersOpen: boolean;
	readonly getMode: CanvasMode;
	readonly getSelection: Selection | null;
	readonly select: Act<{ readonly selection: Selection | null }>;
	readonly moveLayer: Act<LayerDropped>;
}

const TITLE = "Layers";
const LOCKED = "Layout locked: only widgets move";
const UNLOCKED = "Layout unlocked: groups move too";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so it has no layers to show.";
const PANEL =
	"cv:absolute cv:inset-y-0 cv:left-0 cv:z-[1] cv:flex cv:w-[260px] cv:cursor-default cv:flex-col cv:pt-[84px] cv:pr-2 cv:pb-4 cv:pl-2.5 cv:transition-[opacity,visibility] cv:duration-200 cv:ease-standard cv:motion-reduce:transition-none cv:before:absolute cv:before:inset-0 cv:before:-z-[1] cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_right,black_70%,transparent)]";
const SAID = "cv:mx-1.5 cv:my-1 cv:text-sm cv:text-muted-foreground";

export function LayersPanel({
	screen,
	isOpen,
	keepsLiveCopy,
	registry,
	picked,
	onDrop,
	onPick: onPicked,
}: LayersPanelProps): ReactElement {
	const [isLocked, setLocked] = useState(true);
	const [refusal, setRefusal] = useShownForAWhile();
	const [live, setLive] = useState<HTMLDivElement | null>(null);
	const scroller = useRef<HTMLDivElement | null>(null);
	const picture = screen.states[0]?.picture;
	const seen = useLayersOf(live, picture?.widget ?? screen.name);
	const layers = titledLayers(seen ?? [], registry);
	const isShown = isOpen && (seen !== null || !picture);
	const onPick = (mark: string): void => {
		if (picture) void onPicked(picture.widget, mark === picked ? null : mark).then(setRefusal);
	};
	const opened = useMemo(() => ancestorsOf(parentsOf(seen ?? []), picked), [seen, picked]);
	useScrolledToPicked(scroller, picked, isShown, INDENT_PX);
	const onHover = useCallback((depth: number) => {
		scroller.current?.scrollTo({ left: Math.max(0, depth - 1) * INDENT_PX, behavior: "smooth" });
	}, []);
	const onDropped = (dragged: string, { parent, before }: Projection): void => {
		if (!picture) return;
		void onDrop({ widget: picture.widget, dragged, parent, before }).then(setRefusal);
	};
	const drag = useLayerDrag(scroller, INDENT_PX, onDropped, seen);
	const rows = { isLocked, picked, opened, drag, onPick, onHover };
	return (
		<aside
			className={`${PANEL} ${isShown ? "cv:pointer-events-auto cv:visible cv:opacity-100" : "cv:pointer-events-none cv:invisible cv:opacity-0"}`}
			aria-hidden={!isShown}
			data-canvas-layers={isShown ? "open" : "shut"}
			data-canvas-chrome=""
		>
			<header className="cv:flex cv:items-center cv:justify-between cv:px-1.5 cv:pb-1.5 cv:text-base cv:text-muted-foreground">
				<b>{TITLE}</b>
				<IconButton size="s" variant="ghost" label={isLocked ? LOCKED : UNLOCKED} onClick={() => setLocked(!isLocked)}>
					<Icon name={isLocked ? "lock" : "lock-open"} size={14} />
				</IconButton>
			</header>
			{refusal ? <p className={SAID}>{refusal}</p> : null}
			<div
				key={`tree:${screen.name}:${seen !== null}`}
				className="cv:group/tree cv:relative cv:flex-1 cv:overflow-auto cv:[scrollbar-width:none] cv:data-[dragging]:cursor-grabbing cv:motion-safe:animate-canvas-fade-in"
				ref={scroller}
			>
				{picture ? (
					<>
						{layers.map((layer) => (
							<LayerRow key={layer.mark} layer={layer} depth={0} {...rows} />
						))}
						{drag.slot ? (
							<div
								className="cv:pointer-events-none cv:absolute cv:right-0 cv:rounded-md cv:bg-[color-mix(in_srgb,var(--wg-kit-accent)_14%,transparent)] cv:transition-[top,left,height] cv:duration-200 cv:ease-standard cv:motion-safe:animate-canvas-fade-in"
								style={{ top: drag.slot.top, left: drag.slot.left, height: drag.slot.height }}
							/>
						) : null}
					</>
				) : (
					<p className={SAID}>{NOT_A_PAGE}</p>
				)}
			</div>
			{picture && (isOpen || keepsLiveCopy || seen === null) ? (
				<LiveCopy picture={picture} registry={registry} onNode={setLive} />
			) : null}
		</aside>
	);
}

function titledLayers(layers: readonly Layer[], registry: Drawing["registry"]): Layer[] {
	return layers.map((layer) => {
		const title = layer.widget ? registry.get(layer.widget)?.manifest["title"] : undefined;
		const name = typeof title === "string" && layer.name === layer.widget ? title : layer.name;
		return { ...layer, name, children: titledLayers(layer.children, registry) };
	});
}

export function LayersPanelView(props: LayersPanelViewProps): ReactElement | null {
	const { getDesign, getDrawing, getPages, getSelection, select, moveLayer } = props;
	const screen = getDesign?.screens.find((one) => one.name === getPages?.shownScreen);
	if (!screen || !getDrawing) return null;
	return (
		<LayersPanel
			screen={screen}
			isOpen={props.getIsLayersOpen}
			keepsLiveCopy={props.getMode === "pointer"}
			registry={getDrawing.registry}
			picked={getSelection?.mark ?? null}
			onPick={(widget, mark) => reasonOf(select({ selection: mark ? { widget, mark, spot: null } : null }))}
			onDrop={(dropped) => reasonOf(moveLayer(dropped))}
		/>
	);
}

async function reasonOf(answer: Promise<Answer>): Promise<string | null> {
	const heard = await answer;
	return heard.ok ? null : heard.reason;
}
