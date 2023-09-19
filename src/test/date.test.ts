// @ts-nocheck
import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('date', () => {
    test('create with nullable date', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error']
        })

        const item = await client.date.create({
            partitionKey: 'date#test#01',
            dateAttr: null,
        })

        expect(item).toStrictEqual({
            partitionKey: 'date#test#01',
            dateAttr: null,
            dateAttr2: null,
        });   
    })
})
