import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { ChangeMenuDoorCommand } from "@widgetarium/command-menu";
import type { Door } from "@widgetarium/command-menu";
import { useSelectsFieldOnMount } from "../../lib/use-selects-field-on-mount.js";

export interface MenuFieldProps {
	readonly door: Door;
	readonly text: string;
	readonly ghost: string;
	readonly onText: (text: string) => void;
	readonly onKey: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const PLACEHOLDER: Readonly<Record<Door, string>> = {
	anywhere: "Search tabs, chats, apps, or type an address",
	"new-tab": "Address, app or search",
	"this-tab": "Address or search, opens in this tab",
};
const TOKEN: Readonly<Record<Door, string>> = {
	anywhere: "",
	"new-tab": "New tab",
	"this-tab": "In this tab",
};
const SEARCH_EVERYTHING = "Remove, search everything";
const FIELD_LABEL = "Search tabs, chats, apps and the web";

export function MenuField({ door, text, ghost, onText, onKey }: MenuFieldProps): ReactElement {
	const field = useSelectsFieldOnMount();
	const changeDoor = useCommand(ChangeMenuDoorCommand);
	return (
		<div className="wg-cm-field">
			<Icon name="search" size={18} />
			{door === "anywhere" ? null : (
				<span className="wg-cm-token" data-cm-token={door}>
					<Icon name={door === "new-tab" ? "plus" : "arrow-right-left"} size={12} />
					{TOKEN[door]}
					<button
						type="button"
						className="wg-cm-token-drop"
						aria-label={SEARCH_EVERYTHING}
						onClick={() => {
							void changeDoor.run({ door: "anywhere" });
							field.current?.focus();
						}}
					>
						<Icon name="x" size={10} />
					</button>
				</span>
			)}
			<span className="wg-cm-input-wrap">
				<span className="wg-cm-ghost" aria-hidden="true">
					<span className="wg-cm-ghost-typed">{text}</span>
					{ghost}
				</span>
				<input
					ref={field}
					className="wg-cm-input"
					value={text}
					placeholder={PLACEHOLDER[door]}
					aria-label={FIELD_LABEL}
					spellCheck={false}
					onChange={(event) => onText(event.currentTarget.value)}
					onKeyDown={onKey}
				/>
			</span>
		</div>
	);
}
