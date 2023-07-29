// @ts-nocheck
import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('subscribe', () => {
    test('create', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        })

        const date = new Date()

        client.findone1.subscribe('CREATE', (item) => {
            expect(item).toStrictEqual({
                partitionKey: 'test_id_subscribe_create',
                sortKey: 'static_key',
                stringAttr1: 'test_value_1_create',
                stringAttr2: 'test_value_2_create',
                dateAttr: date,
            })
        })

        await client.findone1.create({
            partitionKey: 'test_id_subscribe_create',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })

        await client.findone1.delete('test_id_subscribe_create')
    })

    test('update', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        })

        const date = new Date()

        client.findone1.subscribe('UPDATE', (item) => {
            expect(item).toStrictEqual({
                partitionKey: 'test_id_subscribe_update',
                sortKey: 'static_key',
                stringAttr1: 'test_value_1_updated',
                stringAttr2: 'test_value_2_updated',
                dateAttr: date,
            })
        })

        await client.findone1.create({
            partitionKey: 'test_id_subscribe_update',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        })

        await client.findone1.update('test_id_subscribe_update', {
            stringAttr1: 'test_value_1_updated',
            stringAttr2: 'test_value_2_updated',
        })

        await client.findone1.delete('test_id_subscribe_update')
    })
})
