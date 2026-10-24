import { createElement as h } from "react";
import { Dialog } from "radix-ui";
import { defineLayout, defineMetadata, defineStates } from "../packages/shared/core/src/gateway/declared.js";
import { createWidget } from "../packages/shared/core/src/widget-api.js";

const RenameDialogOpen = createWidget({
	draw: () =>
		h(
			Dialog.Root,
			{ open: true },
			h(
				Dialog.Portal,
				null,
				h(Dialog.Overlay, { key: "o" }),
				h(Dialog.Content, { key: "c" }, [
					h(Dialog.Title, { key: "t" }, "Rename"),
					h(Dialog.Description, { key: "d" }, "name"),
				]),
			),
		),
});

export const metadata = defineMetadata(RenameDialogOpen, {
	title: "Dialog",
	description: "An open dialog drawn as a picture",
	keywords: ["dialog"],
	props: {},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 360, preferredHeight: "auto" } });

export const states = defineStates(RenameDialogOpen, { Open: {} });

export default RenameDialogOpen;
