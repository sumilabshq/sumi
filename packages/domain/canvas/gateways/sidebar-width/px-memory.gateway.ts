import type { PxMemory } from "@widgetarium/behaviors";
import { SidebarWidthGateway } from "./sidebar-width.gateway.js";

export class PxMemorySidebarWidthGateway extends SidebarWidthGateway {
	private held: number | null;

	constructor(private readonly memory: PxMemory) {
		super();
		this.held = memory.read();
	}

	override sidebarPx(): number | null {
		return this.held;
	}

	override saveSidebarPx(px: number): void {
		this.held = px;
		this.memory.write(px);
	}
}
