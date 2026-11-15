import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { RenameField } from "./rename-field.js";

const RENAME_GROUP = "Rename group {name}";

export function GroupRenameField({
	id,
	name,
	onDone,
}: {
	readonly id: string;
	readonly name: string;
	readonly onDone: () => void;
}): ReactElement {
	const renameGroup = useCommand(appHost.groups.renameGroup);
	return (
		<RenameField
			name={name}
			label={RENAME_GROUP.replace("{name}", name)}
			mark={id}
			onRename={(typed) => void renameGroup.run({ id, name: typed })}
			onDone={onDone}
		/>
	);
}
