import { createElement as h } from "react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { groupColourOf } from "../../lib/group-colour.js";
import type { StripItem } from "../../lib/strip-items.js";
import { itemIdOf } from "../../lib/strip-items.js";
import type { StripRun as Run } from "../../lib/strip-runs.js";
import type { TabActs } from "../../lib/use-tab-acts.js";
import type { TabDrag } from "../../lib/use-tab-drag.js";
import { StripTab } from "../strip-tab/strip-tab.js";
import { groups } from "@sumi/groups/contract";

export interface StripRunProps {
	readonly run: Run;
	readonly acts: TabActs;
	readonly drag: TabDrag;
	readonly liftedId: string | null;
	readonly onMenu: (item: StripItem, event: MouseEvent<HTMLElement>) => void;
}

const FOLD = "Fold {name}";
const UNFOLD = "Unfold {name}";

export function StripRun({ run, acts, drag, liftedId, onMenu }: StripRunProps): ReactElement {
	const fold = useCommand(groups.actions.fold);
	const tabOf = (item: StripItem, onClose?: () => void): ReactElement => (
		<StripTab
			key={itemIdOf(item)}
			item={item}
			acts={acts}
			drag={drag}
			isLifted={itemIdOf(item) === liftedId}
			onMenu={onMenu}
			onClose={onClose}
		/>
	);

	if (run.kind === "split") {
		return tabOf(run.split);
	}

	if (run.kind === "item") {
		return tabOf(run.item);
	}

	const { group } = run;
	const label = (group.isOpen ? FOLD : UNFOLD).replace("{name}", group.name);
	const colour: CSSProperties & Readonly<Record<"--sumi-group", string>> = {
		"--sumi-group": groupColourOf(group.hue),
	};
	return (
		<div className="sumi-strip-group" data-open={group.isOpen ? "" : undefined} style={colour}>
			<button
				type="button"
				className="sumi-strip-chip"
				data-own-drag=""
				aria-label={label}
				title={label}
				onClick={() => void fold.run({ id: group.id })}
			>
				{group.isOpen ? group.name : `${group.name} ${run.tabs.length}`}
			</button>
			<div className="sumi-strip-group-tabs" aria-hidden={!group.isOpen}>
				<div className="sumi-strip-group-track">{run.tabs.map((tab) => tabOf(tab))}</div>
			</div>
		</div>
	);
}

