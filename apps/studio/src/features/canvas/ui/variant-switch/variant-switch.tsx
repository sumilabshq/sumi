import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/framework";
import { VariantsQuery } from "@widgetarium/canvas";
import { PickVariantCommand } from "@widgetarium/canvas";
import { PillSwitch } from "../pill-switch/pill-switch.js";
import { VARIANTS_LEAVE } from "../../lib/app-zone-steps.js";

const VARIANTS = `cv:inline-flex cv:items-center cv:gap-2 ${VARIANTS_LEAVE}`;

export function VariantSwitch(): ReactElement | null {
	const { isShown, shown, items } = useQuery(VariantsQuery).data;
	const pick = useCommand(PickVariantCommand);
	if (!isShown) return null;
	return (
		<span className={VARIANTS} data-canvas-variants="">
			<PillSwitch<string> items={items} value={shown} onValueChange={(screen) => void pick.run({ screen })} />
		</span>
	);
}
