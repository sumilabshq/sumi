import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Terminal } from "@xterm/xterm";
import type { TerminalOutput } from "@sumi/contract";

export function useDrawsOutput(terminal: RefObject<Terminal | null>, output: TerminalOutput | null): void {
	const written = useRef("");
	useEffect(() => {
		const drawn = terminal.current;

		if (drawn === null || output === null) {
			return;
		}

		if (output.output.startsWith(written.current)) {
			drawn.write(output.output.slice(written.current.length));
		} else {
			drawn.reset();
			drawn.write(output.output);
		}

		written.current = output.output;
	}, [terminal, output]);
}
