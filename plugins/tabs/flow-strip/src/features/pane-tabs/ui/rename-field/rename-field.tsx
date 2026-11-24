import { createElement as h, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

export interface RenameFieldProps {
	readonly initial: string;
	readonly onDone: (label: string | null) => void;
}

export function RenameField({ initial, onDone }: RenameFieldProps): ReactElement {
	const field = useRef<HTMLInputElement | null>(null);
	useEffect(() => {
		field.current?.select();
	}, []);
	const finish = (): void => {
		const typed = field.current?.value.trim() ?? "";
		onDone(typed === "" || typed === initial ? null : typed);
	};
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === "Enter") {
			finish();
		}

		if (event.key === "Escape") {
			onDone(null);
		}
	};
	return (
		<input
			ref={field}
			className="sumi-pane-tab-rename"
			defaultValue={initial}
			aria-label="Tab name"
			autoFocus
			onKeyDown={onKeyDown}
			onBlur={finish}
			onPointerDown={(event) => event.stopPropagation()}
		/>
	);
}
