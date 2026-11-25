import { createElement as h } from "react";
import type { ReactElement } from "react";
import { appearance } from "@sumi/contract";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { ThemePaper } from "./theme-paper.js";

const CHOICES = [
	{ choice: "system", label: "System", hint: "follows macOS" },
	{ choice: "light", label: "Light", hint: "white paper" },
	{ choice: "dark", label: "Dark", hint: "black paper" },
] as const;

export function ThemePicker(): ReactElement {
	const current = useOptionalQuery(appearance.theme.current).data?.choice ?? null;
	const choose = useCommand(appearance.theme.choose);
	return (
		<section className="sumi-appearance-section">
			<h2 className="sumi-appearance-heading">Theme</h2>
			<p className="sumi-appearance-hint">Black paper or white paper. System follows macOS.</p>
			<div className="sumi-appearance-themes">
				{CHOICES.map(({ choice, label, hint }) => (
					<button
						key={choice}
						type="button"
						className="sumi-appearance-theme"
						data-theme-choice={choice}
						aria-pressed={current === choice}
						onClick={() => void choose.run({ choice })}
					>
						<span className="sumi-appearance-theme-picture">
							{choice === "dark" ? null : <ThemePaper paper="light" />}
							{choice === "light" ? null : <ThemePaper paper="dark" isSplit={choice === "system"} />}
						</span>
						<span className="sumi-appearance-theme-name">{label}</span>
						<span className="sumi-appearance-hint">{hint}</span>
					</button>
				))}
			</div>
		</section>
	);
}
