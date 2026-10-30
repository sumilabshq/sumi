import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { RowFace } from "../../lib/tabs-sidebar/row-face.js";
import { TabRowClose } from "./tab-row-close.js";
import { TabRowOwnWindow } from "./tab-row-own-window.js";
import { UnreadDot } from "./unread-dot.js";
import { RowBadgeMark } from "./row-badge.js";
import type { RowBadge } from "./row-badge.js";
import { FoldChevron } from "./fold-chevron.js";
import type { RowFold } from "./fold-chevron.js";

export interface RowTailProps {
	readonly face: RowFace;
	readonly badge: RowBadge | null;
	readonly onClose: (() => void) | null;
	readonly fold: RowFold | null;
}

export function RowTail({ face, badge, onClose, fold }: RowTailProps): ReactElement {
	return (
		<Fragment>
			{badge === null ? null : <RowBadgeMark badge={badge} />}
			{face.isUnread ? <UnreadDot /> : null}
			{face.isInOwnWindow ? <TabRowOwnWindow /> : null}
			{onClose === null ? null : <TabRowClose title={face.title} tabId={face.id} onClose={onClose} />}
			{fold === null ? null : <FoldChevron title={face.title} fold={fold} />}
		</Fragment>
	);
}
