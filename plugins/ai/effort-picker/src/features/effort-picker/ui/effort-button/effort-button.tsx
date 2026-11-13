import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@widgetarium/kit";
import type { ComposerOptionProps } from "@sumi/chat-plugin";

const EFFORT = "effort";

export function EffortButton({ chat }: ComposerOptionProps): ReactElement | null {
	const options = useOptionalQuery(assistant.runners.getOptions, { chat }).data ?? [];
	const choose = useCommand(assistant.runners.chooseOption);
	const shown = options.find(({ option }) => option.key === EFFORT);

	if (shown === undefined) {
		return null;
	}

	const picked = shown.option.choices.find(({ value }) => value === shown.value);
	return (
		<Select
			value={shown.value}
			isPortaled
			onValueChange={(value) => void choose.run({ chat, key: EFFORT, value: String(value) })}
		>
			<SelectTrigger variant="ghost" size="sm" aria-label={shown.option.label}>
				{picked?.label ?? shown.value}
			</SelectTrigger>
			<SelectContent className="is-compact" side="top" align="end">
				<div className="wg-kit-menu-label">{shown.option.label}</div>
				{shown.option.choices.map((choice) => (
					<SelectItem key={choice.value} value={choice.value} sub={choice.note}>
						{choice.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
