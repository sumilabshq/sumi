import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { RoundButton } from "@widgetarium/canvas";
import { useCommand } from "@widgetarium/core/requests";
import { Icon, Popover, PopoverItem } from "@widgetarium/kit";
import type { ColumnSide } from "../../../../shared/schema/tabs-column.schema.js";
import { MoveColumnCommand, ShowColumnIconsCommand } from "../../contract.js";

const MENU = "Tabs menu";
const MOVE_SAID: Readonly<Record<ColumnSide, string>> = {
	start: "Move to left",
	end: "Move to right",
};
const ICONS_ONLY = "Icons only";

export function ColumnMenu({ side }: { readonly side: ColumnSide }): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const moveColumn = useCommand(MoveColumnCommand);
	const showColumnIcons = useCommand(ShowColumnIconsCommand);
	const otherSide: ColumnSide = side === "end" ? "start" : "end";
	const picked = (run: () => void) => () => {
		setOpen(false);
		run();
	};
	const trigger = (
		<RoundButton label={MENU} tone="raise" size="l" data-host-column-menu="">
			<Icon name="ellipsis" size={16} />
		</RoundButton>
	);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} placement="below" isPortaled trigger={trigger}>
			<div data-host-column-menu-list="">
				<PopoverItem onClick={picked(() => void moveColumn.run({ side: otherSide }))} data-host-column-move={otherSide}>
					<Icon name={otherSide === "start" ? "panel-left" : "panel-right"} size={16} />
					{MOVE_SAID[otherSide]}
				</PopoverItem>
				<PopoverItem onClick={picked(() => void showColumnIcons.run())} data-host-column-icons="">
					<Icon name="panel-right-close" size={16} />
					{ICONS_ONLY}
				</PopoverItem>
			</div>
		</Popover>
	);
}
