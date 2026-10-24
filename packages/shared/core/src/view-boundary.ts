import { Component, createElement as h } from "react";
import type { ComponentType, ReactNode } from "react";
import { isObject } from "./engine/is-object.js";
import type { FailedViewProps } from "./widget-builder-types.js";

const DID_NOT_DRAW = "The widget could not be drawn";

export interface ViewBoundaryProps {
	readonly failed: ComponentType<FailedViewProps> | null;
	readonly children?: ReactNode;
}

interface ViewBoundaryState {
	readonly failure: string | null;
}

export class ViewBoundary extends Component<ViewBoundaryProps, ViewBoundaryState> {
	override state: ViewBoundaryState = { failure: null };

	static getDerivedStateFromError(thrown: unknown): ViewBoundaryState {
		return { failure: reasonOf(thrown) };
	}

	override componentDidCatch(thrown: unknown): void {
		console.error("[widgetarium] a view threw while drawing", thrown);
	}

	override render(): ReactNode {
		const { failure } = this.state;
		if (failure === null) return this.props.children;
		const failures = [`view: ${failure}`];
		if (this.props.failed) return h(this.props.failed, { failures });
		return h("div", { className: "wg-error", "data-wg-view-failed": "" }, [
			h("b", { key: "what" }, DID_NOT_DRAW),
			h("code", { key: "why" }, failures[0]),
		]);
	}
}

function reasonOf(thrown: unknown): string {
	if (isObject(thrown) && typeof thrown["message"] === "string") return thrown["message"];
	return String(thrown);
}
