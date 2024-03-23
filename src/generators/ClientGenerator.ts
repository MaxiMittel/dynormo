import * as prettier from 'prettier';

export class ClientGenerator {
    /**
     * Generates the code for a DynormoClient class based on the given entities and tableMap.
     * @param {string[]} entities - An array of entity names.
     * @param {Object.<string, string>} tableMap - A mapping of entity names to their corresponding table names.
     * @returns {string} The generated code for the DynormoClient class.
     */
    public static async generate(entities: string[], tableMap: { [key: string]: string }) {
        let res = `const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");\n`;
        res += `const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");\n`;
        res += `const { Logger } = require("./Logger");\n`;
        res += `${entities.map((entity) => `const { ${entity}EntityClass } = require("./${entity}");`).join('\n')}\n\n`;

        res += `const marshallOptions = { convertEmptyValues: true };\n\n`;

        res += `class DynormoClient {\n`;
        res += `client;\n`;
        res += `tables;\n`;
        res += `validators;\n`;
        res += `logger;\n`;
        res += `${entities.map((e) => `${e}CachedEntity;`).join('\n')}\n\n`;

        res += `constructor(config) {\n`;
        res += `this.client = config.client ? DynamoDBDocumentClient.from(config.client, { marshallOptions }) : DynamoDBDocumentClient.from(\n`;
        res += `new DynamoDBClient({\n`;
        res += `region: config.region,\n`;
        res += `endpoint: config.endpoint,\n`;
        res += `credentials: config.credentials,\n`;
        res += `}), { marshallOptions }\n`;
        res += `);\n`;
        res += `this.tables = config.tables || {};\n`;
        res += `this.validators = config.validators || {};\n\n`;

        res += `if (Array.isArray(config.logger)) {\n`;
        res += `this.logger = new Logger({ modes: config.logger, depth: config.loggerDepth ?? 3 });\n`;
        res += `} else {\n`;
        res += `this.logger = config.logger || new Logger({ modes: ['log', 'error', 'warn'], depth: 3 });\n`;
        res += `}\n`;
        res += `}\n\n`;

        res += `${entities.map((e) => this.generateEntityGetter(e, tableMap)).join('\n')}\n\n`;

        res += `get rawClient() {\n`;
        res += `return this.client;\n`;
        res += `}\n\n`;

        res += `$transaction(input) {\n`;
        res += `    const chunks = [];\n`;
        res += `    for (let i = 0; i < input.length; i += 25) {\n`;
        res += `        chunks.push(input.slice(i, i + 25));\n`;
        res += `    }\n\n`;

        res += `    return Promise.all(\n`;
        res += `        chunks.map((chunk) => {\n`;
        res += `            const params = {\n`;
        res += `                TransactItems: chunk,\n`;
        res += `            };\n\n`;

        res += `        return this.client.transactWrite(params);\n`;
        res += `        })\n`;
        res += `    );\n`;
        res += `}\n`;
        res += `}\n\n`;

        res += `module.exports = { DynormoClient };`;

        const prettified = await prettier.format(res, { parser: 'typescript' });
        return prettified;
    }

    /**
     * Generates the entity getter for the given entity and tableMap.
     * @param {string} entity - The name of the entity.
     * @param {Object.<string, string>} tableMap - A mapping of entity names to their corresponding table names.
     * @returns {string} The generated entity getter.
     */
    private static generateEntityGetter(entity: string, tableMap: { [key: string]: string }) {
        let res = `get ${entity.toLowerCase()}() {\n`;
        res += `if (!this.${entity}CachedEntity) {\n`;
        res += `this.${entity}CachedEntity = new ${entity}EntityClass(this.client, this.tables["${entity}"] ?? "${tableMap[entity.toLowerCase()] ?? ''}", this.logger, this.validators["${entity}"]);\n`;
        res += `}\n\n`;

        res += `return this.${entity}CachedEntity;\n`;
        res += `}\n`;

        return res;
    }

    /**
     * Generates the entity getter declaration for the given entity.
     * @param {string} entity - The name of the entity.
     * @returns {string} The generated entity getter declaration.
     * @returns {string} The generated entity getter declaration.
     */
    private static generateEntityGetterDeclaration(entity: string) {
        return `get ${entity.toLowerCase()}(): ${entity}EntityClass;`;
    }

    /**
     * Generates the code for a DynormoClient class type declarations based on the given entities and tableMap.
     * @param {string[]} entities - An array of entity names.
     * @returns {string} The generated code for the DynormoClient class type declarations.
     */
    public static async generateDeclarations(entities: string[]) {
        let res = `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";\n`;
        res += `${entities.map((entity) => `import { ${entity}EntityClass, Create${entity}Input, Update${entity}Input } from "./${entity}";`).join('\n')}\n`;
        res += `import { ILogger, LoggerMode } from "./Logger";\n\n`;

        res += `export type ValidationConfig<T, U> = {\n`;
        res += `create: (item: T) => T;\n`;
        res += `update: (item: U) => U;\n`;
        res += `};\n\n`;

        res += `export type DynormoClientOptions = {\n`;
        res += `endpoint?: string;\n`;
        res += `region?: string;\n`;
        res += `credentials?: {\n`;
        res += `accessKeyId: string;\n`;
        res += `secretAccessKey: string;\n`;
        res += `sessionToken?: string;\n`;
        res += `};\n`;
        res += `client?: DynamoDBClient;\n`;
        res += `tables?: {\n`;
        res += `${entities.map((e) => `${e}?: string;\n`).join('')}`;
        res += `};\n`;
        res += `validators?: {\n`;
        res += `${entities.map((e) => `${e}?: ValidationConfig<Create${e}Input, Update${e}Input>;\n`).join('')}`;
        res += `};\n`;
        res += `logger?: ILogger | LoggerMode[];\n`;
        res += `};\n\n`;

        res += `export declare class DynormoClient {\n`;
        res += `private config: DynormoClientOptions;\n\n`;

        res += `constructor(config: DynormoClientOptions);\n\n`;

        res += `${entities.map((e) => this.generateEntityGetterDeclaration(e)).join('\n')}\n\n`;

        res += `get rawClient(): DynamoDBClient;\n\n`;

        res += `$transaction(input: (() => { params: string, item: any | null})[]): Promise<void>;\n`;
        res += `}\n`;

        const prettified = await prettier.format(res, { parser: 'typescript' });
        return prettified;
    }
}
