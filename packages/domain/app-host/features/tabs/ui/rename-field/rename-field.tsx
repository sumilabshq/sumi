import { createElement as h, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";
import { RenameTabCommand } from "../../contract.js";
import { useSelectsOnMount } from "../../lib/use-selects-on-mount.js";

export interface RenameFieldProps {
	readonly tab: AppTab;
	readonly className: string;
	readonly onDone: () => void;
}

const RENAME_TAB = "Rename {title}";

export function RenameField({ tab, className, onDone }: RenameFieldProps): ReactElement {
	const [typed, setTyped] = useState(tab.label ?? tab.title);
	const field = useRef<HTMLInputElement | null>(null);
	const renameTab = useCommand(RenameTabCommand);
	useSelectsOnMount(field);
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key !== "Enter" && event.key !== "Escape") {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (event.key === "Enter") {
			void renameTab.run({
				id: tab.id,
				label: typed,
			});
		}

		onDone();
	};
	return (
		<input
			ref={field}
			type="text"
			value={typed}
			aria-label={RENAME_TAB.replace("{title}", tab.title)}
			className={className}
			onChange={(event) => setTyped(event.target.value)}
			onKeyDown={onKeyDown}
			onBlur={onDone}
			data-host-tab-rename={tab.id}
		/>
	);
}
