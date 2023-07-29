// @ts-nocheck
import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('create', () => {
    test('pK - static sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const date = new Date()

        const item = await client.findone1.create({
            partitionKey: 'test_id',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })

        expect(item).toStrictEqual({
            partitionKey: 'test_id',
            sortKey: 'static_key',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })
    })

    test('pK - static sK - generators', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const item = await client.findone1.create({
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
        })

        // Check if the partitionKey is uuid
        expect(item.partitionKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/)

        // Check if dateAttr is a date
        expect(item.dateAttr).toBeInstanceOf(Date)
    })

    test('pK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const date = new Date()

        const item = await client.findone2.create({
            partitionKey: 'test_id_create_pk',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })

        expect(item).toStrictEqual({
            partitionKey: 'test_id_create_pk',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })
    })

    test('pK - sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const date = new Date()

        const item = await client.findone3.create({
            partitionKey: 'test_id_create_pk_sk',
            sortKey: 'test_sort_key',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })

        expect(item).toStrictEqual({
            partitionKey: 'test_id_create_pk_sk',
            sortKey: 'test_sort_key',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })
    })
})
