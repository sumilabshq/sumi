import { Component, Suspense, createElement as h } from "react";
import type { ReactNode } from "react";
import { reasonOf } from "./sends";

export type FailedView = (reason: string) => ReactNode;

export interface RequestBoundaryProps {
	readonly loading: ReactNode;
	readonly error: FailedView;
	readonly children?: ReactNode;
}

interface Failure {
	readonly reason: string | null;
}

export class RequestBoundary extends Component<RequestBoundaryProps, Failure> {
	override state: Failure = { reason: null };

	static getDerivedStateFromError(thrown: unknown): Failure {
		return { reason: reasonOf(thrown) };
	}

	override componentDidCatch(thrown: unknown): void {
		console.warn("[widgetarium] a block failed to read", thrown);
	}

	override render(): ReactNode {
		const { reason } = this.state;
		if (reason !== null) return this.props.error(reason);
		return h(Suspense, { fallback: this.props.loading }, this.props.children);
	}
}
