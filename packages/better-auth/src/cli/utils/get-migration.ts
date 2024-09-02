import type {
	AlterTableColumnAlteringBuilder,
	CreateTableBuilder,
} from "kysely";
import type { FieldAttribute, FieldType } from "../../db";
import { logger } from "../../utils/logger";
import type { BetterAuthOptions } from "../../types";
import { getSchema } from "./get-schema";
import { createKyselyAdapter, getDatabaseType } from "../../adapters/kysely";

const postgresMap = {
	string: ["character varying", "text"],
	number: [
		"integer",
		"bigint",
		"smallint",
		"numeric",
		"real",
		"double precision",
	],
	boolean: ["boolean"],
	date: ["timestamp", "date"],
};
const mysqlMap = {
	string: ["varchar", "text"],
	number: [
		"integer",
		"int",
		"bigint",
		"smallint",
		"decimal",
		"float",
		"double",
	],
	boolean: ["boolean"],
	date: ["date", "datetime"],
};

const sqliteMap = {
	string: ["TEXT"],
	number: ["INTEGER", "REAL"],
	boolean: ["INTEGER", "BOOLEAN"], // 0 or 1
	date: ["DATE", "INTEGER"],
};

const map = {
	postgres: postgresMap,
	mysql: mysqlMap,
	sqlite: sqliteMap,
};

export function matchType(
	columnDataType: string,
	fieldType: FieldType,
	dbType: "postgres" | "sqlite" | "mysql",
) {
	const types = map[dbType];
	const type = types[fieldType].map((t) => t.toLowerCase());
	const matches = type.includes(columnDataType.toLowerCase());
	return matches;
}

export async function getMigrations(config: BetterAuthOptions) {
	const betterAuthSchema = getSchema(config);
	const dbType = getDatabaseType(config);
	const db = createKyselyAdapter(config);
	if (!db) {
		logger.error("Invalid database configuration.");
		process.exit(1);
	}
	const tableMetadata = await db.introspection.getTables();
	const toBeCreated: {
		table: string;
		fields: Record<string, FieldAttribute>;
	}[] = [];
	const toBeAdded: {
		table: string;
		fields: Record<string, FieldAttribute>;
	}[] = [];
	for (const [key, value] of Object.entries(betterAuthSchema)) {
		const table = tableMetadata.find((t) => t.name === key);
		if (!table) {
			const tIndex = toBeCreated.findIndex((t) => t.table === key);
			if (tIndex === -1) {
				toBeCreated.push({
					table: key,
					fields: value.fields,
				});
			} else {
				toBeCreated[tIndex].fields = {
					...toBeCreated[tIndex].fields,
					...value.fields,
				};
			}
			continue;
		}
		let toBeAddedFields: Record<string, FieldAttribute> = {};
		for (const [fieldName, field] of Object.entries(value.fields)) {
			const column = table.columns.find((c) => c.name === fieldName);
			if (!column) {
				toBeAddedFields[fieldName] = field;
				continue;
			}

			if (matchType(column.dataType, field.type, dbType)) {
				continue;
			} else {
				logger.warn(
					`Field ${fieldName} in table ${key} has a different type in the database. Expected ${field.type} but got ${column.dataType}.`,
				);
			}
		}
		if (Object.keys(toBeAddedFields).length > 0) {
			toBeAdded.push({
				table: key,
				fields: toBeAddedFields,
			});
		}
	}

	const typeMap = {
		string: "text",
		boolean: "boolean",
		number: "integer",
		date: "date",
	} as const;
	const migrations: (
		| AlterTableColumnAlteringBuilder
		| CreateTableBuilder<string, string>
	)[] = [];

	if (toBeAdded.length) {
		for (const table of toBeAdded) {
			logger.info(`Adding fields to table ${table.table}`);
			for (const [fieldName, field] of Object.entries(table.fields)) {
				logger.info(`Adding field ${fieldName} with type ${field.type}`);

				const type = typeMap[field.type];
				const exec = db.schema
					.alterTable(table.table)
					.addColumn(fieldName, type, (col) => {
						col = field.required !== false ? col.notNull() : col;
						if (field.references) {
							col = col.references(
								`${field.references.model}.${field.references.field}`,
							);
						}
						return col;
					});
				migrations.push(exec);
			}
		}
	}

	if (toBeCreated.length) {
		for (const table of toBeCreated) {
			let dbT = db.schema.createTable(table.table);
			for (const [fieldName, field] of Object.entries(table.fields)) {
				const type = typeMap[field.type];
				dbT = dbT.addColumn(fieldName, type, (col) => {
					col = field.required !== false ? col.notNull() : col;
					if (field.references) {
						col = col.references(
							`${field.references.model}.${field.references.field}`,
						);
					}
					return col;
				});
			}
			migrations.push(dbT);
		}
	}
	async function runMigrations() {
		return await Promise.all(migrations.map((m) => m.execute()));
	}
	return { toBeCreated, toBeAdded, runMigrations };
}