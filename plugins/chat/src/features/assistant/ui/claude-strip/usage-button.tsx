import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { percentOf } from "../../lib/usage-said.js";
import { StripButton } from "./strip-button.js";
import { UsageMenu } from "./usage-menu.js";
import { UsageRing } from "./usage-ring.js";
import type { ClaudeOptions } from "@widgetarium/assistant";

const USAGE = "Usage";
const NO_USAGE = "—";

export function UsageButton({ usage }: { readonly usage: ClaudeOptions["usage"] }): ReactElement {
	const opening = useMenuOpening();
	const fiveHour = usage?.fiveHour ?? null;
	return (
		<>
			<StripButton label={USAGE} hasChevron={false} isOn={opening.spot !== null} onOpen={opening.openAt}>
				<UsageRing part={fiveHour?.used ?? null} />
				{fiveHour === null ? NO_USAGE : percentOf(fiveHour.used)}
			</StripButton>
			<UsageMenu opening={opening} usage={usage} />
		</>
	);
}
