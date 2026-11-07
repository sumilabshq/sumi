import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import type { BrowserTab } from "../../shared/schema/browser-tab.schema.js";
import type { CommittedPage, PageContentRead, PageShot } from "../../shared/schema/page-read.schema.js";
import { BrowserPagesGateway } from "./browser-pages.gateway.js";

export class WebBrowserPagesGateway extends BrowserPagesGateway {
	isAvailable(): boolean {
		return false;
	}

	tabs(): readonly BrowserTab[] {
		return [];
	}

	shownId(): string | null {
		return null;
	}

	isOnScreen(): boolean {
		return false;
	}

	pagesChanged(): () => void {
		return () => undefined;
	}

	attach(): void {}

	detach(): void {}

	attachInPane(): void {}

	detachFromPane(): void {}

	canOpenOwnWindow(): boolean {
		return false;
	}

	isPoppedOut(): boolean {
		return false;
	}

	isInOwnWindow(): boolean {
		return false;
	}

	openInOwnWindow(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	focusOwnWindow(): void {}

	focusStudioWindow(): void {}

	openTabWindow(): void {}

	tearOff(): void {}

	layTearOffGhost(): Promise<void> {
		return Promise.resolve();
	}

	wearTearOffGhost(): void {}

	showTearOffGhost(): void {}

	create(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	close(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	freeze(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	thaw(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	open(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	show(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	back(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	forward(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	reload(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	showRefused(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	dismissFailure(): void {
		throw new Error(NOT_AVAILABLE_ON_HOST);
	}

	settled(): Promise<void> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}

	committed(): CommittedPage | null {
		return null;
	}

	frameUrls(): Promise<readonly string[]> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}

	hasSecretField(): Promise<boolean> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}

	content(): Promise<PageContentRead> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}

	look(): null {
		return null;
	}

	looksChanged(): () => void {
		return () => undefined;
	}

	capture(): Promise<PageShot> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}
}
