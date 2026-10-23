import { handler, refuse } from "@widgetarium/core/requests";
import { PaneTreeStore } from "../../shared/lib/pane-tree-store.js";
import { ShellClientModule } from "../../module.js";
import { ClosePaneCommand, PaneTreeQuery, PlacePaneCommand, ResizePaneSplitCommand } from "./contract.js";

const NO_PANE = 'no pane "{id}" stands on the board';

export const PaneTreeQueryHandler = handler(PaneTreeQuery, ShellClientModule)
	.inject({ paneTreeStore: PaneTreeStore })
	.watch((_input, { paneTreeStore }, changed) => paneTreeStore.watch(changed))
	.handle((_input, { paneTreeStore }) => paneTreeStore.now());

export const PlacePaneCommandHandler = handler(PlacePaneCommand, ShellClientModule)
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ view, targetId, side }, { paneTreeStore }) => {
		if (targetId !== null && !paneTreeStore.hasPane(targetId)) {
			return refuse(NO_PANE.replace("{id}", targetId));
		}

		paneTreeStore.place(view, {
			targetId,
			side,
		});
	});

export const ClosePaneCommandHandler = handler(ClosePaneCommand, ShellClientModule)
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ id }, { paneTreeStore }) => {
		if (!paneTreeStore.hasPane(id)) {
			return refuse(NO_PANE.replace("{id}", id));
		}

		paneTreeStore.close(id);
	});

export const ResizePaneSplitCommandHandler = handler(ResizePaneSplitCommand, ShellClientModule)
	.inject({ paneTreeStore: PaneTreeStore })
	.handle(({ splitId, at, share }, { paneTreeStore }) => {
		paneTreeStore.resize(splitId, at, share);
	});
