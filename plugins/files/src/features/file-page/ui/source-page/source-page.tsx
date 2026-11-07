import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CodeLinesAsk } from "@widgetarium/markdown";
import { useMountsCodeLines } from "../../lib/use-mounts-code-lines.js";

export type SourcePageProps = CodeLinesAsk;

// TRADE-OFF: wears the chat's class for its --sumi-code-* colours; they move to sumi.css once the chat sheet is free
export function SourcePage(props: SourcePageProps): ReactElement {
	const holder = useMountsCodeLines(props);
	return (
		<div
			ref={holder}
			className="wg-chat-app"
			style={{
				height: "100%",
				overflow: "auto",
				background: "var(--sumi-plate)",
			}}
		/>
	);
}
