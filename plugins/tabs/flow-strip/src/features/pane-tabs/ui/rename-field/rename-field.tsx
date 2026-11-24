import { createElement as h, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

export interface RenameFieldProps {
	readonly initial: string;
	readonly onDone: (label: string | null) => void;
}

export function RenameField({ initial, onDone }: RenameFieldProps): ReactElement {
	const field = useRef<HTMLInputElement | null>(null);
	const isSettled = useRef(false);
	useEffect(() => {
		field.current?.select();
	}, []);
	const settle = (label: string | null): void => {
		if (isSettled.current) {
			return;
		}

		isSettled.current = true;
		onDone(label);
	};
	const commit = (): void => {
		const typed = field.current?.value.trim() ?? "";
		settle(typed === "" || typed === initial ? null : typed);
	};
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === "Enter") {
			commit();
		}

		if (event.key === "Escape") {
			settle(null);
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
			onBlur={commit}
			onPointerDown={(event) => event.stopPropagation()}
		/>
	);
}
