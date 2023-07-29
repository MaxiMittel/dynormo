// @ts-nocheck
import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('delete', () => {
    test('pK - static sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone1.create({
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
        })

        const itemExists = await client.findone1.findOne(item.partitionKey)

        expect(itemExists).toBeDefined()

        await client.findone1.delete(item.partitionKey)

        const itemDeleted = await client.findone1.findOne(item.partitionKey)

        expect(itemDeleted).toBeNull()
    })

    test('pK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone2.create({
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            partitionKey: 'test_id_delete',
            dateAttr: new Date(),
        })

        const itemExists = await client.findone2.findOne(item.partitionKey)

        expect(itemExists).toBeDefined()

        await client.findone2.delete(item.partitionKey)

        const itemDeleted = await client.findone2.findOne(item.partitionKey)

        expect(itemDeleted).toBeNull()
    })

    test('deleteMany', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const time = Date.now();

        const items = await Promise.all([
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
        ])

        const itemsExists = await Promise.all(items.map((item) => client.findone1.findOne(item.partitionKey)))

        expect(itemsExists.filter((a) => a)).toHaveLength(4)

        await client.findone1.deleteMany({
            where: {
                stringAttr1: 'to_delete' + time,
            },
        })

        const itemsDeleted = await Promise.all(items.map((item) => client.findone1.findOne(item.partitionKey)))

        expect(itemsDeleted.filter((a) => a)).toHaveLength(0)
    })
})
