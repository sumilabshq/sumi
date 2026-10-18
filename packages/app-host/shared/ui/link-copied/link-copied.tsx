import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@widgetarium/kit";
import type { PointerSpot } from "../../lib/pointer-spot/pointer-spot.js";

const NOTE =
	"cv:pointer-events-none cv:fixed cv:z-[var(--layer-tooltip)] cv:flex cv:h-12 cv:-translate-y-1/2 cv:items-center cv:gap-2.5 cv:whitespace-nowrap cv:rounded-full cv:bg-[var(--wg-studio-glass,var(--popover))] cv:py-1.5 cv:ps-1.5 cv:pe-[18px] cv:text-sm cv:font-medium cv:text-ink cv:backdrop-blur-[26px] cv:backdrop-saturate-[1.7] cv:shadow-[0_0_0_1px_var(--wg-studio-glass-edge,var(--border)),0_18px_40px_-12px_var(--wg-studio-glass-shadow,transparent)] cv:motion-safe:animate-canvas-fade-in";
const TICK =
	"cv:grid cv:size-9 cv:place-items-center cv:rounded-full cv:bg-[color-mix(in_srgb,var(--success)_14%,var(--background))] cv:text-success";
const LINK_COPIED = "Link copied";
const BESIDE_THE_POINTER_PX = 12;

export function LinkCopiedNote({ spot }: { readonly spot: PointerSpot | null }): ReactElement | null {
	if (spot === null) {
		return null;
	}

	return createPortal(
		<div role="status" className={NOTE} style={besidePointer(spot)} data-host-link-copied="">
			<span className={TICK}>
				<Icon name="check" size={16} />
			</span>
			{LINK_COPIED}
		</div>,
		spot.layer,
	);
}

function besidePointer(spot: PointerSpot): CSSProperties {
	const windowWidth = spot.layer.ownerDocument.defaultView?.innerWidth ?? spot.x;

	if (spot.x > windowWidth / 2) {
		return {
			right: windowWidth - spot.x + BESIDE_THE_POINTER_PX,
			top: spot.y,
		};
	}

	return {
		left: spot.x + BESIDE_THE_POINTER_PX,
		top: spot.y,
	};
}
