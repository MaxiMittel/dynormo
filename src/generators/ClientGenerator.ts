export class ClientGenerator {
    /**
     * Generates the code for a DynormoClient class based on the given entities and tableMap.
     * @param {string[]} entities - An array of entity names.
     * @param {Object.<string, string>} tableMap - A mapping of entity names to their corresponding table names.
     * @returns {string} The generated code for the DynormoClient class.
     */
    public static generate(entities: string[], tableMap: { [key: string]: string }) {
        return `const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { Logger } = require("./Logger");
${entities.map((entity) => `const { ${entity}EntityClass } = require("./${entity}");`).join('\n')}


class DynormoClient {
	client;
    tables;
    logger;
${entities.map((e) => `\t${e}CachedEntity;`).join('\n')}

	constructor(config) {
		this.client =
		config.client ||
		DynamoDBDocumentClient.from(
			new DynamoDBClient({
				region: config.region,
				endpoint: config.endpoint,
				credentials: config.credentials,
			})
		);
        this.tables = config.tables || {};

        if (Array.isArray(config.logger)) {
            this.logger = new Logger({ modes: config.logger, depth: config.loggerDepth ?? 3 });
        } else {
            this.logger = config.logger || new Logger({ modes: ['log', 'error', 'warn'], depth: 3 });
        }
	}

${entities.map((e) => this.generateEntityGetter(e, tableMap)).join('\n')}

    get rawClient() {
        return this.client;
    }

    $transaction(input) {
        const chunks = [];
        for (let i = 0; i < input.length; i += 25) {
            chunks.push(input.slice(i, i + 25));
        }

        return Promise.all(
            chunks.map((chunk) => {
                const params = {
                    TransactItems: chunk,
                };

                return this.client.transactWrite(params);
            })
        );
    }
}

module.exports = { DynormoClient };
  `
    }

    /**
     * Generates the entity getter for the given entity and tableMap.
     * @param {string} entity - The name of the entity.
     * @param {Object.<string, string>} tableMap - A mapping of entity names to their corresponding table names.
     * @returns {string} The generated entity getter.
     */
    private static generateEntityGetter(entity: string, tableMap: { [key: string]: string }) {
        return `\tget ${entity.toLowerCase()}() {
		if (!this.${entity}CachedEntity) {
			this.${entity}CachedEntity = new ${entity}EntityClass(this.client, this.tables["${entity}"] ?? "${tableMap[entity.toLowerCase()] ?? ""}", this.logger);
		}

		return this.${entity}CachedEntity;
	}\n`
    }

    /**
     * Generates the entity getter declaration for the given entity.
     * @param {string} entity - The name of the entity.
     * @returns {string} The generated entity getter declaration.
     * @returns {string} The generated entity getter declaration.
     */
    private static generateEntityGetterDeclaration(entity: string) {
        return `\tget ${entity.toLowerCase()}(): ${entity}EntityClass;`
    }

    /**
     * Generates the code for a DynormoClient class type declarations based on the given entities and tableMap.
     * @param {string[]} entities - An array of entity names.
     * @returns {string} The generated code for the DynormoClient class type declarations.
     */
    public static generateDeclarations(entities: string[]) {
        return `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
${entities.map((entity) => `import { ${entity}EntityClass } from "./${entity}";`).join('\n')}
import { ILogger, LoggerMode } from "./Logger";

export type DynormoClientOptions = {
	endpoint?: string;
	region?: string;
	credentials?: {
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken?: string;
	};
	client?: DynamoDBClient;
    tables?: {
${entities.map((e) => `\t\t${e}?: string;`).join('\n')}
    };
    logger?: ILogger | LoggerMode[];
};

export declare class DynormoClient {
	private config: DynormoClientOptions;

	constructor(config: DynormoClientOptions);

${entities.map((e) => this.generateEntityGetterDeclaration(e)).join('\n')}

    get rawClient(): DynamoDBClient;

    $transaction(input: (() => { params: string, item: any | null})[]): Promise<void>;
}
`
    }
}
