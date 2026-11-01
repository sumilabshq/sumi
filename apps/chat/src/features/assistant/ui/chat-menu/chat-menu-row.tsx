import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";

export interface ChatMenuRowProps {
	readonly text: string;
	readonly small?: string | undefined;
	readonly mark?: ReactNode;
	readonly end?: ReactNode;
	readonly isPicked?: boolean;
	readonly isActive?: boolean;
	readonly onPick: () => void;
}

export function ChatMenuRow({
	text,
	small,
	mark,
	end,
	isPicked = false,
	isActive = false,
	onPick,
}: ChatMenuRowProps): ReactElement {
	const tail = isPicked ? <Icon name="tick" size={16} /> : end;
	return (
		<button
			type="button"
			{...pickedAriaOf(isPicked)}
			className={rowClassOf(small !== undefined, isPicked, isActive)}
			onClick={onPick}
		>
			{mark === undefined ? null : <span className="wg-studio-ai-menu-mark">{mark}</span>}
			<span className="wg-studio-ai-menu-words">
				<span>{text}</span>
				{small === undefined ? null : <small>{small}</small>}
			</span>
			{tail === undefined ? null : <span className="wg-studio-ai-menu-end">{tail}</span>}
		</button>
	);
}

function pickedAriaOf(isPicked: boolean): { readonly role: string; readonly "aria-checked"?: true } {
	if (isPicked) {
		return {
			role: "menuitemradio",
			"aria-checked": true,
		};
	}

	return { role: "menuitem" };
}

function rowClassOf(isTwoLines: boolean, isPicked: boolean, isActive: boolean): string {
	return ["wg-studio-ai-menu-row", isTwoLines ? "is-two" : "", isPicked ? "is-picked" : "", isActive ? "is-active" : ""]
		.filter((name) => name !== "")
		.join(" ");
}
