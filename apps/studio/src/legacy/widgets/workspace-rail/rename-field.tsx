import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Input } from "@widgetarium/kit";
import { QuietLine } from "../quiet-line.js";
import { useRefusal } from "../use-refusal.js";
import type { Answer } from "../use-refusal.js";

export interface RenameFieldProps {
	readonly name: string;
	readonly onRename: (name: string) => Promise<Answer>;
	readonly onRenamed: () => void;
}

const FIELD_LABEL = "Workspace name";

export function RenameField({ name, onRename, onRenamed }: RenameFieldProps): ReactElement {
	const [typed, setTyped] = useState(name);
	const [isPending, setPending] = useState(false);
	const { refusal, isAnsweredOk } = useRefusal();
	const submit = async (event: FormEvent): Promise<void> => {
		event.preventDefault();
		setPending(true);
		const isOk = await isAnsweredOk(onRename(typed));
		setPending(false);
		if (isOk) {
			onRenamed();
		}
	};
	return (
		<form className="wg-studio-rename" data-name="Rename workspace" onSubmit={(event) => void submit(event)}>
			<Input
				block
				autoFocus
				aria-label={FIELD_LABEL}
				disabled={isPending}
				value={typed}
				onInput={(event) => setTyped(event.currentTarget.value)}
			/>
			<QuietLine said={refusal} name="Rename refusal" />
		</form>
	);
}
