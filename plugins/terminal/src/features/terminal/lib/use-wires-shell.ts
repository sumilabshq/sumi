import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { Terminal } from "@xterm/xterm";
import { ResizeTerminalCommand, TypeTerminalCommand } from "@sumi/contract";
import type { Answer, Runtime } from "@widgetarium/data-framework";

// TRADE-OFF: sends each keystroke itself; useCommand shares one key between equal keystrokes in flight
export function useWiresShell(terminal: RefObject<Terminal | null>, shell: Runtime, session: string): string | null {
	const [refusal, setRefusal] = useState<string | null>(null);
	useEffect(() => {
		const drawn = terminal.current;

		if (drawn === null) {
			return;
		}

		const showRefusalOf = (answer: Answer<unknown>): void => setRefusal(answer.ok ? null : answer.reason);
		void shell.send(ResizeTerminalCommand, { session, cols: drawn.cols, rows: drawn.rows }).then(showRefusalOf);
		const typing = drawn.onData((keys) => void shell.send(TypeTerminalCommand, { session, keys }).then(showRefusalOf));
		const resizing = drawn.onResize(
			(size) => void shell.send(ResizeTerminalCommand, { session, ...size }).then(showRefusalOf),
		);
		return () => {
			typing.dispose();
			resizing.dispose();
		};
	}, [terminal, shell, session]);
	return refusal;
}
