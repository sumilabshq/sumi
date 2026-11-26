import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SettingsPage, SettingsSection } from "@sumi/settings-ui-plugin";
import { FontPicker } from "../font-picker/font-picker.js";
import { InkPicker } from "../ink-picker/ink-picker.js";
import { ThemePicker } from "../theme-picker/theme-picker.js";

export function AppearancePage(): ReactElement {
	return (
		<SettingsPage className="sumi-appearance">
			<ThemePicker />
			<InkPicker />
			<SettingsSection id="text">
				<FontPicker role="heading" id="headings" />
				<FontPicker role="ui" id="ui" />
				<FontPicker role="code" id="code" />
			</SettingsSection>
		</SettingsPage>
	);
}
