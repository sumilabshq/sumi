import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePlateTarget } from "../../lib/plate-header-context.js";
import type { PlateHeaderPlace } from "../../lib/plate-header-store.js";

export interface PlateHeaderPartProps {
	readonly place: PlateHeaderPlace;
	readonly children: ReactNode;
}

export function PlateHeaderPart({ place, children }: PlateHeaderPartProps): ReactNode {
	const target = usePlateTarget(place);

	if (target === null) {
		return null;
	}

	return createPortal(children, target);
}
