import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import {
	AddPhotosCommand,
	AgentLookQuery,
	AskForPicturesCommand,
	CameraQuery,
	CanvasOverlayWidget,
	ChooseRendererCommand,
	DesignQuery,
	DocsQuery,
	DrawingQuery,
	FocusWidgetCommand,
	FocusedWidgetQuery,
	FramePicturesQuery,
	FramePicturesService,
	JobStatusWidget,
	LayersOpenQuery,
	LayersPanelWidget,
	LiveJobQuery,
	LookPanelWidget,
	LookQuery,
	ModeQuery,
	MoveCameraCommand,
	MoveLayerCommand,
	PagesQuery,
	PickLookCommand,
	PickVariantCommand,
	RendererQuery,
	ReturnToViewCommand,
	SelectCommand,
	SelectionQuery,
	SetModeCommand,
	ShowPageCommand,
	StopJobCommand,
	ToggleLayersCommand,
	ViewportQuery,
} from "@widgetarium/canvas";
import type { CanvasState, DesignSource, GpuSupply, ViewReturn } from "@widgetarium/canvas";
import { OnRefused, toastRefusal } from "@widgetarium/core";
import { Toaster } from "@widgetarium/kit";
import { fieldOf, topBarOf } from "./canvas-parts.js";
import { useCanvasState } from "./use-canvas-state.js";
import type { CanvasStateFollowed } from "./use-canvas-state.js";

export interface CanvasCorners {
	readonly start: readonly ReactElement[];
	readonly end: readonly ReactElement[];
}

export interface CanvasPageProps extends CanvasStateFollowed {
	readonly source: DesignSource;
	readonly returnTo?: ViewReturn | undefined;
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
	readonly corners: CanvasCorners;
}

export function CanvasPage({ source, returnTo, gpu, ownsPaste, corners, ...followed }: CanvasPageProps): ReactElement {
	const state = useCanvasState(followed);
	const pictures = useMemo(() => new FramePicturesService(), []);
	const view = useMemo(() => viewHandlersOf(state, pictures), [state, pictures]);
	const design = useMemo(
		() => designHandlersOf({ source, returnTo, state, gpu, ownsPaste, pictures }),
		[source, returnTo, state, gpu, ownsPaste, pictures],
	);
	return (
		<OnRefused value={toastRefusal}>
			<Toaster />
			<CanvasOverlayWidget
				viewportQuery={view.viewport}
				field={fieldOf(view, design)}
				header={[topBarOf(view, design, corners)]}
				start={[
					<LayersPanelWidget
						key="Layers"
						designQuery={design.design}
						drawingQuery={design.drawing}
						pagesQuery={design.pages}
						isLayersOpenQuery={view.isLayersOpen}
						modeQuery={view.mode}
						selectionQuery={view.selection}
						selectCommand={view.select}
						moveLayerCommand={design.moveLayer}
					/>,
				]}
				end={[<LookPanelWidget key="Look" lookQuery={design.look} pickLookCommand={design.pickLook} />]}
				bottom={[<JobStatusWidget key="Job status" liveJobQuery={design.liveJob} stopJobCommand={design.stopJob} />]}
			/>
		</OnRefused>
	);
}

export type ViewHandlers = ReturnType<typeof viewHandlersOf>;
export type DesignHandlers = ReturnType<typeof designHandlersOf>;

function viewHandlersOf(state: CanvasState, pictures: FramePicturesService) {
	return {
		mode: new ModeQuery(state),
		setMode: new SetModeCommand(state),
		renderer: new RendererQuery(state),
		chooseRenderer: new ChooseRendererCommand(state),
		camera: new CameraQuery(state),
		moveCamera: new MoveCameraCommand(state),
		viewport: new ViewportQuery(state),
		selection: new SelectionQuery(state),
		select: new SelectCommand(state),
		isLayersOpen: new LayersOpenQuery(state),
		toggleLayers: new ToggleLayersCommand(state),
		focusedWidget: new FocusedWidgetQuery(state),
		focusWidget: new FocusWidgetCommand(state),
		showPage: new ShowPageCommand(state),
		pickVariant: new PickVariantCommand(state),
		framePictures: new FramePicturesQuery(pictures),
	};
}

interface DesignWiring {
	readonly source: DesignSource;
	readonly returnTo?: ViewReturn | undefined;
	readonly state: CanvasState;
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
	readonly pictures: FramePicturesService;
}

function designHandlersOf({ source, returnTo, state, gpu, ownsPaste, pictures }: DesignWiring) {
	return {
		design: new DesignQuery(source, state),
		drawing: new DrawingQuery(source, gpu, ownsPaste),
		pages: new PagesQuery(source, state),
		docs: new DocsQuery(source, state),
		look: new LookQuery(source, state),
		pickLook: new PickLookCommand(source, state),
		addPhotos: new AddPhotosCommand(source, state),
		moveLayer: new MoveLayerCommand(source),
		returnToView: new ReturnToViewCommand(source, state, returnTo),
		liveJob: new LiveJobQuery(source, state),
		stopJob: new StopJobCommand(source, state),
		askForPictures: new AskForPicturesCommand(source, pictures),
		agentLook: new AgentLookQuery(state),
	};
}
