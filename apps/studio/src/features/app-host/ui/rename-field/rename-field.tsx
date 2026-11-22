import { createElement as h, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { Input } from "@widgetarium/kit";
import { useSelectsOnMount } from "../../lib/use-selects-on-mount.js";

export interface RenameFieldProps {
	readonly name: string;
	readonly label: string;
	readonly mark: string;
	readonly onRename: (typed: string) => void;
	readonly onDone: () => void;
	readonly className?: string | undefined;
}

export const ROW_RENAME_FIELD = "cv:min-w-0 cv:flex-1 cv:-mx-1.5 cv:text-[13px]";

export function RenameField({
	name,
	label,
	mark,
	onRename,
	onDone,
	className = ROW_RENAME_FIELD,
}: RenameFieldProps): ReactElement {
	const [typed, setTyped] = useState(name);
	const field = useRef<HTMLInputElement | null>(null);
	useSelectsOnMount(field);
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key !== "Enter" && event.key !== "Escape") {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (event.key === "Enter") {
			onRename(typed);
		}

		onDone();
	};
	return (
		<Input
			ref={field}
			size="s"
			value={typed}
			aria-label={label}
			className={className}
			onChange={(event) => setTyped(event.target.value)}
			onKeyDown={onKeyDown}
			onClick={(event) => event.stopPropagation()}
			onBlur={onDone}
			data-host-tab-rename={mark}
		/>
	);
}
