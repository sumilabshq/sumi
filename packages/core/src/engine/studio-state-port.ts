import { NOT_AVAILABLE_ON_HOST } from "./studio-host.js";

export type StudioView = "app" | "canvas" | "browser";

export type OpenablePanel = "catalogue";

export type StudioPanel = "none" | OpenablePanel;

export interface StudioMoment {
	readonly view: StudioView;
	readonly panel: StudioPanel;
}

export interface StudioState {
	now(): StudioMoment;
	subscribe(changed: () => void): () => void;
	show(view: StudioView): void;
	openPanel(panel: OpenablePanel): void;
	closePanel(panel: OpenablePanel): void;
}

export const STUDIO_OPENED_ON: StudioMoment = { view: "canvas", panel: "none" };

const refuseOutsideAStudio = (): never => {
	throw new Error(NOT_AVAILABLE_ON_HOST);
};

export const NO_STUDIO_STATE: StudioState = {
	now: () => STUDIO_OPENED_ON,
	subscribe: () => () => undefined,
	show: refuseOutsideAStudio,
	openPanel: refuseOutsideAStudio,
	closePanel: refuseOutsideAStudio,
};
