import { createElement as h, memo } from "react";
import type { ReactElement, ReactNode } from "react";
import type { GroupState } from "@widgetarium/app-host";
import { DropTint } from "../drop-tint/drop-tint.js";
import { FoldBox } from "../fold-box/fold-box.js";
import { SidebarCard } from "../sidebar-card/sidebar-card.js";
import { GroupHead } from "./group-head.js";
import { CARD_RADIUS_PX, NESTED_ROWS } from "../../lib/tabs-look/tabs-look.js";
import { LIFTED_HIDDEN, useLiftedMark } from "../../lib/tab-drag/lifted-look.js";

export type BoxedGroup = Pick<GroupState, "id" | "name" | "hue" | "isOpen">;

export interface GroupBoxProps {
	readonly group: BoxedGroup;
	readonly count: number;
	readonly holdsChat?: boolean;
	readonly children: ReactNode;
}

export const GroupBox = memo(function GroupBox({
	group,
	count,
	children,
	holdsChat = false,
}: GroupBoxProps): ReactElement {
	const lifted = useLiftedMark(group.id, null);
	return (
		<SidebarCard
			isOpen={group.isOpen}
			hue={group.hue}
			style={lifted === null ? undefined : LIFTED_HIDDEN}
			marks={{
				"data-tabs-box": group.id,
				"data-tabs-holds-chat": holdsChat ? "" : undefined,
				"data-tabs-lifted": lifted === null ? undefined : "",
			}}
		>
			{lifted === null ? null : <DropTint isOn={lifted.isMarked} radius={CARD_RADIUS_PX} />}
			<GroupHead group={group} count={count} />
			<FoldBox isOpen={group.isOpen}>
				<div className={NESTED_ROWS} data-tabs-rows="">
					{children}
				</div>
			</FoldBox>
		</SidebarCard>
	);
});
