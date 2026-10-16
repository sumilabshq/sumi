import { Component, Suspense, createElement as h } from "react";
import type { ContextType, ReactNode } from "react";
import { reasonOf } from "./answer";
import { APP } from "./app-context";
import { reportToConsole } from "./report-failure";
import { RequestFailed } from "./request-failed";

export type FailedView = (reason: string) => ReactNode;

interface RequestBoundaryProps {
	readonly loading: ReactNode;
	readonly error: FailedView;
	readonly children?: ReactNode;
}

interface Failure {
	readonly reason: string | null;
}

const A_BLOCK = "a block";

export class RequestBoundary extends Component<RequestBoundaryProps, Failure> {
	static override contextType = APP;
	declare context: ContextType<typeof APP>;
	override state: Failure = { reason: null };

	static getDerivedStateFromError(thrown: unknown): Failure {
		return { reason: reasonOf(thrown) };
	}

	override componentDidCatch(thrown: unknown): void {
		if (thrown instanceof RequestFailed) {
			this.context?.queryClient.removeQueries({ queryKey: thrown.queryKey, exact: true });
			return;
		}
		const report = this.context?.reportFailure ?? reportToConsole;
		report({ source: A_BLOCK, reason: reasonOf(thrown), code: "failed", ran: false, thrown });
	}

	override render(): ReactNode {
		const { reason } = this.state;
		if (reason !== null) return this.props.error(reason);
		return h(Suspense, { fallback: this.props.loading }, this.props.children);
	}
}
