import { AttributeType } from '../enums/AttributeType';
import { PrintMode } from '../enums/PrintMode';
import { printObject, printType } from '../shared/printType';
import { AttributeMap } from '../types/AttributeMap';
import { DatabaseType } from '../types/DatabaseType';
import { SecondaryIndex } from '../types/SecondaryIndex';
import * as prettier from 'prettier';

export type EntityDeclarationGeneratorOptions = {
    name: string;
    attributes: AttributeMap;
    indexes?: SecondaryIndex[];
};

export class EntityDeclarationGenerator {
    name: string;
    attributes: AttributeMap;
    indexes: SecondaryIndex[] = [];
    partitionKey: string;
    partitionKeyType: string;
    partitionKeyStaticValue?: DatabaseType;
    sortKey?: string;
    sortKeyType?: string;
    sortKeyStaticValue?: DatabaseType;

    constructor(options: EntityDeclarationGeneratorOptions) {
        this.name = options.name;
        this.attributes = options.attributes;
        this.indexes = options.indexes ?? [];

        for (const key in this.attributes) {
            const attribute = this.attributes[key];
            if (attribute.partitionKey) {
                this.partitionKey = key;
                this.partitionKeyType = printType(attribute, PrintMode.DEFAULT);
                if (attribute.staticValue) {
                    this.partitionKeyStaticValue = attribute.staticValue;
                }
            }
            if (attribute.sortKey) {
                this.sortKey = key;
                this.sortKeyType = printType(attribute, PrintMode.DEFAULT);
                if (attribute.staticValue) {
                    this.sortKeyStaticValue = attribute.staticValue;
                }
            }
        }

        if (!this.partitionKey) {
            throw new Error('No partition key found');
        }
    }

    /**
     * Generates the parameter list for findOn and delete
     * @returns {string} The parameter list
     */
    private printKeyParams(): string {
        const params: string[] = [];
        if (this.partitionKey && !this.partitionKeyStaticValue) {
            params.push(`${this.partitionKey}: ${this.partitionKeyType}`);
        }
        if (this.sortKey && !this.sortKeyStaticValue) {
            params.push(`${this.sortKey}: ${this.sortKeyType}`);
        }
        return params.join(', ');
    }

    /**
     * Generates the filter expression type
     * @returns {string} The filter expression type as string
     */
    private printFilterExpressionType(): string {
        const params = [];
        for (const key in this.attributes) {
            if (key === this.partitionKey || key === this.sortKey) {
                continue;
            }

            const attribute = this.attributes[key];
            if (attribute.type === AttributeType.MAP) {
                let expression = `${key}?: {\n`;
                expression += Object.keys(attribute.properties)
                    .map((childKey) => {
                        return `${childKey}?: FilterExpression<${printType(attribute.properties[childKey], PrintMode.DEFAULT)}> | ${printType(attribute.properties[childKey], PrintMode.DEFAULT)};`;
                    })
                    .join('\n');
                expression += '}\n';

                params.push(expression);
            } else {
                params.push(`${key}?: FilterExpression<${printType(attribute, PrintMode.DEFAULT)}> | ${printType(attribute, PrintMode.DEFAULT)};`);
            }
        }

        let res = `export type ${this.name}FilterExpression = {\n`;
        res += `OR?: ${this.name}FilterExpression[];\n`;
        res += `AND?: ${this.name}FilterExpression[];\n`;
        res += `NOT?: ${this.name}FilterExpression[];\n`;
        res += `${params.join('\n')}\n};\n`;

        return res;
    }

    /**
     * Generates the key condition type
     * @returns {string} The key condition type as string
     */
    private printKeyConditionType(): string {
        const params = [];
        if (this.partitionKey) {
            params.push(`${this.partitionKey}: ${this.partitionKeyType};`);
        }

        if (this.sortKey) {
            params.push(`${this.sortKey}?: KeyConditionExpression<${this.sortKeyType}> | ${this.sortKeyType};`);
        }

        /*this.indexes.forEach((index) => {
            if (index.partitionKey && index.partitionKey !== this.partitionKey) {
                params.push(`  ${index.partitionKey}?: ${printType(this.attributes[index.partitionKey], PrintMode.DEFAULT, 0 )};`)
            }

            if (index.sortKey && index.sortKey !== this.sortKey) {
                params.push(`  ${index.sortKey}?: KeyConditionExpression<${printType(this.attributes[index.sortKey], PrintMode.DEFAULT, 0)}> | ${printType(
                    this.attributes[index.sortKey],
                    PrintMode.DEFAULT,
                    0
                )};`)
            }
        });*/

        let res = `export type ${this.name}KeyCondition = {\n`;
        res += `OR?: ${this.name}KeyCondition[];\n`;
        res += `AND?: ${this.name}KeyCondition[];\n`;
        res += `NOT?: ${this.name}KeyCondition[];\n`;
        res += `${params.join('\n')}\n};\n`;

        return res;
    }

    /**
     * Generates the type declarations for the entity
     * @returns {string} The generated entity declaration
     */
    public async generate(): Promise<string> {
        let res = `import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";\n`;
        res += `import { FilterExpression, KeyConditionExpression, ItemEvent } from "./shared";\n\n`;

        res += `export type ${this.name}Entity = {\n`;
        res += printObject(this.attributes, PrintMode.FULL);
        res += '}\n\n';

        res += `export type Create${this.name}Input = {\n`;
        res += printObject(this.attributes, PrintMode.DEFAULT);
        res += '}\n\n';

        res += `export type Update${this.name}Input = {\n`;
        res += printObject(this.attributes, PrintMode.PARTIAL);
        res += '}\n\n';

        res += this.printFilterExpressionType();
        res += this.printKeyConditionType();

        res += `export type ${this.name}FindManyInput = {\n`;
        res += `  where?: ${this.name}FilterExpression;\n`;
        res += `  key?: ${this.name}KeyCondition;\n`;
        res += `  index?: string;\n`;
        res += `  limit?: number;\n`;
        res += `  startKey?: any;\n`;
        res += '}\n\n';

        res += `export type ${this.name}FindManyOutput = {\n`;
        res += `  items: ${this.name}Entity[];\n`;
        res += `  lastKey?: any;\n`;
        res += `  count: number;\n`;
        res += '}\n\n';

        res += `export type ${this.name}FindFirstInput = {\n`;
        res += `  where?: ${this.name}FilterExpression;\n`;
        res += `  key?: ${this.name}KeyCondition;\n`;
        res += `  limit?: number;\n`;
        res += '}\n\n';

        res += `export type ${this.name}FindAllInput = {\n`;
        res += `  where?: ${this.name}FilterExpression;\n`;
        res += `  key?: ${this.name}KeyCondition;\n`;
        res += `  limit?: number;\n`;
        res += '}\n\n';

        res += `export type ${this.name}DeleteManyInput = {\n`;
        res += `  where?: ${this.name}FilterExpression;\n`;
        res += `  key?: ${this.name}KeyCondition;\n`;
        res += '}\n\n';

        res += `export declare class ${this.name}EntityClass {\n`;
        res += `  private client: typeof DynamoDBDocumentClient;\n`;
        res += `  private tableName: string;\n\n`;

        res += `  constructor(client: typeof DynamoDBDocumentClient, tableName: string);\n\n`;

        res += `  findOne(${this.printKeyParams()}): Promise<${this.name}Entity | null>;\n`;
        res += `  findMany(query: ${this.name}FindManyInput): Promise<${this.name}FindManyOutput>;\n`;
        res += `  findFirst(query: ${this.name}FindFirstInput): Promise<${this.name}Entity | null>;\n`;
        res += `  findAll(query: ${this.name}FindAllInput): Promise<${this.name}Entity[]>;\n`;
        res += `  delete(${this.printKeyParams()}): Promise<void>;\n`;
        res += `  deleteMany(query: ${this.name}FindManyInput): Promise<void>;\n`;
        res += `  create(item: Create${this.name}Input): Promise<${this.name}Entity>;\n`;
        res += `  update(${this.printKeyParams()}, item: Update${this.name}Input): Promise<${this.name}Entity>;\n`;
        res += `  subscribe(event: ItemEvent, handler: (item: ${this.name}Entity) => void): void;\n\n`;

        res += `  private notifySubscribers(event: ItemEvent, item: ${this.name}Entity): Promise<void>;\n`;
        res += `}`;

        const prettified = await prettier.format(res, { parser: 'typescript' });
        return prettified;
    }
}
