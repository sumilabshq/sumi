import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import type { variantSwitchInject } from "../../widgets/variant-switch.widget.js";

const PICKED = "Picked";

export function VariantSwitch({
	getPages: pages,
	pickVariant,
}: InjectProps<typeof variantSwitchInject>): ReactElement | null {
	if (!pages || pages.variants.length < 2) return null;
	const page = pages.shown;
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-2" data-canvas-variants="">
			<Segmented<string>
				size="s"
				items={pages.variants.map(({ screen, letter }) => ({ value: screen, label: letter ?? PICKED }))}
				value={pages.shownScreen ?? ""}
				onValueChange={(screen) => void pickVariant({ page, screen })}
				className="cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			/>
		</span>
	);
}
