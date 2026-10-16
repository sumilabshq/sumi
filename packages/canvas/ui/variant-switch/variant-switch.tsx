import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { VariantsQuery } from "../../features/pages/contract.js";
import { PickVariantCommand } from "../../features/pages/contract.js";

export function VariantSwitch(): ReactElement | null {
	const { isShown, shown, items } = useQuery(VariantsQuery).data;
	const pick = useCommand(PickVariantCommand);
	if (!isShown) return null;
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-2" data-canvas-variants="">
			<Segmented<string>
				size="s"
				items={items}
				value={shown}
				onValueChange={(screen) => void pick.run({ screen })}
				className="cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			/>
		</span>
	);
}
