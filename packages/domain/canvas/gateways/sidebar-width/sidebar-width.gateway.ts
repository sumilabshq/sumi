export abstract class SidebarWidthGateway {
	abstract sidebarPx(): number | null;
	abstract saveSidebarPx(px: number, reason: string): void;
}
