import { useContext } from "react";
import { FlowsWindowContext } from "./flows-window.js";

const OUTSIDE_SCOPE = "the Flows sidebar was drawn outside the Flows window provider";

export function useFlowsWindow(): string {
	const placesWindow = useContext(FlowsWindowContext);

	if (placesWindow === null) {
		throw new Error(OUTSIDE_SCOPE);
	}

	return placesWindow;
}
