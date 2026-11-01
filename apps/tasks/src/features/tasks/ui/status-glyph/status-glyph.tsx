import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { TaskStatus } from "@widgetarium/tasks";

export interface StatusGlyphProps {
	readonly status: TaskStatus;
}

export function StatusGlyph({ status }: StatusGlyphProps): ReactElement {
	const [shown, setShown] = useState(status);
	const [leaving, setLeaving] = useState<TaskStatus | null>(null);

	if (shown !== status) {
		setLeaving(shown);
		setShown(status);
	}

	return (
		<span className="wg-tasks-st-swap" aria-hidden="true">
			<span key={status} className="wg-tasks-st" data-status={status} />
			{leaving === null ? null : (
				<span
					key={`leaving:${leaving}`}
					className="wg-tasks-st"
					data-status={leaving}
					data-leaving=""
					onAnimationEnd={() => setLeaving(null)}
				/>
			)}
		</span>
	);
}
