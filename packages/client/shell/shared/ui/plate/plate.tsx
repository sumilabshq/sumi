import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { PlateHeaderContext } from "../../lib/plate-header-context.js";
import { PlateHeaderStore } from "../../lib/plate-header-store.js";
import { useWearsPlateLook } from "../../lib/use-wears-plate-look.js";
import { PlateHeader } from "../plate-header/plate-header.js";
import type { PlateHeaderParts, PlateSide } from "../plate-header/plate-header.js";

export interface PlateProps extends PlateHeaderParts {
	readonly side: PlateSide;
	readonly label: string;
	readonly children: ReactNode;
}

const PLATE_TAG = {
	chat: "section",
	app: "main",
} as const;

export function Plate({ side, label, children, ...head }: PlateProps): ReactElement {
	const [store] = useState(() => new PlateHeaderStore(side));
	const plate = useRef<HTMLElement | null>(null);
	const header = useRef<HTMLElement | null>(null);
	useWearsPlateLook(store, plate, header);
	return h(
		PLATE_TAG[side],
		{
			ref: plate,
			className: `wg-shell-plate is-${side}`,
			"data-shell-plate": side,
			"aria-label": label,
		},
		<PlateHeaderContext.Provider value={store}>
			<PlateHeader ref={header} side={side} {...head} />
			<div className="wg-shell-plate-body">{children}</div>
		</PlateHeaderContext.Provider>,
	);
}
