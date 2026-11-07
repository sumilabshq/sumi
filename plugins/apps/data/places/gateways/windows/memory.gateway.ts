import type { MoveWindows, Windows, WindowsMoved } from "../../shared/schema/windows.schema.js";
import { WindowsGateway } from "./windows.gateway.js";

export class MemoryWindowsGateway extends WindowsGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: Windows) {
		super();
	}

	override windows(): Promise<Windows> {
		return Promise.resolve(this.held);
	}

	override moveWindows(move: MoveWindows): Promise<WindowsMoved | null> {
		const moved = move(this.held);

		if (moved === null) {
			return Promise.resolve(null);
		}

		this.held = moved.windows;
		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve(moved);
	}

	override windowsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
