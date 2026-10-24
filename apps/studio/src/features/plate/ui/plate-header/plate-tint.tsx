import type { ReactElement } from "react";
import { usePaintsPlate } from "../../lib/plate-header-context.js";
import type { PlateLook } from "../../lib/plate-header-store.js";

export interface PlateTintProps {
	readonly look: PlateLook | null;
}

export function PlateTint({ look }: PlateTintProps): ReactElement | null {
	usePaintsPlate(look);
	return null;
}
