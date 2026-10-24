import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MenuOpening } from "../../lib/menu-spot.js";
import { GlassMenu } from "../glass-menu/glass-menu.js";
import { GlassMenuRow } from "../glass-menu/glass-menu-row.js";
import type { OptionFace } from "../../lib/strip-faces.js";

export interface OptionMenuProps<Value extends string> {
	readonly label: string;
	readonly width: number;
	readonly opening: MenuOpening;
	readonly faces: Readonly<Record<Value, OptionFace>>;
	readonly picked: Value;
	readonly onPick: (value: Value) => void;
}

export function OptionMenu<Value extends string>({
	label,
	width,
	opening,
	faces,
	picked,
	onPick,
}: OptionMenuProps<Value>): ReactElement {
	const values = Object.keys(faces).filter((value): value is Value => value in faces);
	return (
		<GlassMenu spot={opening.spot} label={label} width={width} onDismiss={opening.close}>
			{values.map((value) => (
				<GlassMenuRow
					key={value}
					text={faces[value].label}
					small={faces[value].small}
					isPicked={value === picked}
					onPick={() => {
						opening.close();
						onPick(value);
					}}
				/>
			))}
		</GlassMenu>
	);
}
