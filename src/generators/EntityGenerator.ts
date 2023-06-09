import { AttributeType } from '../enums/AttributeType'
import { RelationType } from '../enums/RelationType'
import { IAttribute } from '../interfaces/IAttribute'
import { ICreateRelation, IDeleteRelation, IRelation, IUpdateRelation } from '../interfaces/IRelation'
import { printGenerator } from '../shared/printGenerator'
import { printLiteral } from '../shared/printLiteral'
import { AttributeMap } from '../types/AttributeMap'
import { DatabaseType } from '../types/DatabaseType'

export class EntityGenerator {
    private readonly name: string
    private readonly attributes: AttributeMap
    private readonly relations: IRelation[]
    private partitionKey: string
    private partitionKeyStaticValue?: DatabaseType
    private sortKey?: string
    private sortKeyStaticValue?: DatabaseType

    constructor(name: string, attributes: AttributeMap, relations: IRelation[]) {
        this.name = name
        this.attributes = attributes
        this.relations = relations

        for (const key in attributes) {
            const attribute = attributes[key]
            if (attribute.partitionKey) {
                this.partitionKey = key
                if (attribute.staticValue) {
                    this.partitionKeyStaticValue = printLiteral(attribute.staticValue)
                }
            }
            if (attribute.sortKey) {
                this.sortKey = key
                if (attribute.staticValue) {
                    this.sortKeyStaticValue = printLiteral(attribute.staticValue)
                }
            }
        }

        if (!this.partitionKey) {
            throw new Error('No partition key found')
        }
    }

    /**
     * Generates the parameter list for findOn and delete
     * @returns {string} The generated code
     */
    private printKeyParams(): string {
        const params: string[] = []
        if (this.partitionKey && !this.partitionKeyStaticValue) {
            params.push(`${this.partitionKey}`)
        }
        if (this.sortKey && !this.sortKeyStaticValue) {
            params.push(`${this.sortKey}`)
        }
        return params.join(', ')
    }

    /**
     * Generates the key expression for findOn and delete
     * @returns {string} The generated code
     */
    private printKeyExpression(): string {
        const expressions: string[] = []
        if (this.partitionKey) {
            expressions.push(`${this.partitionKey}: ${this.partitionKeyStaticValue ? this.partitionKeyStaticValue : this.partitionKey}`)
        }
        if (this.sortKey) {
            expressions.push(`${this.sortKey}: ${this.sortKeyStaticValue ? this.sortKeyStaticValue : this.sortKey}`)
        }
        return expressions.join(', ')
    }

    /**
     * Generates the object definition for the create method with default values
     * @returns {string} The generated code
     */
    private printCreateType(): string {
        const attributes = { ...this.attributes }
        delete attributes[this.partitionKey]
        if (this.sortKey) {
            delete attributes[this.sortKey]
        }

        const defaultValue = (attr: IAttribute) => {
            if (attr.generator) {
                return printGenerator(attr.generator)
            }

            return attr.defaultValue ? printLiteral(attr.defaultValue) : ''
        }

        const printPath = (path: string[]) => {
            return path.map((p) => `["${p}"]`).join('')
        }

        const item = (attr: AttributeMap, indent: number, path: string[]) => {
            let typeString = ''
            for (const key in attr) {
                const attribute = attr[key]
                if (attribute.type === AttributeType.MAP) {
                    typeString += `${'\t'.repeat(indent)}${key}: {\n${item(attribute.properties, indent + 1, [...path, key])}${' '.repeat(indent * 2)}},`
                } else {
                    typeString += `${'\t'.repeat(indent)}${key}: `

                    if (attribute.type === AttributeType.DATE) {
                        if (attribute.generator || attribute.defaultValue) {
                            typeString += `item${printPath([...path, key])} ? item${printPath([...path, key])}.toISOString() : ${defaultValue(attribute)},\n`
                            continue
                        } else {
                            typeString += `item${printPath([...path, key])}.toISOString(),\n`
                            continue
                        }
                    }

                    if (attribute.type === AttributeType.DATE_LIST) {
                        if (attribute.generator || attribute.defaultValue) {
                            typeString += `item${printPath([...path, key])} ? item${printPath([...path, key])}?.map((date) => date.toISOString()) : ${defaultValue(attribute)},\n`
                            continue
                        } else {
                            typeString += `item${printPath([...path, key])}.map((date) => date.toISOString()),\n`
                            continue
                        }
                    }

                    if (attribute.generator || attribute.defaultValue) {
                        typeString += `item${printPath([...path, key])} ?? ${defaultValue(attribute)},\n`
                        continue
                    } else {
                        typeString += `item${printPath([...path, key])},\n`
                        continue
                    }
                }
            }

            return typeString
        }

        const pk = () => {
            if (this.partitionKeyStaticValue) {
                return `\t\t\t${this.partitionKey}: ${this.partitionKeyStaticValue}`
            }

            if (this.attributes[this.partitionKey].generator) {
                return `\t\t\t${this.partitionKey}: item["${this.partitionKey}"] ?? ${printGenerator(this.attributes[this.partitionKey].generator)}`
            }

            if (this.attributes[this.partitionKey].defaultValue) {
                return `\t\t\t${this.partitionKey}: item["${this.partitionKey}"] ?? ${printLiteral(this.attributes[this.partitionKey].defaultValue)}`
            }

            return `\t\t\t${this.partitionKey}: item["${this.partitionKey}"]`
        }

        const sk = () => {
            if (this.sortKeyStaticValue) {
                return `\t\t\t${this.sortKey}: ${this.sortKeyStaticValue}`
            }

            if (this.attributes[this.sortKey].generator) {
                return `\t\t\t${this.sortKey}: item["${this.sortKey}"] ?? ${printGenerator(this.attributes[this.sortKey].generator)}`
            }

            if (this.attributes[this.sortKey].defaultValue) {
                return `\t\t\t${this.sortKey}: item["${this.sortKey}"] ?? ${printLiteral(this.attributes[this.sortKey].defaultValue)}`
            }

            return `\t\t\t${this.sortKey}: item["${this.sortKey}"]`
        }

        const components = [pk()]
        if (this.sortKey) {
            components.push(sk())
        }

        components.push(item(attributes, 3, []))

        return `{\n${components.join(',\n')}\t\t}`
    }

    /**
     * Generates the map function to map the dynamodb item to the type
     * @returns {string} The generated code
     */
    private printMapper(): string {
        const attributes = { ...this.attributes }

        const printPath = (path: string[]) => {
            return path.map((p) => `["${p}"]`).join('')
        }

        const item = (attr: AttributeMap, indent: number, path: string[]) => {
            let typeString = ''
            for (const key in attr) {
                const attribute = attr[key]
                if (attribute.type === AttributeType.MAP) {
                    typeString += `${'\t'.repeat(indent)}${key}: {\n${item(attribute.properties, indent + 1, [...path, key])}${' '.repeat(indent * 2)}},`
                } else {
                    typeString += `${'\t'.repeat(indent)}${key}: `
                    if (attribute.type === AttributeType.DATE) {
                        typeString += `new Date(item${printPath([...path, key])}),\n`
                        continue
                    }

                    if (attribute.type === AttributeType.DATE_LIST) {
                        typeString += `item${printPath([...path, key])}.map((date) => new Date(date)),\n`
                        continue
                    }

                    typeString += `item${printPath([...path, key])},\n`
                    continue
                }
            }

            return typeString
        }

        return `{\n${item(attributes, 2, [])}\t\t}`
    }

    private get deleteRelations(): IDeleteRelation[] {
        return this.relations?.filter((r) => r.type === RelationType.DELETE) as IDeleteRelation[] ?? []
    }

    private get updateRelations(): IUpdateRelation[] {
        return this.relations?.filter((r) => r.type === RelationType.UPDATE) as IUpdateRelation[] ?? []
    }

    private get createRelations(): ICreateRelation[] {
        return this.relations?.filter((r) => r.type === RelationType.CREATE) as ICreateRelation[] ?? []
    }

    private printRelationStatements(stmt: string): string {
        if (stmt.startsWith('{')) {
            return stmt.substring(1, stmt.length - 1)
        }

        return stmt
    }

    /**
     * Generates the class definition for the entity
     * @returns {string} The generated code
     */
    public generate(): string {
        return `const {
  GetItemCommand, 
  PutItemCommand, 
  DeleteItemCommand, 
  ScanCommand, 
  BatchWriteItemCommand,
  QueryCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const {
  parseFilterExpression,
  uuid,
  logQuery,
  logError
} = require("./shared");

class ${this.name}EntityClass {
    client;
    tableName;
  
    constructor(client, tableName) {
        this.client = client;
        this.tableName = tableName;
    }

    async findOne(${this.printKeyParams()}) {
        const params = {
            TableName: this.tableName,
            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),
        };

        try {
            logQuery("GET", "${this.name}", "findOne", params);
            const { Item } = await this.client.send(new GetItemCommand(params));
            if (!Item) {
                return null;
            }

            return this.map${this.name}(unmarshall(Item));
        } catch (err) {
            logError("GET", "${this.name}", "findOne", params, err);
            throw new Error("An error occurred while trying to find the item");
        }
    };

    async findMany(query) {
        let FilterExpression;
        let ExpressionAttributeValues;
        let ExpressionAttributeNames;

        if (query.where) {
            const parsedExpression = parseFilterExpression(query.where);

            FilterExpression = parsedExpression.FilterExpression;
            ExpressionAttributeValues = parsedExpression.ExpressionAttributeValues;
            ExpressionAttributeNames = parsedExpression.ExpressionAttributeNames;
        }

        if (!query.key) {
            const params = {
                TableName: this.tableName,
                FilterExpression: FilterExpression ? FilterExpression : undefined,
                ExpressionAttributeValues,
                ExpressionAttributeNames,
                Limit: query.limit ? query.limit : undefined,
                ExclusiveStartKey: query.startKey ? marshall(query.startKey) : undefined,
            };

            try {
                logQuery("SCAN", "${this.name}", "findMany", params);
                const response = await this.client.send(new ScanCommand(params));

                if (!response.Items) {
                    return { items: [], lastKey: null, count: 0 };
                }

                return {
                    items: response.Items.map((item) => this.map${this.name}(unmarshall(item))),
                    lastKey: response.LastEvaluatedKey ? unmarshall(response.LastEvaluatedKey) : null,
                    count: response.Items.length,
                };
            } catch (err) {
                logError("SCAN", "${this.name}", "findMany", params, err);
                throw new Error("An error occurred while trying to find the items");
            }
        } else {
            const {
                FilterExpression: KeyConditionExpression,
                ExpressionAttributeValues: KeyExpressionAttributeValues,
                ExpressionAttributeNames: KeyExpressionAttributeNames
            } = parseFilterExpression(query.key);

            const params = {
                TableName: this.tableName,
                KeyConditionExpression,
                FilterExpression: FilterExpression ? FilterExpression : undefined,
                ExpressionAttributeValues: { ...ExpressionAttributeValues, ...KeyExpressionAttributeValues },
                ExpressionAttributeNames: { ...ExpressionAttributeNames, ...KeyExpressionAttributeNames },
                Limit: query.limit ? query.limit : undefined,
                ExclusiveStartKey: query.startKey ? marshall(query.startKey) : undefined,
            };

            try {
                logQuery("QUERY", "${this.name}", "findMany", params);
                const response = await this.client.send(new QueryCommand(params));

                if (!response.Items) {
                    return { items: [], lastKey: null, count: 0 };
                }

                return {
                    items: response.Items.map((item) => this.map${this.name}(unmarshall(item))),
                    lastKey: response.LastEvaluatedKey ? unmarshall(response.LastEvaluatedKey) : null,
                    count: response.Items.length,
                };
            } catch (err) {
                logError("QUERY", "${this.name}", "findMany", params, err);
                throw new Error("An error occurred while trying to find the items");
            }
        }
    };

    async findFirst(query) {
        let limit = 25;
        let items = [];
        let lastKey = null;
        
        do {
            const response = await this.findMany({ ...query, limit, startKey: lastKey });
            items = response.items;
            lastKey = response.lastKey;
            limit = Math.max(limit * 2, query.limit);
        } while (items.length === 0 && lastKey);

        return items[0]? this.map${this.name}(items[0]) : null;
    };

    async delete(${this.printKeyParams()}) {
        const params = {
            TableName: this.tableName,
            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),
        };

        ${
            this.deleteRelations.length > 0
                ? `const relationPromises = [];
        ${this.deleteRelations
            .map((relation) => {
                return `relationPromises.push(this.client.${relation.entity.toLowerCase()}.delete(${this.printRelationStatements(relation.key.partitionKey)}${relation.key.sortKey ? `, ${this.printRelationStatements(relation.key.sortKey)}` : ''}));`
            })
            .join('\n')}`
                : ''
        }
        ${this.deleteRelations.length > 0 ? `await Promise.all(relationPromises);` : ''}

        try {
            logQuery("DELETE", "${this.name}", "delete", params);
            await this.client.send(new DeleteItemCommand(params));
        } catch (err) {
            logError("DELETE", "${this.name}", "delete", params, err);
            throw new Error("An error occurred while trying to delete the item");
        }
    };

    async deleteMany(query) {
        // TODO: Replace with findAll
        const items = await this.findMany(query);

        const chunks = [];
        const chunkSize = 25;
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }

        try {
            const promises = [];
            for (const chunk of chunks) {
                promises.push(async () => {
                    const params = {
                        RequestItems: {
                            [this.tableName]: chunk.map((item) => ({
                                DeleteRequest: {
                                    Key: marshall({
                                        ${this.partitionKey}: ${this.partitionKeyStaticValue ? this.partitionKeyStaticValue : `item["${this.partitionKey}"]`},
                                        ${this.sortKey}: ${this.sortKey ? (this.sortKeyStaticValue ? this.sortKeyStaticValue : `item["${this.sortKey}"]`) : undefined}
                                    }, { removeUndefinedValues: true }),
                                },
                            })),
                        },
                    };

                    logQuery("BATCH_WRITE", "${this.name}", "deleteMany", params);
                    await this.client.send(new BatchWriteItemCommand(params));
                });
            }
            
            await Promise.all(promises);
        } catch (err) {
            logError("BATCH_WRITE", "${this.name}", "deleteMany", params, err);
            throw new Error("An error occurred while trying to delete the items");
        }
    }

    async create(item) {
        const values = ${this.printCreateType()};

        const params = {
            TableName: this.tableName,
            Item: marshall(values, { removeUndefinedValues: true })
        };
                
        try {
            logQuery("PUT", "${this.name}", "create", params);
            await this.client.send(new PutItemCommand(params));
            return this.map${this.name}(values);
        } catch (err) {
            logError("PUT", "${this.name}", "create", params, err);
            throw new Error("Failed to create ${this.name}");
        }
    };

    async update(${this.printKeyParams()}, item) {
        const UpdateExpression = Object.keys(item)
            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
            .map((key) => \`#\${key} = :\${key}\`)
            .join(", ");
        const ExpressionAttributeValues = Object.keys(item)
            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
            .reduce((acc, key) => ({ ...acc, [\`:\${key}\`]: marshall(item[key], { removeUndefinedValues: true }) }), {});
        const ExpressionAttributeNames = Object.keys(item)
            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
            .reduce((acc, key) => ({ ...acc, [\`#\${key}\`]: key }), {});

        const params = {
            TableName: this.tableName,
            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),
            UpdateExpression: \`SET \${UpdateExpression}\`,
            ExpressionAttributeValues,
            ExpressionAttributeNames,
            ReturnValues: "ALL_NEW"
        };

        try {
            logQuery("UPDATE", "${this.name}", "update", params);
            const result = await this.client.send(new UpdateItemCommand(params));

            if (!result.Attributes) {
                throw new Error("Failed to update ${this.name}");
            }

            return this.map${this.name}(unmarshall(result.Attributes));
        } catch (err) {
            logError("UPDATE", "${this.name}", "update", params, err);
            throw new Error("Failed to update ${this.name}");
        }
    };

    map${this.name}(item) {
        return ${this.printMapper()};
    };

    get $transaction() {
        return {
            create: async (item) => {
                const values = ${this.printCreateType()};
                const params = {
                    Put: {
                        TableName: this.tableName,
                        Item: marshall(values, { removeUndefinedValues: true })
                    }
                };

                return { params, item: null };
            },
            update: async (${this.printKeyParams()}, item) => {
                const UpdateExpression = Object.keys(item)
                    .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
                    .map((key) => \`#\${key} = :\${key}\`)

                const ExpressionAttributeValues = Object.keys(item)
                    .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
                    .reduce((acc, key) => ({ ...acc, [\`:\${key}\`]: marshall(item[key], { removeUndefinedValues: true }) }), {});

                const ExpressionAttributeNames = Object.keys(item)
                    .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
                    .reduce((acc, key) => ({ ...acc, [\`#\${key}\`]: key }), {});

                const params = {
                    Update: {
                        TableName: this.tableName,
                        Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),
                        UpdateExpression: \`SET \${UpdateExpression}\`,
                        ExpressionAttributeValues,
                        ExpressionAttributeNames,
                        ReturnValues: "ALL_NEW"
                    }
                };

                return { params, item: null };
            },
            delete: async (${this.printKeyParams()}) => {
                const params = {
                    Delete: {
                        TableName: this.tableName,
                        Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true })
                    }
                };

                return { params, item: null };
            }
        }
    };
}

module.exports = { ${this.name}EntityClass };`;
    }
}
