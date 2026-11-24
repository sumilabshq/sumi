import { createElement as h, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { Popover, PopoverContent } from "@widgetarium/kit";
import type { FlowIcon } from "@widgetarium/navigation/contract";
import { FlowGlyph } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import type { FlowGlyphProps } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import { useFieldDraft } from "../../lib/use-field-draft.js";
import { IconPicker } from "./icon-picker.js";

const CHANGE_ICON = "Change icon";

export interface RowFieldProps {
	readonly name: string;
	readonly icon: FlowIcon | null;
	readonly fallback: FlowGlyphProps["fallback"];
	readonly onCommit: (name: string) => void;
	readonly onIcon: (icon: FlowIcon | null) => void;
	readonly onDone: () => void;
}

export function RowField({ name, icon, fallback, onCommit, onIcon, onDone }: RowFieldProps): ReactElement {
	const [isPicking, setIsPicking] = useState(false);
	const draft = useFieldDraft({ name, onCommit, onDone });
	const pick = (picked: FlowIcon | null): void => {
		setIsPicking(false);
		onIcon(picked);
	};
	return (
		<div className="sumi-flows-field">
			<Popover open={isPicking} onOpenChange={setIsPicking} isPortaled>
				<button
					type="button"
					className="sumi-flows-field-icon"
					aria-label={CHANGE_ICON}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => setIsPicking((was) => !was)}
				>
					<FlowGlyph icon={icon} fallback={fallback} />
				</button>
				<PopoverContent side="right" align="start">
					<IconPicker icon={icon} onPick={pick} />
				</PopoverContent>
			</Popover>
			<input
				className="sumi-flows-field-input"
				value={draft.typed}
				aria-label="Name"
				autoFocus
				onFocus={(event) => event.currentTarget.select()}
				onChange={(event) => draft.setTyped(event.currentTarget.value)}
				onKeyDown={(event) => finishOnKey(event, draft.finish)}
				onBlur={() => isPicking || draft.finish(true)}
			/>
		</div>
	);
}

function finishOnKey(event: KeyboardEvent, finish: (isCommitted: boolean) => void): void {
	if (event.key === "Enter") {
		finish(true);
	}

	if (event.key === "Escape") {
		finish(false);
	}
}
