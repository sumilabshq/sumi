import type { CallerFacts } from "@widgetarium/plugin-framework";
import type { Secrets } from "@sumi/sumi-host-plugin";

export interface SecretVault {
	secretOf(owner: string, key: string): Promise<string | null>;
	saveSecret(owner: string, key: string, value: string): Promise<void>;
	removeSecret(owner: string, key: string): Promise<void>;
}

export class MemorySecretVault implements SecretVault {
	private readonly kept = new Map<string, string>();

	async secretOf(owner: string, key: string): Promise<string | null> {
		return this.kept.get(`${owner}\n${key}`) ?? null;
	}

	async saveSecret(owner: string, key: string, value: string): Promise<void> {
		this.kept.set(`${owner}\n${key}`, value);
	}

	async removeSecret(owner: string, key: string): Promise<void> {
		this.kept.delete(`${owner}\n${key}`);
	}
}

export function secretsFor(vault: SecretVault): (caller: CallerFacts) => Secrets {
	return ({ pluginId }) => ({
		read: (key) => vault.secretOf(pluginId, key),
		write: (key, value) => vault.saveSecret(pluginId, key, value),
		remove: (key) => vault.removeSecret(pluginId, key),
	});
}
