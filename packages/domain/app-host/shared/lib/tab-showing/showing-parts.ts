import { PaneFlashGateway } from "../../../gateways/pane-flash/pane-flash.gateway.js";
import { ShownViewGateway } from "../../../gateways/shown-view/shown-view.gateway.js";
import { StudioWindowGateway } from "../../../gateways/studio-window/studio-window.gateway.js";

export const SHOWING_PARTS = {
	studioWindow: StudioWindowGateway,
	shownView: ShownViewGateway,
	paneFlash: PaneFlashGateway,
};
