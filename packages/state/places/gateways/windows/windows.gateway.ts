import type { MoveWindows, Windows, WindowsMoved } from "../../shared/schema/windows.schema.js";

export abstract class WindowsGateway {
	abstract windows(): Promise<Windows>;
	abstract moveWindows(move: MoveWindows): Promise<WindowsMoved | null>;
	abstract windowsChanged(listener: () => void): () => void;
}
