import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { RenameField } from "./rename-field.js";

export interface Named {
	readonly id: string;
	readonly label: string | null;
	readonly title: string;
}

const RENAME_TAB = "Rename {title}";

export function TabRenameField({
	named,
	onDone,
	className,
}: {
	readonly named: Named;
	readonly onDone: () => void;
	readonly className?: string;
}): ReactElement {
	const renameTab = useCommand(appHost.tabActions.renameTab);
	return (
		<RenameField
			name={named.label ?? named.title}
			label={RENAME_TAB.replace("{title}", named.title)}
			mark={named.id}
			className={className}
			onRename={(label) => void renameTab.run({ id: named.id, label })}
			onDone={onDone}
		/>
	);
}
