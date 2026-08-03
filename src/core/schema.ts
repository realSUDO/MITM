export interface IOutputSchemaField {
	type: "string" | "number" | "boolean" | "array" | "object";
	description?: string;
	required?: boolean;
}

export interface IOutputSchema {
	fields: Record<string, IOutputSchemaField>;
}

export interface OutputValidationResult {
	valid: boolean;
	errors: string[];
	data: Record<string, unknown> | null;
}

export function validateOutput(
	content: string,
	schema: IOutputSchema,
): OutputValidationResult {
	let parsed: Record<string, unknown>;

	try {
		parsed = JSON.parse(content) as Record<string, unknown>;
	} catch {
		return { valid: false, errors: ["Output is not valid JSON."], data: null };
	}

	const errors: string[] = [];

	for (const [field, def] of Object.entries(schema.fields)) {
		const value = parsed[field];

		if (def.required !== false && value === undefined) {
			errors.push(`Missing required field: "${field}".`);
			continue;
		}

		if (value !== undefined) {
			const actualType = Array.isArray(value) ? "array" : typeof value;
			if (actualType !== def.type) {
				errors.push(`Field "${field}" must be of type "${def.type}", got "${actualType}".`);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		data: errors.length === 0 ? parsed : null,
	};
}
