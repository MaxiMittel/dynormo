import { AttributeType } from '../enums/AttributeType'
import { PrintMode } from '../enums/PrintMode'
import { printObject, printType } from '../shared/printType'
import { AttributeMap } from '../types/AttributeMap'
import { DatabaseType } from '../types/DatabaseType'

export type EntityDeclarationGeneratorOptions = {
    name: string
    attributes: AttributeMap
    entities: {
        generate: 'types' | 'classes'
    }
}

export class EntityDeclarationGenerator {
    name: string
    attributes: AttributeMap
    mode: 'types' | 'classes' = 'types'
    partitionKey: string
    partitionKeyType: string
    partitionKeyStaticValue?: DatabaseType
    sortKey?: string
    sortKeyType?: string
    sortKeyStaticValue?: DatabaseType

    constructor(options: EntityDeclarationGeneratorOptions) {
        this.name = options.name
        this.attributes = options.attributes
        this.mode = options.entities?.generate ?? 'types'

        for (const key in this.attributes) {
            const attribute = this.attributes[key]
            if (attribute.partitionKey) {
                this.partitionKey = key
                this.partitionKeyType = printType(attribute, PrintMode.DEFAULT, 0)
                if (attribute.staticValue) {
                    this.partitionKeyStaticValue = attribute.staticValue
                }
            }
            if (attribute.sortKey) {
                this.sortKey = key
                this.sortKeyType = printType(attribute, PrintMode.DEFAULT, 0)
                if (attribute.staticValue) {
                    this.sortKeyStaticValue = attribute.staticValue
                }
            }
        }

        if (!this.partitionKey) {
            throw new Error('No partition key found')
        }
    }

    /**
     * Generates the parameter list for findOn and delete
     * @returns {string} The parameter list
     */
    private printKeyParams(): string {
        const params: string[] = []
        if (this.partitionKey && !this.partitionKeyStaticValue) {
            params.push(`${this.partitionKey}: ${this.partitionKeyType}`)
        }
        if (this.sortKey && !this.sortKeyStaticValue) {
            params.push(`${this.sortKey}: ${this.sortKeyType}`)
        }
        return params.join(', ')
    }

    /**
     * Returns the keyword for the specified entity generation mode
     * @returns {string} The keyword
     */
    private get keyword(): string {
        return this.mode === 'types' ? 'type' : 'class'
    }

    /**
     * For mode types returns the equals sign, otherwise an empty string
     * @returns {string} The equals sign
     */
    private get equals(): string {
        return this.mode === 'types' ? '= ' : ''
    }

    /**
     * Generates the filter expression type
     * @returns {string} The filter expression type as string
     */
    private printFilterExpressionType(): string {
        const params = []
        for (const key in this.attributes) {
            if (key === this.partitionKey || key === this.sortKey) {
                continue
            }

            const attribute = this.attributes[key]
            if (attribute.type === AttributeType.MAP) {
                params.push(
                    `  ${key}?: {\n${Object.keys(attribute.properties)
                        .map((childKey) => {
                            return `    ${childKey}?: FilterExpression<${printType(attribute.properties[childKey], PrintMode.DEFAULT, 1)}> | ${printType(
                                attribute.properties[childKey],
                                PrintMode.DEFAULT,
                                1
                            )};`
                        })
                        .join('\n')}\n  };`
                )
            } else {
                params.push(`  ${key}?: FilterExpression<${printType(attribute, PrintMode.DEFAULT, 0)}> | ${printType(attribute, PrintMode.DEFAULT, 0)};`)
            }
        }

        return `export type ${this.name}FilterExpression = {\n  OR?: ${this.name}FilterExpression[];\n  AND?: ${this.name}FilterExpression[];\n  NOT?: ${this.name}FilterExpression[];\n${params.join(
            '\n'
        )}\n};\n`
    }

    /**
     * Generates the key condition type
     * @returns {string} The key condition type as string
     */
    private printKeyConditionType(): string {
        const params = []
        if (this.partitionKey) {
            params.push(`  ${this.partitionKey}?: FilterExpression<${this.partitionKeyType}> | ${this.partitionKeyType};`)
        }

        if (this.sortKey) {
            params.push(`  ${this.sortKey}?: FilterExpression<${this.sortKeyType}> | ${this.sortKeyType};`)
        }

        return `export type ${this.name}KeyCondition = {
  OR?: ${this.name}KeyCondition[];
  AND?: ${this.name}KeyCondition[];
  NOT?: ${this.name}KeyCondition[];\n${params.join('\n')}\n};\n`
    }

    /**
     * Generates the type declarations for the entity
     * @returns {string} The generated entity declaration
     */
    public generate(): string {
        return `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { FilterExpression } from "./shared";

export ${this.keyword} ${this.name}Entity ${this.equals}{
${printObject(this.attributes, PrintMode.FULL, 1)}}

export ${this.keyword} Create${this.name}Input ${this.equals}{
${printObject(this.attributes, PrintMode.DEFAULT, 1)}}

export ${this.keyword} Update${this.name}Input ${this.equals}{
${printObject(this.attributes, PrintMode.PARTIAL, 1)}}

${this.printFilterExpressionType()}

${this.printKeyConditionType()}

export ${this.keyword} ${this.name}FindManyInput ${this.equals}{
  where?: ${this.name}FilterExpression;
  key?: ${this.name}KeyCondition;
  index?: string;
  limit?: number;
  startKey?: any;
}

export ${this.keyword} ${this.name}FindManyOutput ${this.equals}{
  items: ${this.name}Entity[];
  lastKey?: any;
  count: number;
}

export ${this.keyword} ${this.name}FindFirstInput ${this.equals}{
  where?: ${this.name}FilterExpression;
  key?: ${this.name}KeyCondition;
  limit?: number;
}

export ${this.keyword} ${this.name}FindAllInput ${this.equals}{
  where?: ${this.name}FilterExpression;
  key?: ${this.name}KeyCondition;
  limit?: number;
}

export ${this.keyword} ${this.name}DeleteManyInput ${this.equals}{
  where?: ${this.name}FilterExpression;
  key?: ${this.name}KeyCondition;
}

export declare class ${this.name}EntityClass {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(client: DynamoDBClient, tableName: string);

  findOne(${this.printKeyParams()}): Promise<${this.name}Entity | null>;
  findMany(query: ${this.name}FindManyInput): Promise<${this.name}FindManyOutput>;
  findFirst(query: ${this.name}FindFirstInput): Promise<${this.name}Entity | null>;
  findAll(query: ${this.name}FindAllInput): Promise<${this.name}Entity[]>;
  delete(${this.printKeyParams()}): Promise<void>;
  deleteMany(query: ${this.name}FindManyInput): Promise<void>;
  create(item: Create${this.name}Input): Promise<${this.name}Entity>;
  update(${this.printKeyParams()}, item: Update${this.name}Input): Promise<${this.name}Entity>;
}`
    }
}
