import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { TerminalOutputQuery, ThemeQuery } from "@sumi/contract";
import type { TerminalOutput } from "@sumi/contract";
import { useApp, useOptionalQuery } from "@widgetarium/data-framework";
import type { AppViewProps } from "@sumi/apps-plugin";
import { useDrawsOutput } from "../../lib/use-draws-output.js";
import { useScreenIn } from "../../lib/use-screen-in.js";
import { useThemesScreen } from "../../lib/use-themes-screen.js";
import { useWiresShell } from "../../lib/use-wires-shell.js";

const APP_NAME = "Terminal";
const EXITED = "Exited";
const EXITED_WITH = "Exited with {code}";

export function TerminalView({ tabId }: AppViewProps): ReactElement {
	const screen = useRef<HTMLDivElement>(null);
	const terminal = useScreenIn(screen);
	const read = useOptionalQuery(TerminalOutputQuery, { session: tabId });
	const isDark = useOptionalQuery(ThemeQuery).data?.scheme === "dark";
	const shellRefusal = useWiresShell(terminal, useApp("TerminalView"), tabId);
	const failure = read.failure ?? shellRefusal;
	useDrawsOutput(terminal, read.data);
	useThemesScreen(screen, terminal, isDark);
	return (
		<main className="wg-terminal" aria-label={APP_NAME}>
			<div ref={screen} className="wg-terminal-screen" />
			{read.data?.status === "exited" ? <p className="wg-terminal-note">{exitedOf(read.data)}</p> : null}
			{failure === null ? null : <p className="wg-terminal-note">{failure}</p>}
		</main>
	);
}

function exitedOf({ exitCode }: TerminalOutput): string {
	return exitCode === null ? EXITED : EXITED_WITH.replace("{code}", String(exitCode));
}
