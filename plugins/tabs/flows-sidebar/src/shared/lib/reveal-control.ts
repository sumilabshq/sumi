export const CONCEAL_DELAY_MS = 250;

export interface RevealActions {
	peek(): void;
	conceal(): void;
	isPointerInside(): boolean;
}

export class RevealControl {
	private holds = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor(private readonly actions: RevealActions) {}

	enter(): void {
		this.cancel();
		this.actions.peek();
	}

	leave(): void {
		this.arm();
	}

	hold(): () => void {
		let isReleased = false;
		this.holds += 1;
		return () => {
			if (isReleased) {
				return;
			}

			isReleased = true;
			this.holds -= 1;
			this.arm();
		};
	}

	dispose(): void {
		this.cancel();
	}

	private arm(): void {
		this.cancel();
		this.timer = setTimeout(() => this.concealIfIdle(), CONCEAL_DELAY_MS);
	}

	private concealIfIdle(): void {
		this.timer = null;

		if (this.holds === 0 && !this.actions.isPointerInside()) {
			this.actions.conceal();
		}
	}

	private cancel(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
