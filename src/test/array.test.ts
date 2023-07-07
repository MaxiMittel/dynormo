// @ts-nocheck
import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('array', () => {
    test('empty array', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const item = await client.arraytest.create({
            partitionKey: 'test_id_delete',
            setAttr1: new Set([]),
        });

        expect(item.setAttr1).toEqual(new Set([]));

        const itemExists = await client.arraytest.findOne(item.partitionKey)

        expect(itemExists.setAttr1).toEqual(new Set([]));
        
        const updated = await client.arraytest.update(item.partitionKey, {
            setAttr1: new Set(['test_value_1_create', 'test_value_2_create']),
        });

        expect(updated.setAttr1).toEqual(new Set(['test_value_1_create', 'test_value_2_create']));

        const itemUpdated = await client.arraytest.findOne(item.partitionKey)

        expect(itemUpdated.setAttr1).toEqual(new Set(['test_value_1_create', 'test_value_2_create']));

        await client.arraytest.delete(item.partitionKey)
    })
})
