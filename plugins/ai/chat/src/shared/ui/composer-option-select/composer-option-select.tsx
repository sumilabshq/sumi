import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { Icon, Select, SelectContent, SelectItem, SelectTrigger } from "@widgetarium/kit";
import type { ButtonForm } from "@widgetarium/kit";
import type { ComposerOptionProps } from "../composer-options/composer-options.js";

const CHIP_ICON_PX = 13;

export interface ComposerOptionSelectProps extends ComposerOptionProps {
	readonly optionKey: string;
	readonly align: "start" | "end";
	readonly className?: string;
	readonly form?: ButtonForm;
	readonly icons?: Readonly<Record<string, string>>;
	readonly warnValue?: string;
}

export function ComposerOptionSelect({
	chat,
	optionKey,
	align,
	className,
	form,
	icons,
	warnValue,
}: ComposerOptionSelectProps): ReactElement | null {
	const options = useOptionalQuery(assistant.runners.getOptions, { chat }).data ?? [];
	const choose = useCommand(assistant.runners.chooseOption);
	const shown = options.find(({ option }) => option.key === optionKey);

	if (shown === undefined) {
		return null;
	}

	const picked = shown.option.choices.find(({ value }) => value === shown.value);
	return (
		<Select
			value={shown.value}
			isPortaled
			onValueChange={(value) => void choose.run({ chat, key: optionKey, value: String(value) })}
		>
			<SelectTrigger
				variant="ghost"
				size="s"
				className={shown.value === warnValue ? `${className ?? ""} is-warn`.trim() : className}
				form={form}
				aria-label={shown.option.label}
			>
				{icons?.[shown.value] ? <Icon name={icons[shown.value] ?? ""} size={CHIP_ICON_PX} /> : null}
				{picked?.label ?? shown.value}
			</SelectTrigger>
			<SelectContent className="is-compact" side="top" align={align}>
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
