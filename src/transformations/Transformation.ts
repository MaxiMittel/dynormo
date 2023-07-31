import { BatchWriteItemCommand, CreateBackupCommand, DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import * as fs from 'fs'

export class Transformation<T> {
    private table: string
    private client: DynamoDBClient
    private transformations: ((item: T) => T)[] = []
    private filterFunctions: ((item: T) => boolean)[] = []
    private removeFunctions: ((item: T) => boolean)[] = []

    constructor(table: string, client: DynamoDBClient) {
        this.table = table
        this.client = client
    }

    /**
     * Adds an attribute to the item. If the attribute already exists, it will be overwritten.
     * Accepts a function that returns the value of the attribute.
     * @param {string} attribute The name of the attribute to add
     * @param {(item: T) => any} value A function that returns the value of the attribute
     * @returns The Transformation object
     */
    public addAttribute(attribute: string, value: (item: T) => any): Transformation<T> {
        this.transformations.push((item: T) => {
            item[attribute] = value(item)
            return item
        })

        return this
    }

    /**
     * Removes an attribute from the item.
     * @param {string} attribute The name of the attribute to remove
     * @returns The Transformation object
     */
    public removeAttribute(attribute: string): Transformation<T> {
        this.transformations.push((item: T) => {
            delete item[attribute]
            return item
        })

        return this
    }

    /**
     * Renames an attribute on the item.
     * @param {string} oldName The current name of the attribute
     * @param {string} newName The new name of the attribute
     * @returns The Transformation object
     */
    public renameAttribute(oldName: string, newName: string): Transformation<T> {
        this.transformations.push((item: T) => {
            item[newName] = item[oldName]
            delete item[oldName]
            return item
        })

        return this
    }

    /**
     * Modifies an attribute on the item.
     * @param {string} attribute The name of the attribute to modify
     * @param {(item: T) => any} value A function that returns the new value of the attribute
     * @returns The Transformation object
     */
    public mapAttribute(attribute: string, value: (item: T) => any): Transformation<T> {
        this.transformations.push((item: T) => {
            item[attribute] = value(item)
            return item
        })

        return this
    }

    /**
     * Sets the value of an attribute on the item to a static value.
     * @param {string} attribute The name of the attribute to set
     * @param {any} value The value to set the attribute to
     * @returns The Transformation object
     */
    public setAttribute(attribute: string, value: any): Transformation<T> {
        this.transformations.push((item: T) => {
            item[attribute] = value
            return item
        })

        return this
    }

    /**
     * Filters items that should not be transformed.
     * @param {(item: T) => boolean} filter A function that returns true if the item should be transformed
     * @returns The Transformation object
     */
    public filter(filter: (item: T) => boolean): Transformation<T> {
        this.filterFunctions.push(filter)
        return this
    }

    /**
     * Maps an item to a new item.
     * @param {(item: T) => T} map A function that returns the new item
     * @returns The Transformation object
     */
    public map(map: (item: T) => T): Transformation<T> {
        this.transformations.push((item: T) => {
            return map(item)
        })

        return this
    }

    /**
     * Removes an item from the table.
     * @param {(item: T) => boolean} filter A function that returns true if the item should be removed
     * @returns The Transformation object
     */
    public remove(filter: (item: T) => boolean): Transformation<T> {
        this.removeFunctions.push(filter)
        return this
    }

    /**
     * Backs up the table before transforming it.
     * @param {string} name The name of the backup
     */
    public async backup(name: string): Promise<void> {
        await this.client.send(
            new CreateBackupCommand({
                TableName: this.table,
                BackupName: name,
            })
        )
    }

    /**
     * Transforms the items in the table. Depending on the number of items in the table, this
     * could take a long time to complete.
     */
    public async execute(): Promise<void> {
        // Get all items from the table
        const items: T[] = []
        let lastEvaluatedKey: any = undefined
        do {
            const response = await this.client.send(
                new ScanCommand({
                    TableName: this.table,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            )
            items.push(...(response.Items as T[]))
            lastEvaluatedKey = response.LastEvaluatedKey
        } while (lastEvaluatedKey)

        // Filter items that should not be transformed
        const filteredItems: T[] = items.filter((item: T) => {
            return this.filterFunctions.every((filter: (item: T) => boolean) => {
                return filter(item)
            })
        })

        // Transform items
        const transformedItems: T[] = filteredItems.map((item: T) => {
            return this.transformations.reduce((item: T, transformation: (item: T) => T) => {
                return transformation(item)
            }, item)
        })

        // Remove items
        const itemsToRemove: T[] = filteredItems.filter((item: T) => {
            return this.removeFunctions.some((filter: (item: T) => boolean) => {
                return filter(item)
            })
        })

        const chunkArray = (array: T[], chunkSize: number): T[][] => {
            const results: T[][] = []
            while (array.length) {
                results.push(array.splice(0, chunkSize))
            }
            return results
        }

        const chunkedItemsToRemove = chunkArray(itemsToRemove, 25)
        chunkedItemsToRemove.map(async (chunk: T[]) => {
            await this.client.send(
                new BatchWriteItemCommand({
                    RequestItems: {
                        [this.table]: chunk.map((item: T) => {
                            return {
                                DeleteRequest: {
                                    Key: marshall(item),
                                },
                            }
                        }),
                    },
                })
            )
        })

        const chunkedTransformedItems = chunkArray(transformedItems, 25)
        chunkedTransformedItems.map(async (chunk: T[]) => {
            await this.client.send(
                new BatchWriteItemCommand({
                    RequestItems: {
                        [this.table]: chunk.map((item: T) => {
                            return {
                                PutRequest: {
                                    Item: marshall(item),
                                },
                            }
                        }),
                    },
                })
            )
        })

        await Promise.all(chunkedItemsToRemove)
        await Promise.all(chunkedTransformedItems)

        console.log(`Transformed ${transformedItems.length} items`)
        console.log(`Removed ${itemsToRemove.length} items`)
    }

    /**
     * Preview the items that will be transformed and store them in a file.
     * @param {string} filename The name of the file to store the items in
     * @returns The Transformation object
     */
    public async preview(filename: string): Promise<void> {
        // Get all items from the table
        const items: T[] = []
        let lastEvaluatedKey: any = undefined
        do {
            const response = await this.client.send(
                new ScanCommand({
                    TableName: this.table,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            )
            items.push(...(response.Items as T[]))
            lastEvaluatedKey = response.LastEvaluatedKey
        } while (lastEvaluatedKey)

        // Filter items that should not be transformed
        const filteredItems: T[] = items.filter((item: T) => {
            return this.filterFunctions.every((filter: (item: T) => boolean) => {
                return filter(item)
            })
        })

        // Transform items
        const transformedItems: T[] = filteredItems.map((item: T) => {
            return this.transformations.reduce((item: T, transformation: (item: T) => T) => {
                return transformation(item)
            }, item)
        })

        // Remove items
        const itemsToRemove: T[] = filteredItems.filter((item: T) => {
            return this.removeFunctions.some((filter: (item: T) => boolean) => {
                return filter(item)
            })
        })

        // Write items to file
        await fs.promises.writeFile(
            filename,
            JSON.stringify({
                transformedItems,
                itemsToRemove,
            })
        )
    }
}
