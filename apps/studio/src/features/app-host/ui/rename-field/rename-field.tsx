import { createElement as h, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { RenameTabCommand } from "@widgetarium/app-host";
import { useSelectsOnMount } from "../../lib/use-selects-on-mount.js";

export interface Named {
	readonly id: string;
	readonly label: string | null;
	readonly title: string;
}

export interface RenameFieldProps {
	readonly named: Named;
	readonly className: string;
	readonly onDone: () => void;
}

const RENAME_TAB = "Rename {title}";

export function RenameField({ named, className, onDone }: RenameFieldProps): ReactElement {
	const [typed, setTyped] = useState(named.label ?? named.title);
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
				id: named.id,
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
			aria-label={RENAME_TAB.replace("{title}", named.title)}
			className={className}
			onChange={(event) => setTyped(event.target.value)}
			onKeyDown={onKeyDown}
			onBlur={onDone}
			data-host-tab-rename={named.id}
		/>
	);
}
