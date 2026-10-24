import { createElement as h, memo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { FoldGroupCommand } from "@widgetarium/app-host";
import type { GroupState } from "@widgetarium/app-host";

export interface GroupBoxProps {
	readonly id: string;
	readonly name: string;
	readonly hue: GroupState["hue"];
	readonly isOpen: boolean;
	readonly count: number;
	readonly children: ReactNode;
}

const HUES =
	"cv:data-[hue=red]:[--group-hue:var(--sumi-hue-red)] cv:data-[hue=orange]:[--group-hue:var(--sumi-hue-orange)] cv:data-[hue=amber]:[--group-hue:var(--sumi-hue-amber)] cv:data-[hue=green]:[--group-hue:var(--sumi-hue-green)] cv:data-[hue=teal]:[--group-hue:var(--sumi-hue-teal)] cv:data-[hue=blue]:[--group-hue:var(--sumi-hue-blue)] cv:data-[hue=purple]:[--group-hue:var(--sumi-hue-purple)] cv:data-[hue=pink]:[--group-hue:var(--sumi-hue-pink)]";
const BOX = `cv:group/box cv:relative cv:mt-1.5 cv:flex cv:flex-none cv:flex-col cv:gap-px cv:rounded-[14px] cv:px-1 cv:pt-0.5 cv:pb-1 cv:before:pointer-events-none cv:before:absolute cv:before:inset-x-0 cv:before:top-0 cv:before:bottom-[calc(-1*var(--group-grow,0px))] cv:before:rounded-[14px] cv:before:bg-(--sumi-group-plain) cv:before:content-[''] cv:data-[hue]:before:bg-[color-mix(in_srgb,var(--group-hue)_var(--sumi-group-tint),transparent)] cv:before:transition-[bottom] cv:before:duration-(--sumi-dur-base) cv:before:ease-(--sumi-ease-out) cv:data-[tabs-settling]:before:transition-none ${HUES}`;
const HEAD =
	"cv:relative cv:flex cv:h-[30px] cv:w-full cv:flex-none cv:cursor-default cv:items-center cv:gap-1.5 cv:rounded-[9px] cv:border-0 cv:bg-transparent cv:px-1.5 cv:py-0 cv:text-start cv:font-[inherit] cv:text-[12px] cv:font-semibold cv:text-(--sumi-text-2) cv:[box-shadow:none] cv:outline-none cv:select-none cv:group-data-[hue]/box:text-(--group-hue) cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]";
const NAME = "cv:min-w-0 cv:overflow-hidden cv:text-ellipsis cv:whitespace-nowrap";
const COUNT = "cv:ms-auto cv:font-medium cv:text-(--sumi-text-3)";
const ROWS = "cv:relative cv:flex cv:flex-col cv:gap-px";

export const GroupBox = memo(function GroupBox({
	id,
	name,
	hue,
	isOpen,
	count,
	children,
}: GroupBoxProps): ReactElement {
	const foldGroup = useCommand(FoldGroupCommand);
	return (
		<div className={BOX} data-hue={hue ?? undefined} data-tabs-box={id}>
			<button
				type="button"
				aria-expanded={isOpen}
				className={HEAD}
				onClick={() => void foldGroup.run({ id })}
				data-tabs-item="group"
				data-tabs-id={id}
			>
				<Icon name={isOpen ? "chevron-down" : "chevron-right"} size={12} />
				<span className={NAME}>{name}</span>
				<span className={COUNT}>{count}</span>
			</button>
			{isOpen ? <div className={ROWS}>{children}</div> : null}
		</div>
	);
});
