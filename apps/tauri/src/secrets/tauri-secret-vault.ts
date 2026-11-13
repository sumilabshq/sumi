import { z } from "zod";
import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { SecretVault } from "@widgetarium/studio";

const SecretsDocSchema = z.object({
	owners: z.record(z.string(), z.record(z.string(), z.string())),
});

type SecretsDoc = z.infer<typeof SecretsDocSchema>;

// TRADE-OFF: a plain file in the global root, outside every workspace; the OS keychain (Keychain, Secret Service, Credential Manager) is the target
const SECRETS: DocKind<SecretsDoc> = {
	file: "secrets.json",
	v: 1,
	schema: SecretsDocSchema,
};

const EMPTY: SecretsDoc = {
	owners: {},
};

const SAVE_TRIES = 3;
const NOT_SAVED = "secrets of {owner} were not saved: the file kept changing under this window";

export class TauriSecretVault implements SecretVault {
	constructor(private readonly store: StoreClient) {}

	async secretOf(owner: string, key: string): Promise<string | null> {
		const { doc } = await this.store.readDoc(GLOBAL_ROOT, SECRETS);
		return doc?.owners[owner]?.[key] ?? null;
	}

	saveSecret(owner: string, key: string, value: string): Promise<void> {
		return this.changeOwner(owner, (held) => ({ ...held, [key]: value }), `${owner} secret ${key} saved`);
	}

	removeSecret(owner: string, key: string): Promise<void> {
		return this.changeOwner(
			owner,
			(held) => Object.fromEntries(Object.entries(held).filter(([kept]) => kept !== key)),
			`${owner} secret ${key} removed`,
		);
	}

	private async changeOwner(
		owner: string,
		change: (held: Readonly<Record<string, string>>) => Record<string, string>,
		reason: string,
	): Promise<void> {
		for (let tried = 0; tried < SAVE_TRIES; tried += 1) {
			const { doc, rev } = await this.store.readDoc(GLOBAL_ROOT, SECRETS);
			const was = doc ?? EMPTY;
			const next = {
				owners: {
					...was.owners,
					[owner]: change(was.owners[owner] ?? {}),
				},
			};
			const replaced = await this.store.replaceDoc(GLOBAL_ROOT, SECRETS, { doc: next, baseRev: rev, reason });

			if (replaced.ok) {
				return;
			}
		}

		throw new Error(NOT_SAVED.replace("{owner}", owner));
	}
}
