import { createElement as h, Fragment, useCallback, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Popover, PopoverContent, PopoverSearch, SidePanelRow } from "@widgetarium/kit";
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
				<SidePanelRow
					icon={<Glyph name={glyph} />}
					label={
						lead === undefined ? (
							value
						) : (
							<Fragment>
								<span className="wg-git-lbl">{lead}</span> {value}
							</Fragment>
						)
					}
					end={<Glyph name="chevronDown" size={14} />}
					isOpen={isOpen}
					aria-expanded={isOpen}
					onClick={() => setOpen(!isOpen)}
				/>
				<PopoverContent side="bottom" align="start" sideOffset={MENU_GAP_PX} className="wg-git-menu">
					<PopoverSearch placeholder={placeholder}>{(filter) => children(filter, close)}</PopoverSearch>
				</PopoverContent>
			</Popover>
		</div>
	);
}
