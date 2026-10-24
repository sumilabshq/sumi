import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AlertDialog, Dialog } from "radix-ui";
import { StateDrawing } from "../packages/domain/canvas/shared/ui/state-drawing/state-drawing.tsx";
import { ModuleRegistry } from "../packages/shared/core/src/engine/module-registry.js";
import { defineLayout, defineMetadata } from "../packages/shared/core/src/gateway/declared.js";
import { createWidget } from "../packages/shared/core/src/widget-api.js";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const RenameDialogOpen = createWidget({
	draw: () =>
		h(
			Dialog.Root,
			{ open: true },
			h(
				Dialog.Portal,
				null,
				h(Dialog.Overlay, { key: "o" }),
				h(Dialog.Content, { id: "rename" }, [
					h(Dialog.Title, { key: "t" }, "Rename"),
					h(Dialog.Description, { key: "d" }, "name"),
				]),
			),
		),
});

const DeleteQuestionOpen = createWidget({
	draw: () =>
		h(
			AlertDialog.Root,
			{ open: true },
			h(
				AlertDialog.Portal,
				null,
				h(AlertDialog.Overlay, { key: "o" }),
				h(AlertDialog.Content, { id: "delete" }, [
					h(AlertDialog.Title, { key: "t" }, "Delete?"),
					h(AlertDialog.Description, { key: "d" }, "all turns"),
				]),
			),
		),
});

function moduleOf(widget: typeof RenameDialogOpen | typeof DeleteQuestionOpen): object {
	return {
		default: widget,
		metadata: defineMetadata(widget, {
			title: "Dialog",
			description: "An open dialog",
			keywords: ["dialog"],
			props: {},
		}),
		layout: defineLayout({ role: "control", size: { preferredWidth: 360, preferredHeight: "auto" } }),
	};
}

const registry = new ModuleRegistry({ rename: moduleOf(RenameDialogOpen), delete: moduleOf(DeleteQuestionOpen) });

const picture = (widget: string) => ({ widget, props: {}, mounts: null });
const host = document.getElementById("root");
if (!host) throw new Error("the page has no root");
const root = createRoot(host);
Reflect.set(window, "__DRAW__", (widget: string) => {
	root.render(h(StateDrawing, { registry, picture: picture(widget) }));
});
Reflect.set(window, "__CLEAR__", () => root.render(null));
