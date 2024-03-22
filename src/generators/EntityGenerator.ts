import { AttributeType } from '../enums/AttributeType';
import { IAttribute } from '../interfaces/IAttribute';
import { printGenerator } from '../shared/printGenerator';
import { printLiteral } from '../shared/printLiteral';
import { AttributeMap } from '../types/AttributeMap';
import { DatabaseType } from '../types/DatabaseType';
import * as prettier from 'prettier';

export class EntityGenerator {
    private readonly name: string;
    private readonly attributes: AttributeMap;
    private partitionKey: string;
    private partitionKeyStaticValue?: DatabaseType;
    private sortKey?: string;
    private sortKeyStaticValue?: DatabaseType;

    constructor(name: string, attributes: AttributeMap) {
        this.name = name;
        this.attributes = attributes;

        for (const key in attributes) {
            const attribute = attributes[key];
            if (attribute.partitionKey) {
                this.partitionKey = key;
                if (attribute.staticValue) {
                    this.partitionKeyStaticValue = printLiteral(attribute.staticValue);
                }
            }
            if (attribute.sortKey) {
                this.sortKey = key;
                if (attribute.staticValue) {
                    this.sortKeyStaticValue = printLiteral(attribute.staticValue);
                }
            }
        }

        if (!this.partitionKey) {
            throw new Error('No partition key found');
        }
    }

    /**
     * Generates the parameter list for findOn and delete
     * @returns {string} The generated code
     */
    private printKeyParams(): string {
        const params: string[] = [];
        if (this.partitionKey && !this.partitionKeyStaticValue) {
            params.push(`${this.partitionKey}`);
        }
        if (this.sortKey && !this.sortKeyStaticValue) {
            params.push(`${this.sortKey}`);
        }
        return params.join(', ');
    }

    /**
     * Generates the key expression for findOn and delete
     * @returns {string} The generated code
     */
    private printKeyExpression(): string {
        const expressions: string[] = [];
        if (this.partitionKey) {
            expressions.push(`${this.partitionKey}: ${this.partitionKeyStaticValue ? this.partitionKeyStaticValue : this.partitionKey}`);
        }
        if (this.sortKey) {
            expressions.push(`${this.sortKey}: ${this.sortKeyStaticValue ? this.sortKeyStaticValue : this.sortKey}`);
        }
        return expressions.join(', ');
    }

    /**
     * Generates the object definition for the create method with default values
     * @returns {string} The generated code
     */
    private printCreateType(): string {
        const attributes = { ...this.attributes };
        delete attributes[this.partitionKey];
        if (this.sortKey) {
            delete attributes[this.sortKey];
        }

        const defaultValue = (attr: IAttribute) => {
            if (attr.generator) {
                return printGenerator(attr.generator);
            }

            if (attr.defaultValue) {
                return printLiteral(attr.defaultValue);
            }

            if (attr.nullable) {
                return 'null';
            }

            switch (attr.type) {
                case AttributeType.LIST:
                case AttributeType.DATE_LIST:
                case AttributeType.MAP_LIST:
                case AttributeType.BOOLEAN_LIST:
                case AttributeType.NUMBER_LIST:
                case AttributeType.STRING_LIST:
                    return '[]';
                case AttributeType.NUMBER_SET:
                case AttributeType.STRING_SET:
                    return 'new Set()';
                case AttributeType.MAP:
                    return '{}';
                default:
                    return '';
            }
        };

        const printPath = (path: string[]) => {
            return path.map((p) => `["${p}"]`).join('');
        };

        const item = (attr: AttributeMap, path: string[]) => {
            let typeString = '';
            for (const key in attr) {
                const attribute = attr[key];
                if (attribute.type === AttributeType.MAP) {
                    typeString += `${key}: {\n${item(attribute.properties, [...path, key])}},`;
                } else {
                    typeString += `${key}: `;

                    if (attribute.type === AttributeType.DATE) {
                        if (attribute.generator || attribute.defaultValue || attribute.nullable) {
                            typeString += `item${printPath([...path, key])} ? item${printPath([...path, key])}.toISOString() : ${defaultValue(attribute)},\n`;
                            continue;
                        } else {
                            typeString += `item${printPath([...path, key])}.toISOString(),\n`;
                            continue;
                        }
                    }

                    if (attribute.type === AttributeType.DATE_LIST) {
                        if (attribute.generator || attribute.defaultValue || attribute.nullable) {
                            typeString += `item${printPath([...path, key])} ? item${printPath([...path, key])}?.map((date) => date.toISOString()) : ${defaultValue(attribute)},\n`;
                            continue;
                        } else {
                            typeString += `item${printPath([...path, key])}.map((date) => date.toISOString()),\n`;
                            continue;
                        }
                    }

                    const defaultVal = defaultValue(attribute);
                    if (defaultVal) {
                        typeString += `item${printPath([...path, key])} ?? ${defaultVal},\n`;
                        continue;
                    } else {
                        typeString += `item${printPath([...path, key])},\n`;
                        continue;
                    }
                }
            }

            return typeString;
        };

        const pk = () => {
            if (this.partitionKeyStaticValue) {
                return `${this.partitionKey}: ${this.partitionKeyStaticValue}`;
            }

            if (this.attributes[this.partitionKey].generator) {
                return `${this.partitionKey}: item["${this.partitionKey}"] ?? ${printGenerator(this.attributes[this.partitionKey].generator)}`;
            }

            if (this.attributes[this.partitionKey].defaultValue) {
                return `${this.partitionKey}: item["${this.partitionKey}"] ?? ${printLiteral(this.attributes[this.partitionKey].defaultValue)}`;
            }

            return `${this.partitionKey}: item["${this.partitionKey}"]`;
        };

        const sk = () => {
            if (this.sortKeyStaticValue) {
                return `${this.sortKey}: ${this.sortKeyStaticValue}`;
            }

            if (this.attributes[this.sortKey].generator) {
                return `${this.sortKey}: item["${this.sortKey}"] ?? ${printGenerator(this.attributes[this.sortKey].generator)}`;
            }

            if (this.attributes[this.sortKey].defaultValue) {
                return `${this.sortKey}: item["${this.sortKey}"] ?? ${printLiteral(this.attributes[this.sortKey].defaultValue)}`;
            }

            return `${this.sortKey}: item["${this.sortKey}"]`;
        };

        const components = [pk()];
        if (this.sortKey) {
            components.push(sk());
        }

        components.push(item(attributes, []));

        return `{\n${components.join(',\n')}}`;
    }

    /**
     * Generates the map function to map the dynamodb item to the type
     * @returns {string} The generated code
     */
    private printMapper(): string {
        const attributes = { ...this.attributes };

        const printPath = (path: string[]) => {
            return path.map((p) => `["${p}"]`).join('');
        };

        const item = (attr: AttributeMap, path: string[]) => {
            let typeString = '';
            for (const key in attr) {
                const attribute = attr[key];
                if (attribute.type === AttributeType.MAP) {
                    typeString += `${key}: {\n${item(attribute.properties, [...path, key])}},`;
                } else {
                    typeString += `${key}: `;

                    switch (attribute.type) {
                        case AttributeType.DATE:
                            typeString += `item${printPath([...path, key])} ? new Date(item${printPath([...path, key])}) : null,\n`;
                            continue;
                        case AttributeType.DATE_LIST:
                            typeString += `item${printPath([...path, key])}.map((date) => new Date(date)),\n`;
                            continue;
                        case AttributeType.BOOLEAN_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`;
                            continue;
                        case AttributeType.NUMBER_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`;
                            continue;
                        case AttributeType.STRING_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`;
                            continue;
                        case AttributeType.MAP_LIST:
                            typeString += `item${printPath([...path, key])} ?? [],\n`;
                            continue;
                        case AttributeType.NUMBER_SET:
                            typeString += `item${printPath([...path, key])} ?? new Set(),\n`;
                            continue;
                        case AttributeType.STRING_SET:
                            typeString += `item${printPath([...path, key])} ?? new Set(),\n`;
                            continue;
                    }

                    typeString += `item${printPath([...path, key])},\n`;
                    continue;
                }
            }

            return typeString;
        };

        return `{\n${item(attributes, [])}}`;
    }

    /**
     * Generates the class definition for the entity
     * @returns {string} The generated code
     */
    public async generate(): Promise<string> {
        let res = `const { GetItemCommand, PutItemCommand, DeleteItemCommand, ScanCommand, BatchWriteItemCommand, QueryCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");\n`;
        res += `const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");\n`;
        res += `const { parseFilterExpression, uuid } = require("./shared");\n\n`;

        res += `class ${this.name}EntityClass {\n`;
        res += `    client;\n`;
        res += `    tableName;\n`;
        res += `    logger;\n`;
        res += `    subscribersCreate = [];\n`;
        res += `    subscribersUpdate = [];\n`;
        res += `    subscribersDelete = [];\n\n`;

        res += `    constructor(client, tableName, logger) {\n`;
        res += `        this.client = client;\n`;
        res += `        this.tableName = tableName;\n`;
        res += `        this.logger = logger;\n`;
        res += `    }\n\n`;

        res += `    async findOne(${this.printKeyParams()}) {\n`;
        res += `        const params = {\n`;
        res += `            TableName: this.tableName,\n`;
        res += `            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),\n`;
        res += `        };\n\n`;

        res += `        try {\n`;
        res += `            this.logger.log('[${this.name}][findOne]', params);\n`;
        res += `            const { Item } = await this.client.send(new GetItemCommand(params));\n`;
        res += `            if (!Item) {\n`;
        res += `                return null;\n`;
        res += `            }\n\n`;

        res += `            return this.map${this.name}(unmarshall(Item));\n`;
        res += `        } catch (err) {\n`;
        res += `            this.logger.error('[${this.name}][findOne]', params, err);\n`;
        res += `            throw new Error("An error occurred while trying to find the item. Additional information above.");\n`;
        res += `        }\n`;
        res += `    };\n\n`;

        res += `    async findMany(query) {\n`;
        res += `        let FilterExpression;\n`;
        res += `        let ExpressionAttributeValues;\n`;
        res += `        let ExpressionAttributeNames;\n\n`;

        res += `        if (query.where) {\n`;
        res += `            const parsedExpression = parseFilterExpression(query.where);\n\n`;

        res += `            FilterExpression = parsedExpression.FilterExpression;\n`;
        res += `            ExpressionAttributeValues = parsedExpression.ExpressionAttributeValues;\n`;
        res += `            ExpressionAttributeNames = parsedExpression.ExpressionAttributeNames;\n`;
        res += `        }\n\n`;

        res += `        if (!query.key) {\n`;
        res += `            const params = {\n`;
        res += `                TableName: this.tableName,\n`;
        res += `                FilterExpression: FilterExpression ? FilterExpression : undefined,\n`;
        res += `                ExpressionAttributeValues: Object.keys(ExpressionAttributeValues ?? {}).length ? ExpressionAttributeValues : undefined,\n`;
        res += `                ExpressionAttributeNames: Object.keys(ExpressionAttributeNames ?? {}).length ? ExpressionAttributeNames : undefined,\n`;
        res += `                Limit: query.limit ? query.limit : undefined,\n`;
        res += `                IndexName: query.index ? query.index : undefined,\n`;
        res += `                ExclusiveStartKey: query.startKey ? marshall(query.startKey) : undefined,\n`;
        res += `            };\n\n`;

        res += `            try {\n`;
        res += `                this.logger.log('[${this.name}][findMany]', params);\n`;
        res += `                const response = await this.client.send(new ScanCommand(params));\n\n`;

        res += `                if (!response.Items) {\n`;
        res += `                    return { items: [], lastKey: null, count: 0 };\n`;
        res += `                }\n\n`;

        res += `                return {\n`;
        res += `                    items: response.Items.map((item) => this.map${this.name}(unmarshall(item))),\n`;
        res += `                    lastKey: response.LastEvaluatedKey ? unmarshall(response.LastEvaluatedKey) : null,\n`;
        res += `                    count: response.Items.length,\n`;
        res += `                };\n`;
        res += `            } catch (err) {\n`;
        res += `                this.logger.error('[${this.name}][findMany]', params, err);\n`;
        res += `                throw new Error("An error occurred while trying to find the items. Additional information above.");\n`;
        res += `            }\n`;
        res += `        } else {\n`;
        res += `            const {\n`;
        res += `                FilterExpression: KeyConditionExpression,\n`;
        res += `                ExpressionAttributeValues: KeyExpressionAttributeValues,\n`;
        res += `                ExpressionAttributeNames: KeyExpressionAttributeNames\n`;
        res += `            } = parseFilterExpression(query.key);\n\n`;

        res += `            const combinedExpressionAttributeValues = { ...ExpressionAttributeValues, ...KeyExpressionAttributeValues };\n`;
        res += `            const combinedExpressionAttributeNames = { ...ExpressionAttributeNames, ...KeyExpressionAttributeNames };\n\n`;

        res += `            const params = {\n`;
        res += `                TableName: this.tableName,\n`;
        res += `                KeyConditionExpression,\n`;
        res += `                FilterExpression: FilterExpression ? FilterExpression : undefined,\n`;
        res += `                ExpressionAttributeValues: Object.keys(combinedExpressionAttributeValues ?? {}).length ? combinedExpressionAttributeValues : undefined,\n`;
        res += `                ExpressionAttributeNames: Object.keys(combinedExpressionAttributeNames ?? {}).length ? combinedExpressionAttributeNames : undefined,\n`;
        res += `                Limit: query.limit ? query.limit : undefined,\n`;
        res += `                IndexName: query.index ? query.index : undefined,\n`;
        res += `                ExclusiveStartKey: query.startKey ? marshall(query.startKey) : undefined,\n`;
        res += `            };\n\n`;

        res += `            try {\n`;
        res += `                this.logger.log('[${this.name}][findMany]', params);\n`;
        res += `                const response = await this.client.send(new QueryCommand(params));\n\n`;

        res += `                if (!response.Items) {\n`;
        res += `                    return { items: [], lastKey: null, count: 0 };\n`;
        res += `                }\n\n`;

        res += `                return {\n`;
        res += `                    items: response.Items.map((item) => this.map${this.name}(unmarshall(item))),\n`;
        res += `                    lastKey: response.LastEvaluatedKey ? unmarshall(response.LastEvaluatedKey) : null,\n`;
        res += `                    count: response.Items.length,\n`;
        res += `                };\n`;
        res += `            } catch (err) {\n`;
        res += `                this.logger.error('[${this.name}][findMany]', params, err);\n`;
        res += `                throw new Error("An error occurred while trying to find the items. Additional information above.");\n`;
        res += `            }\n`;
        res += `        }\n`;
        res += `    };\n\n`;

        res += `    async findFirst(query) {\n`;
        res += `        let limit = 25;\n`;
        res += `        let items = [];\n`;
        res += `        let lastKey = null;\n\n`;

        res += `        do {\n`;
        res += `            const response = await this.findMany({ ...query, limit, startKey: lastKey });\n`;
        res += `            items = response.items;\n`;
        res += `            lastKey = response.lastKey;\n`;
        res += `            limit = Math.max(limit * 2, query.limit);\n`;
        res += `        } while (items.length === 0 && lastKey);\n\n`;

        res += `        return items[0]? this.map${this.name}(items[0]) : null;\n`;
        res += `    };\n\n`;

        res += `    async findAll(query) {\n`;
        res += `        let items = [];\n`;
        res += `        let lastKey = null;\n\n`;

        res += `        do {\n`;
        res += `            const response = await this.findMany({ ...query, startKey: lastKey });\n`;
        res += `            items = items.concat(response.items);\n`;
        res += `            lastKey = response.lastKey;\n`;
        res += `        } while (lastKey);\n\n`;

        res += `        return items.map((item) => this.map${this.name}(item));\n`;
        res += `    };\n\n`;

        res += `    async delete(${this.printKeyParams()}) {\n`;
        res += `        const params = {\n`;
        res += `            TableName: this.tableName,\n`;
        res += `            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),\n`;
        res += `        };\n\n`;

        res += `        let item;\n`;
        res += `        if (this.subscribersDelete.length) {\n`;
        res += `            item = await this.findOne(...arguments);\n`;
        res += `        }\n\n`;

        res += `        try {\n`;
        res += `            this.logger.log("[${this.name}][delete]", params);\n`;
        res += `            await this.client.send(new DeleteItemCommand(params));\n\n`;

        res += `            if (this.subscribersDelete.length) {\n`;
        res += `                this.notifySubscribers("DELETE", item);\n`;
        res += `            }\n`;
        res += `        } catch (err) {\n`;
        res += `            this.logger.error("[${this.name}][delete]", params, err);\n`;
        res += `            throw new Error("An error occurred while trying to delete the item. Additional information above.");\n`;
        res += `        }\n`;
        res += `    };\n\n`;

        res += `    async deleteMany(query) {\n`;
        res += `        const items = await this.findAll(query);\n\n`;

        res += `        const chunks = [];\n`;
        res += `        const chunkSize = 25;\n`;
        res += `        for (let i = 0; i < items.length; i += chunkSize) {\n`;
        res += `            chunks.push(items.slice(i, i + chunkSize));\n`;
        res += `        }\n\n`;

        res += `        try {\n`;
        res += `            const promises = [];\n`;
        res += `            for (const chunk of chunks) {\n`;
        res += `                const promise = (async () => {\n`;
        res += `                    const params = {\n`;
        res += `                        RequestItems: {\n`;
        res += `                            [this.tableName]: chunk.map((item) => ({\n`;
        res += `                                DeleteRequest: {\n`;
        res += `                                    Key: marshall({\n`;
        res += `                                        ${this.partitionKey}: ${this.partitionKeyStaticValue ? this.partitionKeyStaticValue : `item["${this.partitionKey}"]`},\n`;
        res += `                                        ${this.sortKey}: ${this.sortKey ? (this.sortKeyStaticValue ? this.sortKeyStaticValue : `item["${this.sortKey}"]`) : undefined}\n`;
        res += `                                    }, { removeUndefinedValues: true }),\n`;
        res += `                                },\n`;
        res += `                            })),\n`;
        res += `                        },\n`;
        res += `                    };\n\n`;

        res += `                    this.logger.log("[${this.name}][deleteMany]", params);\n`;
        res += `                    await this.client.send(new BatchWriteItemCommand(params));\n`;
        res += `                })();\n\n`;

        res += `                promises.push(promise);\n`;
        res += `            }\n`;
        res += `            \n`;
        res += `            await Promise.all(promises);\n\n`;

        res += `            if (this.subscribersDelete.length) {\n`;
        res += `                for (const item of items) {\n`;
        res += `                    this.notifySubscribers("DELETE", item);\n`;
        res += `                }\n`;
        res += `            }\n`;
        res += `        } catch (err) {\n`;
        res += `            this.logger.error("[${this.name}][deleteMany]", null, err);\n`;
        res += `            throw new Error("An error occurred while trying to delete the items. Additional information above.");\n`;
        res += `        }\n`;
        res += `    }\n\n`;

        res += `    async create(item) {\n`;
        res += `        const values = ${this.printCreateType()};\n\n`;

        res += `        const params = {\n`;
        res += `            TableName: this.tableName,\n`;
        res += `            Item: marshall(values, { removeUndefinedValues: true, convertEmptyValues: true })\n`;
        res += `        };\n\n`;

        res += `        try {\n`;
        res += `            this.logger.log("[${this.name}][create]", params);\n`;
        res += `            await this.client.send(new PutItemCommand(params));\n`;
        res += `            const insertedItem = this.map${this.name}(values);\n\n`;

        res += `            if (this.subscribersCreate.length) {\n`;
        res += `                this.notifySubscribers("CREATE", insertedItem);\n`;
        res += `            }\n\n`;

        res += `            return insertedItem;\n`;
        res += `        } catch (err) {\n`;
        res += `            this.logger.error("[${this.name}][create]", params, err);\n`;
        res += `            throw new Error("An error occurred while trying to create the item. Additional information above.");\n`;
        res += `        }\n`;
        res += `    };\n\n`;

        res += `    async update(${this.printKeyParams()}, item) {\n`;
        res += `        const marshallValue = (value) => {\n`;
        res += `            if (value instanceof Date) {\n`;
        res += `                return { S: value.toISOString() };\n`;
        res += `            } else if (Array.isArray(value)) {\n`;
        res += `                return { L: value.map((item) => marshallValue(item)) };\n`;
        res += `            } else if (typeof value === "object" && !(value instanceof Set)) {\n`;
        res += `                return { M: Object.keys(value).reduce((acc, key) => ({ ...acc, [key]: marshallValue(value[key]) }), {}) };\n`;
        res += `            } else {\n`;
        res += `                return marshall(value, { removeUndefinedValues: true, convertEmptyValues: true });\n`;
        res += `            }\n`;
        res += `        };\n\n`;

        res += `        const UpdateExpression = Object.keys(item)\n`;
        res += `            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")\n`;
        res += `            .map((key) => \`#\${key} = :\${key}\`)\n`;
        res += `            .join(", ");\n`;
        res += `        const ExpressionAttributeValues = Object.keys(item)\n`;
        res += `            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")\n`;
        res += `            .reduce((acc, key) => ({ ...acc, [\`:\${key}\`]: marshallValue(item[key])}), {});\n`;
        res += `        const ExpressionAttributeNames = Object.keys(item)\n`;
        res += `            .filter((key) => item[key] !== undefined && key !== "${this.partitionKey}" && key !== "${this.sortKey}")\n`;
        res += `            .reduce((acc, key) => ({ ...acc, [\`#\${key}\`]: key }), {});\n\n`;

        res += `        const params = {\n`;
        res += `            TableName: this.tableName,\n`;
        res += `            Key: marshall({ ${this.printKeyExpression()} }, { removeUndefinedValues: true }),\n`;
        res += `            UpdateExpression,\n`;
        res += `            ExpressionAttributeValues,\n`;
        res += `            ExpressionAttributeNames,\n`;
        res += `            ReturnValues: "ALL_NEW",\n`;
        res += `        };\n\n`;

        res += `        let updatedItem;\n`;
        res += `        if (this.subscribersUpdate.length) {\n`;
        res += `            updatedItem = await this.findOne(...arguments);\n`;
        res += `        }\n\n`;

        res += `        try {\n`;
        res += `            this.logger.log("[${this.name}][update]", params);\n`;
        res += `            const { Attributes } = await this.client.send(new UpdateItemCommand(params));\n\n`;

        res += `            if (this.subscribersUpdate.length) {\n`;
        res += `                this.notifySubscribers("UPDATE", updatedItem, unmarshall(Attributes));\n`;
        res += `            }\n\n`;

        res += `            return this.map${this.name}(unmarshall(Attributes));\n`;
        res += `        } catch (err) {\n`;
        res += `            this.logger.error("[${this.name}][update]", params, err);\n`;
        res += `            throw new Error("An error occurred while trying to update the item. Additional information above.");\n`;
        res += `        }\n`;
        res += `    };\n\n`;

        res += `    map${this.name}(item) {\n`;
        res += `        return ${this.printMapper()};\n`;
        res += `    }\n\n`;

        res += `    notifySubscribers(type, item, updatedItem) {\n`;
        res += `        switch (type) {\n`;
        res += `            case "CREATE": {\n`;
        res += `                for (const subscriber of this.subscribersCreate) {\n`;
        res += `                    subscriber(item);\n`;
        res += `                }\n`;
        res += `                break;\n`;
        res += `            }\n`;
        res += `            case "UPDATE": {\n`;
        res += `                for (const subscriber of this.subscribersUpdate) {\n`;
        res += `                    subscriber(item, updatedItem);\n`;
        res += `                }\n`;
        res += `                break;\n`;
        res += `            }\n`;
        res += `            case "DELETE": {\n`;
        res += `                for (const subscriber of this.subscribersDelete) {\n`;
        res += `                    subscriber(item);\n`;
        res += `                }\n`;
        res += `                break;\n`;
        res += `            }\n`;
        res += `        }\n`;
        res += `    }\n`;
        res += `}\n\n`;

        res += `module.exports = { ${this.name}EntityClass };`;

        const prettified = await prettier.format(res, { parser: 'typescript' });
        return prettified;
    }
}
