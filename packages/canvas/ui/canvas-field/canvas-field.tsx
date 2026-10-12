import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/mediator";
import { FieldStateQuery } from "../../requests/field/field-state.js";
import { FieldStage } from "./field-stage.js";

export function CanvasField(): ReactElement {
	const { page } = useQuery(FieldStateQuery).data;
	return <FieldStage key={page} />;
}
