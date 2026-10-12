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
import type { CanvasState, DesignSource, GpuSupply } from "@widgetarium/canvas";
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
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
	readonly corners: CanvasCorners;
}

export function CanvasPage({ source, app, gpu, ownsPaste, corners, ...followed }: CanvasPageProps): ReactElement {
	const state = useCanvasState({ app, ...followed });
	const pictures = useMemo(() => new FramePicturesService(), []);
	const view = useMemo(() => viewHandlersOf(state, pictures), [state, pictures]);
	const design = useMemo(
		() => designHandlersOf({ source, app, state, gpu, ownsPaste, pictures }),
		[source, app, state, gpu, ownsPaste, pictures],
	);
	return (
		<OnRefused value={toastRefusal}>
			<Toaster />
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
				bottom={[<JobStatusWidget key="Job status" getLiveJob={design.liveJob} stopJob={design.stopJob} />]}
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
	readonly app: string;
	readonly state: CanvasState;
	readonly gpu: GpuSupply | null;
	readonly ownsPaste: (() => boolean) | null;
	readonly pictures: FramePicturesService;
}

function designHandlersOf({ source, app, state, gpu, ownsPaste, pictures }: DesignWiring) {
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
		liveJob: new LiveJobQuery(source, app, state),
		stopJob: new StopJobCommand(source, app),
		askForPictures: new AskForPicturesCommand(source, pictures),
		agentLook: new AgentLookQuery(app),
	};
}
