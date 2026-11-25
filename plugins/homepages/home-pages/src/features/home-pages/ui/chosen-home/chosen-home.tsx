import { createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { homePages } from "@sumi/home-pages/contract";
import type { FilledHomePage } from "../../lib/filled-home-page.js";
import { EditToggle } from "../edit-toggle/edit-toggle.js";
import { HomeSwitch } from "../home-switch/home-switch.js";

export interface ChosenHomeProps {
	readonly tabId: string;
	readonly children: ReactNode;
}

export type ChosenHome = (props: ChosenHomeProps) => ReactNode;

export function chosenHomeOf(filled: readonly FilledHomePage[]): ChosenHome {
	return function ChosenHome({ tabId, children }: ChosenHomeProps): ReactNode {
		const shown = useOptionalQuery(homePages.pages.all).data;
		const [isEditing, setEditing] = useState(false);

		if (shown === undefined || shown === null) {
			return <div className="sumi-home-pages" />;
		}

		const page = filled.find(({ id }) => id === shown.chosen);

		if (page === undefined) {
			return children;
		}

		const View = page.view;
		return (
			<div className="sumi-home-pages" data-home-page={page.id}>
				<View tabId={tabId} />
				<EditToggle isEditing={isEditing} onToggle={() => setEditing(!isEditing)} />
				{/* TODO: edit mode tile removal, setups has no remove request */}
				{isEditing && shown.pages.length > 1 ? <HomeSwitch pages={shown.pages} chosen={page.id} /> : null}
			</div>
		);
	};
}
