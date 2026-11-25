import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import type { ComposerOptionProps } from "@sumi/chat-plugin";
import { chosenLabelOf, effortLabelOf, effortOf } from "../../lib/model-labels.js";
import { ModelMenu } from "./model-menu.js";
import { RunnerMark } from "./runner-mark.js";

const MODEL = "Model";

export function ModelButton({ chat }: ComposerOptionProps): ReactElement | null {
	const shown = useOptionalQuery(assistant.runners.getRunners, { chat }).data ?? null;
	const options = useOptionalQuery(assistant.runners.getOptions, { chat }).data ?? [];
	const [isOpen, setOpen] = useState(false);

	if (shown === null || shown.runners.length === 0) {
		return null;
	}

	const effort = effortOf(options);
	const effortLabel = effortLabelOf(effort);

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="xs" form="round" className="sumi-model-trigger" aria-label={MODEL}>
					<RunnerMark runner={shown.chosenRunner} />
					<span className="sumi-model-name">{chosenLabelOf(shown)}</span>
					{effortLabel === null ? null : <span className="sumi-model-effort">{effortLabel}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent side="top" align="center" size="xl" className="sumi-model-menu">
				<ModelMenu chat={chat} shown={shown} effort={effort} onPicked={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}
