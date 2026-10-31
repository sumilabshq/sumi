import { Component } from "react";
import type { ReactNode, RefObject } from "react";
import { sightOf } from "../../lib/layout-motion/layout-motion.js";
import type { LayoutMotion, Sight } from "../../lib/layout-motion/layout-motion.js";

export interface FlipLayoutProps {
	readonly holder: RefObject<HTMLElement | null>;
	readonly motion: LayoutMotion;
	readonly isArranging: boolean;
	readonly onLaidOut: () => void;
	readonly children: ReactNode;
}

const NOTHING_SEEN: Sight = new Map();

export class FlipLayout extends Component<FlipLayoutProps, object, Sight> {
	override getSnapshotBeforeUpdate(was: FlipLayoutProps): Sight {
		return this.isGliding(was) ? sightOf(this.props.holder.current) : NOTHING_SEEN;
	}

	override componentDidMount(): void {
		this.props.onLaidOut();
	}

	override componentDidUpdate(_was: FlipLayoutProps, _state: object, before: Sight): void {
		if (before === NOTHING_SEEN) {
			return;
		}

		const { motion, holder, onLaidOut } = this.props;
		motion.stop();
		const after = sightOf(holder.current);
		onLaidOut();
		motion.glide(before, after);
	}

	override componentWillUnmount(): void {
		this.props.motion.stop();
	}

	private isGliding(was: FlipLayoutProps): boolean {
		return this.props.isArranging || was.isArranging || this.props.motion.isMoving();
	}

	override render(): ReactNode {
		return this.props.children;
	}
}
