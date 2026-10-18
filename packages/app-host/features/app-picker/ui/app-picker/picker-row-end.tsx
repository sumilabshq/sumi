import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { PickerApp } from "../../contract.js";
import { AddBuiltIn } from "./add-built-in.js";
import { LaterBadge } from "./later-badge.js";
import { OpenMyApp } from "./open-my-app.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";

export interface PickerRowEndProps {
	readonly app: PickerApp;
	readonly onAdd: (app: AppKind) => void;
}

export function PickerRowEnd({ app, onAdd }: PickerRowEndProps): ReactElement {
	if (app.kind === "planned") {
		return <LaterBadge />;
	}

	if (app.kind === "mine") {
		return <OpenMyApp app={app} />;
	}

	return <AddBuiltIn app={app} onAdd={onAdd} />;
}
