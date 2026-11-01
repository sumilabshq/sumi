import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskDoc } from "@widgetarium/tasks";
import { Icon } from "@widgetarium/kit";
import { agoOf } from "../../lib/task-times.js";
import { DOC_ICONS, DOC_WORDS } from "../../lib/task-words.js";

export interface DocumentsListProps {
	readonly documents: readonly TaskDoc[];
}

const FIRST_LINES = 3;

export function documentsSaidOf(documents: readonly TaskDoc[]): string {
	return documents.map((doc) => doc.title).join(", ");
}

export function DocumentsList({ documents }: DocumentsListProps): ReactElement {
	return (
		<div className="wg-tasks-docs">
			{documents.map((doc) => (
				<article key={doc.id} className="wg-tasks-doc" data-tasks-doc={doc.id}>
					<span className="wg-tasks-doc-tile">
						<Icon name={DOC_ICONS[doc.kind]} size={16} />
					</span>
					<div className="wg-tasks-doc-text">
						<div className="wg-tasks-doc-head">
							<b>{doc.title}</b>
							<span className="wg-tasks-mono wg-tasks-t3 wg-tasks-ell">{doc.path ?? DOC_WORDS[doc.kind]}</span>
						</div>
						{doc.body === null ? null : (
							<div className="wg-tasks-t2 wg-tasks-small wg-tasks-clamp">{firstLinesOf(doc.body)}</div>
						)}
						<div className="wg-tasks-t3 wg-tasks-small">{`${DOC_WORDS[doc.kind]} · ${doc.by} · ${agoOf(doc.at, Date.now())}`}</div>
					</div>
				</article>
			))}
		</div>
	);
}

function firstLinesOf(body: string): string {
	return body
		.split("\n")
		.map((line) => line.replace(/^#+\s*/, "").trim())
		.filter((line) => line !== "")
		.slice(0, FIRST_LINES)
		.join(" ");
}
