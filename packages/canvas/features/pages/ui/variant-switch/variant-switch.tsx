import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { VariantsQuery } from "../../contract.js";
import { PickVariantCommand } from "../../contract.js";
import { PillSwitch } from "../../../../shared/ui/pill-switch/pill-switch.js";

export function VariantSwitch(): ReactElement | null {
	const { isShown, shown, items } = useQuery(VariantsQuery).data;
	const pick = useCommand(PickVariantCommand);
	if (!isShown) return null;
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-2" data-canvas-variants="">
			<PillSwitch<string> items={items} value={shown} onValueChange={(screen) => void pick.run({ screen })} />
		</span>
	);
}
