import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { IconButton, Pressable } from "@widgetarium/kit";
import { git } from "@sumi/git/contract";
import type { FileDiff } from "@sumi/git/contract";
import { ShownChangesSchema } from "@sumi/git-work/contract";
import { McpAppCard } from "@sumi/mcp-apps-plugin";
import type { McpAppViewProps } from "@sumi/mcp-apps-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import type { z } from "zod";
import { GIT_ICON_SOURCE } from "../../lib/git-icon.js";
import { GIT_SHEET } from "../../lib/git-sheet.js";
import { ChangeNums } from "../change-nums/change-nums.js";
import { ChangeRows } from "./change-rows.js";
import { OpenedChange } from "./opened-change.js";

export const CHANGES_CARD_HEIGHT = 420;

const LAST_COMMIT = "HEAD";
const OPEN_LABEL = "Open in Git";
const BACK_LABEL = "Back to the files";
const FILES = "{count} files";
const ONE_FILE = "1 file";
const READING = "Reading changes…";

export function ChangesCard({ result }: McpAppViewProps<z.output<typeof ShownChangesSchema>>): ReactElement {
	const read = useOptionalQuery(git.repos.comparison, {
		root: result.folder,
		head: result.head,
		base: result.base ?? LAST_COMMIT,
		only: result.only,
	});
	const [opened, open] = useState<FileDiff | null>(null);
	const asked = new Set(result.paths);
	const files = (read.data?.files ?? []).filter(({ path }) => asked.size === 0 || asked.has(path));
	const isOne = files.length === 1;
	const shown = isOne ? (files[0] ?? null) : opened;
	const count = files.length;
	return (
		<McpAppCard look="tile">
			<div className="wg-git sumi-changes-card" style={{ height: CHANGES_CARD_HEIGHT }}>
				<style>{GIT_SHEET}</style>
				<div className="sumi-mcp-head">
					<div className="sumi-mcp-tag">
						{shown !== null && !isOne ? (
							<IconButton
								variant="ghost"
								size="xxs"
								className="sumi-mcp-tag-button"
								label={BACK_LABEL}
								title={BACK_LABEL}
								onClick={() => open(null)}
							>
								<svg viewBox="0 0 12 12" aria-hidden="true">
									<path d="M7.5 2.5L4 6l3.5 3.5" />
								</svg>
							</IconButton>
						) : (
							<img className="sumi-mcp-tag-glyph" src={GIT_ICON_SOURCE} alt="" />
						)}
						<span className="sumi-mcp-tag-title">{shown === null ? result.label : nameOf(shown.path)}</span>
						<span className="sumi-mcp-tag-meta">
							{shown === null ? (count === 1 ? ONE_FILE : FILES.replace("{count}", String(count))) : result.label}
						</span>
						<ChangeNums
							added={shown === null ? files.reduce((sum, file) => sum + file.added, 0) : shown.added}
							removed={shown === null ? files.reduce((sum, file) => sum + file.removed, 0) : shown.removed}
							hidesZero={true}
						/>
					</div>
					<Pressable asChild tone="muted">
						<a className="sumi-mcp-square" href={result.link} aria-label={OPEN_LABEL} title={OPEN_LABEL}>
							<svg viewBox="0 0 12 12" aria-hidden="true">
								<path d="M4 2h6v6M10 2L3 9" />
							</svg>
						</a>
					</Pressable>
				</div>
				<div className="sumi-changes-card-body">{bodyOf()}</div>
			</div>
		</McpAppCard>
	);

	function bodyOf(): ReactElement {
		if (read.failure !== null) {
			return <p className="sumi-changes-card-note">{read.failure}</p>;
		}

		if (read.data === null) {
			return <p className="sumi-changes-card-note">{READING}</p>;
		}

		if (shown === null) {
			return <ChangeRows files={files} onOpen={open} />;
		}

		return <OpenedChange folder={read.data.folder} range={read.data.range} file={shown} />;
	}
}

function nameOf(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}
