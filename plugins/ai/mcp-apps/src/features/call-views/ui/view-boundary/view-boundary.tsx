import { Component } from "react";
import type { ReactNode } from "react";

export interface ViewBoundaryProps {
	readonly name: string;
	readonly children: ReactNode;
}

interface ViewBoundaryState {
	readonly hasThrown: boolean;
}

const THREW = "[mcp-apps] {name}: the view threw, the tool row stays";

export class ViewBoundary extends Component<ViewBoundaryProps, ViewBoundaryState> {
	override state: ViewBoundaryState = { hasThrown: false };

	static getDerivedStateFromError(): ViewBoundaryState {
		return { hasThrown: true };
	}

	override componentDidCatch(error: unknown): void {
		console.error(THREW.replace("{name}", this.props.name), error);
	}

	override render(): ReactNode {
		return this.state.hasThrown ? null : this.props.children;
	}
}
