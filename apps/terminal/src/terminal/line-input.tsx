import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { SendTerminalCommand } from "@sumi/contract";
import type { SumiShell } from "../sumi-shell.js";

const LINE_LABEL = "Command";

export function LineInput({ sumi }: { readonly sumi: SumiShell }): ReactElement {
	const [line, setLine] = useState("");
	const [refusal, setRefusal] = useState<string | null>(null);
	const sent = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		void sumi.shell.send(SendTerminalCommand, { line }).then((answer) => {
			if (!answer.ok) {
				setRefusal(answer.reason);
				return;
			}

			setRefusal(null);
			setLine("");
		});
	};
	return (
		<form className="wg-terminal-line" onSubmit={sent}>
			{refusal === null ? null : <p className="wg-terminal-note">{refusal}</p>}
			<input
				className="wg-terminal-line-input"
				aria-label={LINE_LABEL}
				value={line}
				autoFocus
				spellCheck={false}
				autoComplete="off"
				onChange={(event) => setLine(event.target.value)}
			/>
		</form>
	);
}
