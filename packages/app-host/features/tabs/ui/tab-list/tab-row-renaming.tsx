import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { RenameField } from "../rename-field/rename-field.js";

export interface TabRowRenamingProps {
	readonly tab: AppTabState;
	readonly className: string;
	readonly onRenamed: () => void;
}

const RENAME_FIELD =
	"cv:h-8 cv:min-w-0 cv:flex-1 cv:rounded-full cv:border-0 cv:bg-raise cv:px-2.5 cv:text-sm cv:text-ink cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-ring";

export function TabRowRenaming({ tab, className, onRenamed }: TabRowRenamingProps): ReactElement {
	return (
		<span aria-current={tab.isShown || undefined} className={className}>
			<TabIcon tab={tab} look="row" />
			<RenameField tab={tab} className={RENAME_FIELD} onDone={onRenamed} />
		</span>
	);
}
