import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { FieldStateQuery } from "../../contract.js";
import { FieldStage } from "../../../../shared/ui/canvas-field/field-stage.js";

export function CanvasField(): ReactElement {
	const { page } = useQuery(FieldStateQuery).data;
	return <FieldStage key={page} />;
}
