import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	AddPhotoWidget,
	AgentLookWidget,
	CanvasFieldWidget,
	CanvasTopBarWidget,
	DesignSummaryWidget,
	FramePicturesWidget,
	LayersToggleWidget,
	ModeSwitchWidget,
	PageTabsWidget,
	PicturesProgressWidget,
	RendererSwitchWidget,
	VariantSwitchWidget,
} from "@widgetarium/canvas";
import type { CanvasCorners, DesignHandlers, ViewHandlers } from "./canvas-page.js";

export function fieldOf(view: ViewHandlers, design: DesignHandlers): ReactElement {
	return (
		<FramePicturesWidget
			drawingQuery={design.drawing}
			framePicturesQuery={view.framePictures}
			askForPicturesCommand={design.askForPictures}
			field={
				<CanvasFieldWidget
					designQuery={design.design}
					drawingQuery={design.drawing}
					pagesQuery={design.pages}
					docsQuery={design.docs}
					modeQuery={view.mode}
					rendererQuery={view.renderer}
					cameraQuery={view.camera}
					moveCameraCommand={view.moveCamera}
					selectionQuery={view.selection}
					selectCommand={view.select}
					focusedWidgetQuery={view.focusedWidget}
					focusWidgetCommand={view.focusWidget}
				/>
			}
		/>
	);
}

export function topBarOf(view: ViewHandlers, design: DesignHandlers, corners: CanvasCorners): ReactElement {
	return (
		<CanvasTopBarWidget
			key="Top bar"
			cornersStart={corners.start}
			start={[
				<LayersToggleWidget
					key="Layers"
					pagesQuery={design.pages}
					isLayersOpenQuery={view.isLayersOpen}
					toggleLayersCommand={view.toggleLayers}
				/>,
				<DesignSummaryWidget key="Design" designQuery={design.design} />,
				<AddPhotoWidget key="Add photo" drawingQuery={design.drawing} addPhotosCommand={design.addPhotos} />,
				<ModeSwitchWidget key="Mode" modeQuery={view.mode} setModeCommand={view.setMode} />,
				<PicturesProgressWidget key="Pictures" framePicturesQuery={view.framePictures} />,
				<AgentLookWidget key="Agent look" agentLookQuery={design.agentLook} showPageCommand={view.showPage} />,
				<RendererSwitchWidget
					key="Renderer"
					drawingQuery={design.drawing}
					rendererQuery={view.renderer}
					chooseRendererCommand={view.chooseRenderer}
				/>,
			]}
			end={[
				<VariantSwitchWidget key="Variants" pagesQuery={design.pages} pickVariantCommand={view.pickVariant} />,
				<PageTabsWidget
					key="Pages"
					pagesQuery={design.pages}
					showPageCommand={view.showPage}
					returnToViewCommand={design.returnToView}
				/>,
			]}
			cornersEnd={corners.end}
		/>
	);
}
