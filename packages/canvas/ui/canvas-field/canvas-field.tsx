import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { FieldStateQuery } from "../../features/field/contract.js";
import { FieldStage } from "./field-stage.js";

export function CanvasField(): ReactElement {
	const { page } = useQuery(FieldStateQuery).data;
	return <FieldStage key={page} />;
}
