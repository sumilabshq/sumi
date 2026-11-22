import { createElement as h, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon, Input, PopoverItem, PopoverSeparator, Pressable } from "@widgetarium/kit";
import type { SidebarGroupState } from "@widgetarium/app-host/contract";
import { GroupHueSchema, groups } from "@sumi/groups/contract";
import { groupColourOf } from "@sumi/tab-strip-plugin";
import { editCreatedGroup } from "../../lib/edit-created-group.js";
import { warnIfRefused } from "../../lib/warn-if-refused.js";

export interface GroupEditorProps {
	readonly group: SidebarGroupState;
	readonly onDone: () => void;
}

const HUES = [null, ...GroupHueSchema.options];
const NAME_LABEL = "Group name";
const HUES_LABEL = "Group colour";
const NO_HUE = "grey";
const ITEM_ICON_PX = 16;

export function GroupEditor({ group, onDone }: GroupEditorProps): ReactElement {
	const rename = useCommand(groups.actions.rename);
	const setHue = useCommand(groups.actions.setHue);
	const ungroup = useCommand(groups.actions.ungroup);
	const create = useCommand(groups.actions.create);
	const [name, setName] = useState(group.name);
	const saveName = (): void => {
		const said = name.trim();

		if (said === "" || said === group.name) {
			return;
		}

		void rename.run({ id: group.id, name: said }).then(warnIfRefused(`renaming ${group.id}`));
	};
	return (
		<div className="sumi-group-editor">
			<Input
				className="sumi-group-editor-name"
				aria-label={NAME_LABEL}
				value={name}
				autoFocus
				onFocus={(event) => event.currentTarget.select()}
				onChange={(event) => setName(event.currentTarget.value)}
				onBlur={saveName}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						saveName();
						onDone();
					}
				}}
			/>
			<div className="sumi-group-hues" role="radiogroup" aria-label={HUES_LABEL}>
				{HUES.map((hue) => (
					<Pressable
						key={hue ?? NO_HUE}
						role="radio"
						className="sumi-group-hue"
						label={hue ?? NO_HUE}
						aria-checked={group.hue === hue}
						onClick={() => void setHue.run({ id: group.id, hue }).then(warnIfRefused(`colouring ${group.id}`))}
					>
						<span className="sumi-group-hue-dot" style={hueStyleOf(hue)} />
					</Pressable>
				))}
			</div>
			<PopoverSeparator />
			<PopoverItem
				role="menuitem"
				onClick={() => {
					onDone();
					void create.run({ inGroupId: group.id }).then(editCreatedGroup(`new group inside ${group.id}`));
				}}
			>
				<Icon name="folder-plus" size={ITEM_ICON_PX} />
				New group inside
			</PopoverItem>
			<PopoverItem
				role="menuitem"
				onClick={() => {
					onDone();
					void ungroup.run({ id: group.id }).then(warnIfRefused(`ungrouping ${group.id}`));
				}}
			>
				<Icon name="folder-minus" size={ITEM_ICON_PX} />
				Ungroup
			</PopoverItem>
		</div>
	);
}

function hueStyleOf(hue: string | null): CSSProperties & Readonly<Record<"--sumi-group", string>> {
	return {
		"--sumi-group": groupColourOf(hue),
	};
}
