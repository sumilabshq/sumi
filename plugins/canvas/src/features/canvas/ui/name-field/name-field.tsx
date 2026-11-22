import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Input } from "@widgetarium/kit";

export interface NameFieldProps {
	readonly name: string;
	readonly className: string;
	readonly onDone: (name: string | null) => void;
}

export function NameField({ name, className, onDone }: NameFieldProps): ReactElement {
	const [typed, setTyped] = useState(name);
	const finish = (): void => {
		const trimmed = typed.trim();
		onDone(trimmed === "" || trimmed === name ? null : trimmed);
	};
	return (
		<Input
			size="s"
			className={className}
			value={typed}
			aria-label="Name"
			autoFocus
			onFocus={(event) => event.currentTarget.select()}
			onChange={(event) => setTyped(event.currentTarget.value)}
			onPointerDown={(event) => event.stopPropagation()}
			onBlur={finish}
			onKeyDown={(event) => {
				event.stopPropagation();

				if (event.key === "Enter") {
					finish();
				}

				if (event.key === "Escape") {
					onDone(null);
				}
			}}
		/>
	);
}
