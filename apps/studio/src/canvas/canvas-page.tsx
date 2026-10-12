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
import type { CanvasState, DesignSource, GpuSupply } from "@widgetarium/canvas";
import { fieldOf, topBarOf } from "./canvas-parts.js";
import { useCanvasState } from "./use-canvas-state.js";
import type { CanvasStateFollowed } from "./use-canvas-state.js";

export interface CanvasCorners {
	readonly start: readonly ReactElement[];
	readonly end: readonly ReactElement[];
}

export interface CanvasPageProps extends CanvasStateFollowed {
	readonly source: DesignSource;
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
	readonly corners: CanvasCorners;
}

export function CanvasPage({ source, app, gpu, ownsPaste, corners, ...followed }: CanvasPageProps): ReactElement {
	const state = useCanvasState({ app, ...followed });
	const view = useMemo(() => viewHandlersOf(state), [state]);
	const design = useMemo(
		() => designHandlersOf(source, app, state, gpu, ownsPaste),
		[source, app, state, gpu, ownsPaste],
	);
	return (
		<CanvasOverlayWidget
			getViewport={view.viewport}
			field={fieldOf(view, design)}
			header={[topBarOf(view, design, corners)]}
			start={[
				<LayersPanelWidget
					key="Layers"
					getDesign={design.design}
					getDrawing={design.drawing}
					getPages={design.pages}
					getIsLayersOpen={view.isLayersOpen}
					getMode={view.mode}
					getSelection={view.selection}
					select={view.select}
					moveLayer={design.moveLayer}
				/>,
			]}
			end={[<LookPanelWidget key="Look" getLook={design.look} pickLook={design.pickLook} />]}
			bottom={[
				<JobStatusWidget
					key="Job status"
					getPages={design.pages}
					getLiveJob={design.liveJob}
					stopJob={design.stopJob}
				/>,
			]}
		/>
	);
}

export type ViewHandlers = ReturnType<typeof viewHandlersOf>;
export type DesignHandlers = ReturnType<typeof designHandlersOf>;

function viewHandlersOf(state: CanvasState) {
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
		framePictures: new FramePicturesQuery(),
	};
}

function designHandlersOf(
	source: DesignSource,
	app: string,
	state: CanvasState,
	gpu: GpuSupply | null,
	ownsPaste: (() => boolean) | null,
) {
	return {
		design: new DesignQuery(source, app),
		drawing: new DrawingQuery(source, gpu, ownsPaste),
		pages: new PagesQuery(source, app, state),
		docs: new DocsQuery(source, app),
		look: new LookQuery(source, app),
		pickLook: new PickLookCommand(source, app),
		addPhotos: new AddPhotosCommand(source, app),
		moveLayer: new MoveLayerCommand(source),
		returnToView: new ReturnToViewCommand(source, app, state),
		liveJob: new LiveJobQuery(source, app),
		stopJob: new StopJobCommand(source, app),
		askForPictures: new AskForPicturesCommand(source),
		agentLook: new AgentLookQuery(app),
	};
}
