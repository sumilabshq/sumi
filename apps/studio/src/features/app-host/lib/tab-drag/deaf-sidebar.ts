const POINTER_EVENTS = "pointer-events";

export class DeafSidebar {
	private deafened: readonly HTMLElement[] = [];

	constructor(private readonly holder: HTMLElement) {}

	deafen(): void {
		this.deafened = [...this.holder.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
		this.deafened.forEach((child) => child.style.setProperty(POINTER_EVENTS, "none"));
	}

	hearAgain(): void {
		this.deafened.forEach((child) => child.style.removeProperty(POINTER_EVENTS));
		this.deafened = [];
	}
}
