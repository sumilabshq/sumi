import { useCallback, useMemo } from "react";
import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { OutputOf } from "@widgetarium/core/requests";
import { useEscape, useFlyToElement, usePointedLayer, useResolvedSpot } from "@widgetarium/behaviors";
import type { PanZoom, PointedLayer } from "@widgetarium/behaviors";
import { FinishFlightCommand } from "../../features/pages/contract.js";
import { PickSpotCommand } from "../../features/field/contract.js";
import { ResolveSpotCommand } from "../../features/field/contract.js";
import type { FieldStateQuery } from "../../features/field/contract.js";
import type { Selection, Spot } from "../../schema/selection.schema.js";
import { LOOK_ROOM, POINTING, groupSelectorOf } from "./field-marks.js";

type FieldState = OutputOf<typeof FieldStateQuery>;

export function useFieldPointing(
	layerRef: RefObject<HTMLDivElement | null>,
	pan: PanZoom,
	state: FieldState,
): PointedLayer {
	const pickSpot = useCommand(PickSpotCommand);
	const resolveSpot = useCommand(ResolveSpotCommand);
	const finishFlight = useCommand(FinishFlightCommand);
	const scaleNow = useCallback(() => pan.lookNow().scale, [pan]);
	const onPick = useCallback((selection: Selection | null) => void pickSpot.run({ selection }), [pickSpot]);
	const pointing = useMemo(
		() => ({ marks: POINTING, scaleNow, picked: state.pickedMark, onPick }),
		[scaleNow, state.pickedMark, onPick],
	);
	const pointed = usePointedLayer(layerRef, pointing);
	const onResolved = useCallback((spot: Spot) => void resolveSpot.run({ spot }), [resolveSpot]);
	useResolvedSpot(layerRef, { pan, marks: POINTING, room: LOOK_ROOM, asked: state.unresolved, onResolved });
	useEscape(state.pickedMark !== null, () => void pickSpot.run({ selection: null }));
	const onFlown = useCallback(() => void finishFlight.run(), [finishFlight]);
	useFlyToElement({ pan, layerRef, selector: groupSelectorOf(state.flyTo), room: LOOK_ROOM, onDone: onFlown });
	return pointed;
}
