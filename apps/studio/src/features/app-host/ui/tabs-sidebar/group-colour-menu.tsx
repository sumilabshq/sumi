import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, Icon } from "@widgetarium/kit";
import { GroupHueSchema, appHost } from "@widgetarium/app-host/contract";
import type { GroupHue } from "@widgetarium/app-host/contract";
import type { GroupFace } from "../../lib/tabs-sidebar/sidebar-groups.js";
import { POINTER_ITEM, POINTER_SUBMENU } from "../../lib/menu-look/menu-look.js";

const COLOUR = "Colour";
const NO_COLOUR = "No colour";
const SWATCH = "cv:mx-0.5 cv:size-3 cv:flex-none cv:bg-(--swatch,var(--sumi-active))";
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
const HUE_SAID: Readonly<Record<GroupHue, string>> = {
	red: "Red",
	orange: "Orange",
	amber: "Amber",
	green: "Green",
	teal: "Teal",
	blue: "Blue",
	purple: "Purple",
	pink: "Pink",
};

export function GroupColourMenu({ group }: { readonly group: GroupFace }): ReactElement {
	const colourGroup = useCommand(appHost.groups.setHue);
	const choices: ReadonlyArray<GroupHue | null> = [null, ...GroupHueSchema.options];
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger className={POINTER_ITEM} data-tabs-menu-item={COLOUR}>
				<span className={`${SWATCH} ${group.hue === null ? "" : SWATCH_HUE[group.hue]}`} aria-hidden="true" />
				<span className="cv:flex-1">{COLOUR}</span>
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className={POINTER_SUBMENU}>
				{choices.map((hue) => (
					<ContextMenuItem
						key={hue ?? "none"}
						className={POINTER_ITEM}
						onSelect={() => void colourGroup.run({ id: group.id, hue })}
						data-tabs-hue={hue ?? "none"}
					>
						<span className={`${SWATCH} ${hue === null ? "" : SWATCH_HUE[hue]}`} aria-hidden="true" />
						<span className="cv:flex-1">{hue === null ? NO_COLOUR : HUE_SAID[hue]}</span>
						{group.hue === hue ? <Icon name="tick" size={14} /> : null}
					</ContextMenuItem>
				))}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
