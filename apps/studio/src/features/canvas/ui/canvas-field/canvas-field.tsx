import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { canvas } from "@widgetarium/canvas/contract";
import { FieldStage } from "./field-stage.js";

export function CanvasField(): ReactElement {
	const { page } = useQuery(canvas.field.picking).data;
	return <FieldStage key={page} />;
}
