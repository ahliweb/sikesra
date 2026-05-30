export interface ExampleAuditEvent {
	kind: string;
	scope: string;
	actor: string;
	summary: string;
	metadata?: Record<string, unknown>;
}

export function createAuditRecord(event: ExampleAuditEvent) {
	return {
		id: `${new Date().toISOString()}:${event.kind}`,
		timestamp: new Date().toISOString(),
		kind: event.kind,
		scope: event.scope,
		actor: event.actor,
		summary: event.summary,
		metadata: event.metadata ?? {},
	};
}
