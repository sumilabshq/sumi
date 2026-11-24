import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";

const MARK_ALL_READ = "Mark all as read";
const ICON_PX = 13;

export function MarkAllReadButton({ onClear }: { readonly onClear: () => void }): ReactElement {
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="xs"
			label={MARK_ALL_READ}
			{...tooltipMarks({ said: MARK_ALL_READ })}
			onClick={onClear}
		>
			<Icon name="view" size={ICON_PX} />
		</Button>
	);
}
