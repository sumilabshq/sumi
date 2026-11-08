import { createElement as h, useCallback, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Popover, PopoverContent, PopoverSearch } from "@widgetarium/kit";
import type { GlyphName } from "../../lib/glyph-paths.js";
import { Glyph } from "../glyph/glyph.js";

export interface PickerProps {
	readonly glyph: GlyphName;
	readonly lead?: string;
	readonly value: string;
	readonly placeholder: string;
	readonly children: (filter: string, close: () => void) => ReactNode;
}

const MENU_GAP_PX = 4;

export function Picker({ glyph, lead, value, placeholder, children }: PickerProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const close = useCallback(() => setOpen(false), []);
	return (
		<div className="wg-git-pick">
			<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
				<button
					className={isOpen ? "wg-git-row is-act" : "wg-git-row"}
					aria-expanded={isOpen}
					onClick={() => setOpen(!isOpen)}
				>
					<Glyph name={glyph} />
					{lead === undefined ? null : <span className="wg-git-lbl">{lead}</span>}
					<span className="wg-git-nm is-fill">{value}</span>
					<span className="is-faint">
						<Glyph name="chevronDown" size={14} />
					</span>
				</button>
				<PopoverContent side="bottom" align="start" sideOffset={MENU_GAP_PX} className="wg-git-menu">
					<PopoverSearch placeholder={placeholder}>{(filter) => children(filter, close)}</PopoverSearch>
				</PopoverContent>
			</Popover>
		</div>
	);
}
