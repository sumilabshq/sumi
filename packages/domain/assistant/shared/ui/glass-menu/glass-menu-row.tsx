import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";

export interface GlassMenuRowProps {
	readonly text: string;
	readonly small?: string | undefined;
	readonly mark?: ReactNode;
	readonly isPicked?: boolean;
	readonly isActive?: boolean;
	readonly onPick: () => void;
}

export function GlassMenuRow({
	text,
	small,
	mark,
	isPicked = false,
	isActive = false,
	onPick,
}: GlassMenuRowProps): ReactElement {
	return (
		<button
			type="button"
			role={isPicked ? "menuitemradio" : "menuitem"}
			aria-checked={isPicked ? true : undefined}
			className={`wg-studio-ai-menu-row${small === undefined ? "" : " is-two"}${isPicked ? " is-picked" : ""}${isActive ? " is-active" : ""}`}
			onClick={onPick}
		>
			{mark === undefined ? null : <span className="wg-studio-ai-menu-mark">{mark}</span>}
			<span className="wg-studio-ai-menu-words">
				<span>{text}</span>
				{small === undefined ? null : <small>{small}</small>}
			</span>
			{isPicked ? (
				<span className="wg-studio-ai-menu-end">
					<Icon name="tick" size={16} />
				</span>
			) : null}
		</button>
	);
}
