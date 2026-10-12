import { createElement as h } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata } from "@widgetarium/core";
import { LookPickSchema, LookReadSchema } from "../../schemas/look.schema.js";
import { LookPanel } from "./ui/look-panel.js";

const LookPanelWidget = createWidget({
	inject: {
		getLook: IQuery.output(LookReadSchema.nullable().default(null)),
		pickLook: ICommand.input(LookPickSchema),
	},
	draw: ({ getLook, pickLook }) => (getLook ? <LookPanel read={getLook} pickLook={pickLook} /> : null),
});

export const metadata = defineMetadata(LookPanelWidget, {
	title: "Look panel",
	description: "The app's look: its design system and one choice per setting, drawn live into the pages.",
	keywords: ["design", "canvas", "look", "theme", "design system", "settings"],
	props: {
		getLook: { label: "Look", hint: "The design system and the settings picked in it." },
		pickLook: { label: "Pick a look", hint: "Picks one option of a setting." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 248, preferredHeight: "auto" } });

export default LookPanelWidget;
