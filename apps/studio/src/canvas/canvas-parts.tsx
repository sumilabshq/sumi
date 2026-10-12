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
			getDrawing={design.drawing}
			getFramePictures={view.framePictures}
			askForPictures={design.askForPictures}
			field={
				<CanvasFieldWidget
					getDesign={design.design}
					getDrawing={design.drawing}
					getPages={design.pages}
					getDocs={design.docs}
					getMode={view.mode}
					getRenderer={view.renderer}
					getCamera={view.camera}
					moveCamera={view.moveCamera}
					getSelection={view.selection}
					select={view.select}
					getFocusedWidget={view.focusedWidget}
					focusWidget={view.focusWidget}
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
					getPages={design.pages}
					getIsLayersOpen={view.isLayersOpen}
					toggleLayers={view.toggleLayers}
				/>,
				<DesignSummaryWidget key="Design" getDesign={design.design} />,
				<AddPhotoWidget key="Add photo" getDrawing={design.drawing} addPhotos={design.addPhotos} />,
				<ModeSwitchWidget key="Mode" getMode={view.mode} setMode={view.setMode} />,
				<PicturesProgressWidget key="Pictures" getFramePictures={view.framePictures} />,
				<AgentLookWidget key="Agent look" getAgentLook={design.agentLook} showPage={view.showPage} />,
				<RendererSwitchWidget
					key="Renderer"
					getDrawing={design.drawing}
					getRenderer={view.renderer}
					chooseRenderer={view.chooseRenderer}
				/>,
			]}
			end={[
				<VariantSwitchWidget key="Variants" getPages={design.pages} pickVariant={view.pickVariant} />,
				<PageTabsWidget
					key="Pages"
					getPages={design.pages}
					showPage={view.showPage}
					returnToView={design.returnToView}
				/>,
			]}
			cornersEnd={corners.end}
		/>
	);
}
