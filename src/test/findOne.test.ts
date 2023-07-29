// @ts-nocheck
import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('findOne', () => {
    test('pK - static sK - exists', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone1.findOne('findOne#test#01')

        expect(item).toStrictEqual({
            partitionKey: 'findOne#test#01',
            sortKey: 'static_key',
            stringAttr1: 'test_attr_1',
            stringAttr2: 'test_attr_2',
            dateAttr: new Date('2023-10-10T00:00:00.000Z'),
        })
    })

    test('pK - static sK - null', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone1.findOne('findOne#test#not-exists')

        expect(item).toBeNull()
    })

    test('pK - no sK - exists', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone2.findOne('findOne#test#02')

        expect(item).toStrictEqual({
            partitionKey: 'findOne#test#02',
            stringAttr1: 'test_attr_1',
            stringAttr2: 'test_attr_2',
            dateAttr: new Date('2023-10-10T00:00:00.000Z'),
        })
    })

    test('pK - no sK - null', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone2.findOne('findOne#test#not-exists')

        expect(item).toBeNull()
    })

    test('pK - sK - exists', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone3.findOne('findOne#test#03', 'random_key')

        expect(item).toStrictEqual({
            partitionKey: 'findOne#test#03',
            sortKey: 'random_key',
            stringAttr1: 'test_attr_1',
            stringAttr2: 'test_attr_2',
            dateAttr: new Date('2023-10-10T00:00:00.000Z'),
        })
    })

    test('pK - sK - null', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.findone3.findOne('findOne#test#not-exists', 'not-exists')

        expect(item).toBeNull()
    })
})
