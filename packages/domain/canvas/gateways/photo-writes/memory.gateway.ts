import { PhotoWritesGateway } from "./photo-writes.gateway.js";
import type { PhotoWrite } from "./photo-writes.gateway.js";

export class MemoryPhotoWritesGateway extends PhotoWritesGateway {
	private readonly writing = new Map<string, Promise<void>>();

	override queuePhotoWrite(app: string, write: PhotoWrite): Promise<void> {
		const before = this.writing.get(app) ?? Promise.resolve();
		const written = before.catch(() => undefined).then(write);
		this.writing.set(app, written);
		const forget = (): void => {
			if (this.writing.get(app) === written) {
				this.writing.delete(app);
			}
		};
		written.then(forget, forget);
		return written;
	}
}
