import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { ShownFileSchema } from "@sumi/code-work/contract";
import { fileSystem } from "@sumi/contract";
import { McpAppCard } from "@sumi/mcp-apps-plugin";
import type { McpAppViewProps } from "@sumi/mcp-apps-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { createCodeLines } from "@widgetarium/markdown";
import type { z } from "zod";
import { CODE_ICON_SOURCE } from "../../lib/code-icon.js";
import { linesMarked } from "../../lib/marked-lines.js";
import { shownCodeOf } from "../../lib/shown-code.js";

export const FILE_CARD_HEIGHT = 420;

const FILE_LINK = "sumi://file/{path}";
const OPEN_LABEL = "Open the file";
const MARKS = "{count} marked";
const ONE_MARK = "1 marked";

export function FileCard({ result }: McpAppViewProps<z.output<typeof ShownFileSchema>>): ReactElement {
	const read = useOptionalQuery(fileSystem.files.read, { path: result.path });
	const holder = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const node = holder.current;

		if (node === null || read.data === null) {
			return undefined;
		}

		const shown = shownCodeOf(result.path, read.data, false);
		node.replaceChildren(createCodeLines(node.ownerDocument, { body: shown.body, language: shown.language, wraps: false }));
		const first = linesMarked(node, result.marks);
		node.scrollTop = first === null ? 0 : Math.max(0, first.offsetTop - first.offsetHeight * 2);
		return () => node.replaceChildren();
	}, [read.data, result.path, result.marks]);
	const count = result.marks.length;
	return (
		<McpAppCard look="tile">
			<div className="sumi-file-card" style={{ height: FILE_CARD_HEIGHT }}>
				<div className="sumi-mcp-head">
					<div className="sumi-mcp-tag">
						<img className="sumi-mcp-tag-glyph" src={CODE_ICON_SOURCE} alt="" />
						<span className="sumi-mcp-tag-title">{result.name}</span>
						<span className="sumi-mcp-tag-meta">{result.folder}</span>
						{count === 0 ? null : (
							<span className="sumi-mcp-tag-meta">{count === 1 ? ONE_MARK : MARKS.replace("{count}", String(count))}</span>
						)}
					</div>
					<a
						className="sumi-mcp-square"
						href={FILE_LINK.replace("{path}", result.path)}
						aria-label={OPEN_LABEL}
						title={OPEN_LABEL}
					>
						<svg viewBox="0 0 12 12" aria-hidden="true">
							<path d="M4 2h6v6M10 2L3 9" />
						</svg>
					</a>
				</div>
				{read.failure === null ? (
					<div ref={holder} className="wg-chat-app sumi-file-card-body" />
				) : (
					<p className="sumi-file-card-note">{read.failure}</p>
				)}
			</div>
		</McpAppCard>
	);
}
