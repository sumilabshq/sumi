import { createElement as h, Fragment } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon } from "@widgetarium/kit";
import { ControlMenuRow } from "@sumi/control-menu-plugin";
import { tabViews } from "@sumi/tab-views/contract";
import { useChosenView } from "../../lib/use-chosen-view.js";
import type { TabView } from "../../lib/tab-view.js";

const CHOSEN_MARK = "✓";

export function viewRowsOf(views: readonly TabView[]): () => ReactNode {
	return function TabViewRows(): ReactNode {
		const chosen = useChosenView(views);
		const choose = useCommand(tabViews.views.choose);

		if (views.length < 2) {
			return null;
		}

		return (
			<>
				{views.map((view) => (
					<ControlMenuRow
						key={view.id}
						label={view.label}
						keys={view.id === chosen?.id ? CHOSEN_MARK : null}
						icon={<Icon name={view.icon} />}
						onRun={() => void choose.run({ view: view.id })}
					/>
				))}
			</>
		);
	};
}
