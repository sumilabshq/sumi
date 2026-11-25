import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { appearance } from "@sumi/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Icon } from "@widgetarium/kit";
import { useRecentFonts } from "../../lib/recent-fonts.js";
import { FontExample } from "./font-example.js";

const ALL_FONTS = "All fonts";
const MOST_TILES = 3;

export interface FontPickerProps {
	readonly role: "heading" | "ui" | "code";
	readonly title: string;
	readonly hint: string;
}

export function FontPicker({ role, title, hint }: FontPickerProps): ReactElement {
	const fonts = useOptionalQuery(appearance.fonts.current).data?.[role];
	const choose = useCommand(appearance.fonts.choose);
	const [recent, remember] = useRecentFonts(role);
	const [isListOpen, setListOpen] = useState(false);
	const [words, setWords] = useState("");
	const [hovered, setHovered] = useState<string | null>(null);

	if (fonts === undefined) {
		return <section className="sumi-appearance-section" />;
	}

	const stackOf = (family: string): string =>
		fonts.available.find((one) => one.family === family)?.stack ?? fonts.chosen.stack;
	const pick = (family: string): void => {
		remember(family);
		setListOpen(false);
		setWords("");
		void choose.run({ role, family });
	};
	const offered = fonts.available.map((one) => one.family);
	const tiles = [...new Set([fonts.chosen.family, ...recent, ...offered])].slice(0, MOST_TILES);
	const matching = fonts.available.filter((one) => one.family.toLowerCase().includes(words.toLowerCase()));
	const labelOf = (family: string): string => {
		if (family === fonts.chosen.family) {
			return fonts.isDefault ? "default" : "chosen";
		}

		return recent.includes(family) ? "used recently" : "installed";
	};
	const exampleFamily = hovered ?? fonts.chosen.family;
	return (
		<section className="sumi-appearance-role">
			<div>
				<h3 className="sumi-appearance-role-name">{title}</h3>
				<p className="sumi-appearance-hint is-small">{hint}</p>
			</div>
			<div className="sumi-appearance-role-body">
				<div className="sumi-appearance-example" style={{ fontFamily: stackOf(exampleFamily) }}>
					<span className="sumi-appearance-example-label">
						<Icon name="eye" size={12} />
						Example
					</span>
					<FontExample role={role} />
				</div>
				<div className="sumi-appearance-fonts">
					{tiles.map((family) => (
						<div key={family} className="sumi-appearance-font">
							<button
								type="button"
								className="sumi-appearance-font-tile"
								style={{ fontFamily: stackOf(family) }}
								aria-pressed={family === fonts.chosen.family}
								onClick={() => pick(family)}
							>
								Aa
							</button>
							<span className="sumi-appearance-font-name">{family}</span>
							<span className="sumi-appearance-hint is-small">{labelOf(family)}</span>
						</div>
					))}
					<div className="sumi-appearance-font is-more">
						<button type="button" className="sumi-appearance-font-tile" onClick={() => setListOpen(!isListOpen)}>
							<Icon name="plus" size={20} />
						</button>
						<span className="sumi-appearance-font-name">{ALL_FONTS}</span>
						<span className="sumi-appearance-hint is-small">{`${fonts.available.length}, or upload`}</span>
					</div>
				</div>
				{isListOpen ? (
					<div
						className="sumi-appearance-fontlist"
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								setListOpen(false);
							}

							if (event.key === "Enter" && matching[0] !== undefined) {
								pick(matching[0].family);
							}
						}}
						onMouseLeave={() => setHovered(null)}
					>
						<input
							autoFocus
							className="sumi-appearance-fontsearch"
							placeholder="Search fonts"
							value={words}
							onChange={(event) => setWords(event.target.value)}
						/>
						{matching.map((one) => (
							<button
								key={one.family}
								type="button"
								className="sumi-appearance-fontrow"
								style={{ fontFamily: one.stack }}
								onMouseEnter={() => setHovered(one.family)}
								onClick={() => pick(one.family)}
							>
								{one.family}
							</button>
						))}
					</div>
				) : null}
			</div>
		</section>
	);
}
