export class PhotoQueue {
	private readonly adding = new Map<string, Promise<void>>();

	after(app: string, write: () => Promise<void>): Promise<void> {
		const before = this.adding.get(app) ?? Promise.resolve();
		const adding = before.catch(() => undefined).then(write);
		this.adding.set(app, adding);
		const forget = (): void => {
			if (this.adding.get(app) === adding) this.adding.delete(app);
		};
		adding.then(forget, forget);
		return adding;
	}
}
