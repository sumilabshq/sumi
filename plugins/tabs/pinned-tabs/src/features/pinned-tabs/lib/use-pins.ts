import { useOptionalQuery } from "@widgetarium/data-framework";
import { pins } from "@sumi/pins/contract";
import type { Pin } from "./pin-views.js";

const NO_PINS: readonly Pin[] = [];

export function usePins(): readonly Pin[] {
	return useOptionalQuery(pins.pins.all).data?.pins ?? NO_PINS;
}
