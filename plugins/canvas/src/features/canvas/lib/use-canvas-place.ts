import { useEffect } from "react";
import { artboards } from "@sumi/artboards/contract";
import { navigation } from "@sumi/contract";
import { useCommand, useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { HOME_ADDRESS } from "../../../shared/lib/canvas-links.js";

export type CanvasPlace =
	| { readonly kind: "waiting" }
	| { readonly kind: "home" }
	| {
			readonly kind: "canvas";
			readonly canvasId: string;
	  };

const WAITING: CanvasPlace = { kind: "waiting" };
const HOME: CanvasPlace = { kind: "home" };

export function useCanvasPlace(tabId: string): CanvasPlace {
	const read = useOptionalQuery(navigation.tabFacts.ownAppTab, { id: tabId });
	const canvases = useQuery(artboards.canvases.getCanvases, {}).data;
	const { run } = useCommand(navigation.tabFacts.recordAppAddress);
	const tab = read.data?.id === tabId ? read.data : null;
	const address = tab?.address ?? null;
	const hasOwnCanvas = canvases.some(({ canvasId }) => canvasId === tabId);
	const isOwnCanvasUnaddressed = tab !== null && address === null && hasOwnCanvas;

	useEffect(() => {
		if (!isOwnCanvasUnaddressed) {
			return;
		}

		void run({
			id: tabId,
			address: tabId,
			how: "replace",
		});
	}, [isOwnCanvasUnaddressed, run, tabId]);

	if (address === HOME_ADDRESS) {
		return HOME;
	}

	if (address !== null) {
		return canvasPlaceOf(address);
	}

	if (tab === null && read.isLoading) {
		return WAITING;
	}

	return hasOwnCanvas ? canvasPlaceOf(tabId) : HOME;
}

function canvasPlaceOf(canvasId: string): CanvasPlace {
	return {
		kind: "canvas",
		canvasId,
	};
}
