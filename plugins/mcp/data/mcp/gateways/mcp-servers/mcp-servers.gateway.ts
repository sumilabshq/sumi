import type { ContractShape } from "@widgetarium/data-framework";

export abstract class McpServersGateway {
	abstract servedContracts(): readonly ContractShape[];
}
