import { createElement as h } from "react";
import type { ReactElement } from "react";
import { FontPicker } from "../font-picker/font-picker.js";
import { InkPicker } from "../ink-picker/ink-picker.js";
import { ThemePicker } from "../theme-picker/theme-picker.js";

export function AppearancePage(): ReactElement {
	return (
		<div className="sumi-appearance">
			<h1 className="sumi-settings-page-title">Appearance</h1>
			<p className="sumi-appearance-lede">How Sumi looks on this computer. Every change shows at once.</p>
			<ThemePicker />
			<InkPicker />
			<section className="sumi-appearance-section">
				<h2 className="sumi-appearance-heading">Text</h2>
				<p className="sumi-appearance-hint">Sumi uses three kinds of text. Pick a font for each.</p>
				<FontPicker role="heading" title="Headings" hint="Page titles, greetings, a document's name." />
				<FontPicker role="ui" title="Interface and chat" hint="Messages, menus, settings." />
				<FontPicker role="code" title="Code" hint="Code blocks, commands, file names in code." />
			</section>
		</div>
	);
}
