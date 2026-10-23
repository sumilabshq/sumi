import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { GroupState } from "../../../../shared/schema/app-tab.schema.js";
import { GroupHueSchema } from "../../../../shared/schema/tab-group.schema.js";
import type { GroupHue } from "../../../../shared/schema/tab-group.schema.js";
import { SetGroupHueCommand } from "../../contract.js";

const COLOUR = "Colour";
const NO_COLOUR = "No colour";
const SWATCHES = "cv:grid cv:grid-cols-9 cv:gap-1 cv:px-[10px] cv:pt-1.5 cv:pb-2";
const SWATCH =
	"cv:size-5 cv:cursor-pointer cv:[font:inherit] cv:text-inherit cv:rounded-[999px] cv:border-0 cv:p-0 cv:outline-none cv:transition-[box-shadow] cv:duration-(--sumi-dur-fast) cv:focus-visible:[box-shadow:0_0_0_2px_var(--sumi-plate),0_0_0_3.5px_var(--sumi-focus-ring)]";
const HUE_SWATCH = `${SWATCH} cv:bg-(--swatch) cv:aria-checked:[box-shadow:0_0_0_2px_var(--sumi-plate),0_0_0_3.5px_var(--swatch)]`;
const NONE_SWATCH = `${SWATCH} cv:bg-(--sumi-active) cv:[box-shadow:inset_0_0_0_1px_var(--sumi-line-strong)] cv:aria-checked:[box-shadow:inset_0_0_0_1px_var(--sumi-line-strong),0_0_0_2px_var(--sumi-plate),0_0_0_3.5px_var(--sumi-text-3)]`;
const SWATCH_HUE: Readonly<Record<GroupHue, string>> = {
	red: "cv:[--swatch:var(--sumi-hue-red)]",
	orange: "cv:[--swatch:var(--sumi-hue-orange)]",
	amber: "cv:[--swatch:var(--sumi-hue-amber)]",
	green: "cv:[--swatch:var(--sumi-hue-green)]",
	teal: "cv:[--swatch:var(--sumi-hue-teal)]",
	blue: "cv:[--swatch:var(--sumi-hue-blue)]",
	purple: "cv:[--swatch:var(--sumi-hue-purple)]",
	pink: "cv:[--swatch:var(--sumi-hue-pink)]",
};

export function GroupHues({ group }: { readonly group: GroupState }): ReactElement {
	const colourGroup = useCommand(SetGroupHueCommand);
	const pick = (hue: GroupHue | null) => () =>
		void colourGroup.run({
			id: group.id,
			hue,
		});
	return (
		<div className={SWATCHES} role="radiogroup" aria-label={COLOUR}>
			<button
				type="button"
				role="radio"
				aria-checked={group.hue === null}
				aria-label={NO_COLOUR}
				className={NONE_SWATCH}
				onClick={pick(null)}
				data-tabs-hue="none"
			/>
			{GroupHueSchema.options.map((hue) => (
				<button
					key={hue}
					type="button"
					role="radio"
					aria-checked={group.hue === hue}
					aria-label={hue}
					className={`${HUE_SWATCH} ${SWATCH_HUE[hue]}`}
					onClick={pick(hue)}
					data-tabs-hue={hue}
				/>
			))}
		</div>
	);
}
