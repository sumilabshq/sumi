import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem } from "@widgetarium/kit";
import type { HitRow } from "../../lib/hit-rows.js";

const NO_MATCH = "Nothing matches";
const TRAIL_SEPARATOR = " › ";

export interface SettingsHitsProps {
	readonly rows: readonly HitRow[];
	readonly cursor: number;
	readonly onCursor: (at: number) => void;
	readonly onOpen: (row: HitRow) => void;
}

export function SettingsHits({ rows, cursor, onCursor, onOpen }: SettingsHitsProps): ReactElement {
	if (rows.length === 0) {
		return <p className="sumi-settings-group-label">{NO_MATCH}</p>;
	}

	return (
		<div className="sumi-settings-group">
			{rows.map((row, at) => (
				<PopoverItem
					key={`${row.hit.pageId}/${row.hit.sectionPath.join("/")}`}
					className="sumi-settings-item"
					highlighted={at === cursor}
					title={row.hit.title}
					icon={<Icon name={row.page.icon} size={16} />}
					sub={row.hit.trail.length === 0 ? undefined : row.hit.trail.join(TRAIL_SEPARATOR)}
					onPointerEnter={() => onCursor(at)}
					onClick={() => onOpen(row)}
				>
					<span className="sumi-settings-item-text">{row.hit.title}</span>
				</PopoverItem>
			))}
		</div>
	);
}
