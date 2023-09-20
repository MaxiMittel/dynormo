import { AttributeType } from '../enums/AttributeType'
import { IAttribute } from '../interfaces/IAttribute'
import { printGenerator } from '../shared/printGenerator'
import { printLiteral } from '../shared/printLiteral'
import { AttributeMap } from '../types/AttributeMap'
import { DatabaseType } from '../types/DatabaseType'

export class EntityGenerator {
    private readonly name: string
    private readonly attributes: AttributeMap
    private partitionKey: string
    private partitionKeyStaticValue?: DatabaseType
    private sortKey?: string
    private sortKeyStaticValue?: DatabaseType

    constructor(name: string, attributes: AttributeMap) {
        this.name = name
        this.attributes = attributes

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

            if (attr.defaultValue) {
                return printLiteral(attr.defaultValue)
            }

            if (attr.nullable) {
                return 'null'
            }

            switch (attr.type) {
                case AttributeType.LIST:
                case AttributeType.DATE_LIST:
                case AttributeType.MAP_LIST:
                case AttributeType.BOOLEAN_LIST:
                case AttributeType.NUMBER_LIST:
                case AttributeType.STRING_LIST:
                    return '[]'
                case AttributeType.NUMBER_SET:
                case AttributeType.STRING_SET:
                    return 'new Set()'
                case AttributeType.MAP:
                    return '{}'
                default:
                    return ''
            }
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
                        if (attribute.generator || attribute.defaultValue || attribute.nullable) {
                            typeString += `item${printPath([...path, key])} ? item${printPath([...path, key])}.toISOString() : ${defaultValue(attribute)},\n`
                            continue
                        } else {
                            typeString += `item${printPath([...path, key])}.toISOString(),\n`
                            continue
                        }
                    }

                    if (attribute.type === AttributeType.DATE_LIST) {
                        if (attribute.generator || attribute.defaultValue || attribute.nullable) {
                            typeString += `item${printPath([...path, key])} ? item${printPath([...path, key])}?.map((date) => date.toISOString()) : ${defaultValue(attribute)},\n`
                            continue
                        } else {
                            typeString += `item${printPath([...path, key])}.map((date) => date.toISOString()),\n`
                            continue
                        }
                    }

                    const defaultVal = defaultValue(attribute)
                    if (defaultVal) {
                        typeString += `item${printPath([...path, key])} ?? ${defaultVal},\n`
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

                    switch (attribute.type) {
                        case AttributeType.DATE:
                            typeString += `item${printPath([...path, key])} ? new Date(item${printPath([...path, key])}) : null,\n`
                            continue
                        case AttributeType.DATE_LIST:
                            typeString += `item${printPath([...path, key])}.map((date) => new Date(date)),\n`
                            continue
                        case AttributeType.BOOLEAN_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`
                            continue
                        case AttributeType.NUMBER_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`
                            continue
                        case AttributeType.STRING_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`
                            continue
                        case AttributeType.MAP_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`
                            continue
                        case AttributeType.NUMBER_SET:
                            typeString += `item${printPath([...path, key])} ?? new Set(),\n`
                            continue
                        case AttributeType.STRING_SET:
                            typeString += `item${printPath([...path, key])} ?? new Set(),\n`
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
  uuid
} = require("./shared");

class ${this.name}EntityClass {
    client;
    tableName;
    logger;
    subscribersCreate = [];
    subscribersUpdate = [];
    subscribersDelete = [];
  
    constructor(client, tableName, logger) {
        this.client = client;
        this.tableName = tableName;
        this.logger = logger;
    }

    async findOne(${this.printKeyParams()}) {
        const params = {
            TableName: this.tableName,
            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),
        };

        try {
            this.logger.log('[${this.name}][findOne]', params);
            const { Item } = await this.client.send(new GetItemCommand(params));
            if (!Item) {
                return null;
            }

            return this.map${this.name}(unmarshall(Item));
        } catch (err) {
            this.logger.error('[${this.name}][findOne]', params, err);
            throw new Error("An error occurred while trying to find the item. Additional information above.");
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
                ExpressionAttributeValues: Object.keys(ExpressionAttributeValues ?? {}).length ? ExpressionAttributeValues : undefined,
                ExpressionAttributeNames: Object.keys(ExpressionAttributeNames ?? {}).length ? ExpressionAttributeNames : undefined,
                Limit: query.limit ? query.limit : undefined,
                IndexName: query.index ? query.index : undefined,
                ExclusiveStartKey: query.startKey ? marshall(query.startKey) : undefined,
            };

            try {
                this.logger.log('[${this.name}][findMany]', params);
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
                this.logger.error('[${this.name}][findMany]', params, err);
                throw new Error("An error occurred while trying to find the items. Additional information above.");
            }
        } else {
            const {
                FilterExpression: KeyConditionExpression,
                ExpressionAttributeValues: KeyExpressionAttributeValues,
                ExpressionAttributeNames: KeyExpressionAttributeNames
            } = parseFilterExpression(query.key);

            const combinedExpressionAttributeValues = { ...ExpressionAttributeValues, ...KeyExpressionAttributeValues };
            const combinedExpressionAttributeNames = { ...ExpressionAttributeNames, ...KeyExpressionAttributeNames };

            const params = {
                TableName: this.tableName,
                KeyConditionExpression,
                FilterExpression: FilterExpression ? FilterExpression : undefined,
                ExpressionAttributeValues: Object.keys(combinedExpressionAttributeValues ?? {}).length ? combinedExpressionAttributeValues : undefined,
                ExpressionAttributeNames: Object.keys(combinedExpressionAttributeNames ?? {}).length ? combinedExpressionAttributeNames : undefined,
                Limit: query.limit ? query.limit : undefined,
                IndexName: query.index ? query.index : undefined,
                ExclusiveStartKey: query.startKey ? marshall(query.startKey) : undefined,
            };

            try {
                this.logger.log('[${this.name}][findMany]', params);
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
                this.logger.error('[${this.name}][findMany]', params, err);
                throw new Error("An error occurred while trying to find the items. Additional information above.");
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

    async findAll(query) {
        let items = [];
        let lastKey = null;

        do {
            const response = await this.findMany({ ...query, startKey: lastKey });
            items = items.concat(response.items);
            lastKey = response.lastKey;
        } while (lastKey);

        return items.map((item) => this.map${this.name}(item));
    };

    async delete(${this.printKeyParams()}) {
        const params = {
            TableName: this.tableName,
            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),
        };

        let item;
        if (this.subscribersDelete.length) {
            item = await this.findOne(...arguments);
        }

        try {
            this.logger.log("[${this.name}][delete]", params);
            await this.client.send(new DeleteItemCommand(params));

            if (this.subscribersDelete.length) {
                this.notifySubscribers("DELETE", item);
            }
        } catch (err) {
            this.logger.error("[${this.name}][delete]", params, err);
            throw new Error("An error occurred while trying to delete the item. Additional information above.");
        }
    };

    async deleteMany(query) {
        const items = await this.findAll(query);

        const chunks = [];
        const chunkSize = 25;
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }

        try {
            const promises = [];
            for (const chunk of chunks) {
                const promise = (async () => {
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

                    this.logger.log("[${this.name}][deleteMany]", params);
                    await this.client.send(new BatchWriteItemCommand(params));
                })();

                promises.push(promise);
            }
            
            await Promise.all(promises);

            if (this.subscribersDelete.length) {
                for (const item of items) {
                    this.notifySubscribers("DELETE", item);
                }
            }
        } catch (err) {
            this.logger.error("[${this.name}][deleteMany]", null, err);
            throw new Error("An error occurred while trying to delete the items. Additional information above.");
        }
    }

    async create(item) {
        const values = ${this.printCreateType()};

        const params = {
            TableName: this.tableName,
            Item: marshall(values, { removeUndefinedValues: true, convertEmptyValues: true })
        };
                
        try {
            this.logger.log("[${this.name}][create]", params);
            await this.client.send(new PutItemCommand(params));
            const insertedItem = this.map${this.name}(values);

            if (this.subscribersCreate.length) {
                this.notifySubscribers("CREATE", insertedItem);
            }

            return insertedItem;
        } catch (err) {
            this.logger.error("[${this.name}][create]", params, err);
            throw new Error("An error occurred while trying to create the item. Additional information above.");
        }
    };

    async update(${this.printKeyParams()}, item) {
        const marshallValue = (value) => {
            if (value instanceof Date) {
                return { S: value.toISOString() };
            } else if (Array.isArray(value)) {
                return { L: value.map((item) => marshallValue(item)) };
            } else if (typeof value === "object" && !(value instanceof Set)) {
                return { M: Object.keys(value).reduce((acc, key) => ({ ...acc, [key]: marshallValue(value[key]) }), {}) };
            } else {
                return marshall(value, { removeUndefinedValues: true, convertEmptyValues: true });
            }
        };

        const UpdateExpression = Object.keys(item)
            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
            .map((key) => \`#\${key} = :\${key}\`)
            .join(", ");
        const ExpressionAttributeValues = Object.keys(item)
            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")
            .reduce((acc, key) => ({ ...acc, [\`:\${key}\`]: marshallValue(item[key])}), {});
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
            this.logger.log("[${this.name}][update]", params);
            const result = await this.client.send(new UpdateItemCommand(params));

            if (!result.Attributes) {
                throw new Error("Failed to update ${this.name}");
            }

            const updatedItem = this.map${this.name}(unmarshall(result.Attributes));

            if (this.subscribersUpdate.length) {
                this.notifySubscribers("UPDATE", updatedItem);
            }

            return updatedItem;
        } catch (err) {
            this.logger.error("[${this.name}][update]", params, err);
            throw new Error("An error occurred while trying to update the item. Additional information above.");
        }
    };

    map${this.name}(item) {
        return ${this.printMapper()};
    };

    subscribe(event, callback) {
        switch (event) {
            case "CREATE":
                this.subscribersCreate.push(callback);
                break;
            case "UPDATE":
                this.subscribersUpdate.push(callback);
                break;
            case "DELETE":
                this.subscribersDelete.push(callback);
                break;
            default:
                throw new Error("Invalid event type");
        }
    }

    notifySubscribers(event, item) {
        if (event === "CREATE") {
            for (const subscriber of this.subscribersCreate) {
                subscriber(item);
            }
        } else if (event === "UPDATE") {
            for (const subscriber of this.subscribersUpdate) {
                subscriber(item);
            }
        } else if (event === "DELETE") {
            for (const subscriber of this.subscribersDelete) {
                subscriber(item);
            }
        } else {
            throw new Error("Invalid event type");
        }
    }

    get $transaction() {
        return {
            create: async (item) => {
                const values = ${this.printCreateType()};
                const params = {
                    Put: {
                        TableName: this.tableName,
                        Item: marshall(values, { removeUndefinedValues: true, convertEmptyValues: true })
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
                    .reduce((acc, key) => ({ ...acc, [\`:\${key}\`]: marshall(item[key], { removeUndefinedValues: true, convertEmptyValues: true }) }), {});

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

module.exports = { ${this.name}EntityClass };`
    }
}
