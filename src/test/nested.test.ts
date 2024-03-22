// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { expect, test, describe } from '@jest/globals';

describe('nested', () => {
    test('create', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const item = await client.nestedtestmodel.create({
            nestedAttr1: {
                nestedAttr1_1: 'test_value_1_create',
                nestedAttr1_2: 1,
            },
            nestedAttr2: {
                nestedAttr2_1: 'test_value_2_create',
                nestedAttr2_2: {
                    nestedAttr2_2_1: 'test_value_3_create',
                    nestedAttr2_2_2: 2,
                },
            },
            nestedArrayAttr1: [
                {
                    nestedAttr1_1: 'test_value_4_create',
                    nestedAttr1_2: 3,
                },
                {
                    nestedAttr1_1: 'test_value_5_create',
                    nestedAttr1_2: 4,
                },
            ],
        });

        expect(item.nestedAttr1).toEqual({
            nestedAttr1_1: 'test_value_1_create',
            nestedAttr1_2: 1,
        });

        expect(item.nestedAttr2).toEqual({
            nestedAttr2_1: 'test_value_2_create',
            nestedAttr2_2: {
                nestedAttr2_2_1: 'test_value_3_create',
                nestedAttr2_2_2: 2,
            },
        });

        expect(item.nestedArrayAttr1).toEqual([
            {
                nestedAttr1_1: 'test_value_4_create',
                nestedAttr1_2: 3,
            },
            {
                nestedAttr1_1: 'test_value_5_create',
                nestedAttr1_2: 4,
            },
        ]);

        const itemExists = await client.nestedtestmodel.findOne(item.partitionKey);

        expect(itemExists.nestedAttr1).toEqual({
            nestedAttr1_1: 'test_value_1_create',
            nestedAttr1_2: 1,
        });

        expect(itemExists.nestedAttr2).toEqual({
            nestedAttr2_1: 'test_value_2_create',
            nestedAttr2_2: {
                nestedAttr2_2_1: 'test_value_3_create',
                nestedAttr2_2_2: 2,
            },
        });

        expect(itemExists.nestedArrayAttr1).toEqual([
            {
                nestedAttr1_1: 'test_value_4_create',
                nestedAttr1_2: 3,
            },
            {
                nestedAttr1_1: 'test_value_5_create',
                nestedAttr1_2: 4,
            },
        ]);

        await client.nestedtestmodel.delete(item.partitionKey);
    });

    test('update', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const item = await client.nestedtestmodel.create({
            nestedAttr1: {
                nestedAttr1_1: 'test_value_1_create',
                nestedAttr1_2: 1,
            },
            nestedAttr2: {
                nestedAttr2_1: 'test_value_2_create',
                nestedAttr2_2: {
                    nestedAttr2_2_1: 'test_value_3_create',
                    nestedAttr2_2_2: 2,
                },
            },
            nestedArrayAttr1: [
                {
                    nestedAttr1_1: 'test_value_4_create',
                    nestedAttr1_2: 3,
                },
                {
                    nestedAttr1_1: 'test_value_5_create',
                    nestedAttr1_2: 4,
                },
            ],
        });

        expect(item.nestedAttr1).toEqual({
            nestedAttr1_1: 'test_value_1_create',
            nestedAttr1_2: 1,
        });

        expect(item.nestedAttr2).toEqual({
            nestedAttr2_1: 'test_value_2_create',
            nestedAttr2_2: {
                nestedAttr2_2_1: 'test_value_3_create',
                nestedAttr2_2_2: 2,
            },
        });

        expect(item.nestedArrayAttr1).toEqual([
            {
                nestedAttr1_1: 'test_value_4_create',
                nestedAttr1_2: 3,
            },
            {
                nestedAttr1_1: 'test_value_5_create',
                nestedAttr1_2: 4,
            },
        ]);

        await client.nestedtestmodel.update(item.partitionKey, {
            nestedAttr1: {
                nestedAttr1_1: 'test_value_1_update',
                nestedAttr1_2: 1,
            },
            nestedAttr2: {
                nestedAttr2_1: 'test_value_2_update',
                nestedAttr2_2: {
                    nestedAttr2_2_1: 'test_value_3_update',
                    nestedAttr2_2_2: 2,
                },
            },
            nestedArrayAttr1: [
                {
                    nestedAttr1_1: 'test_value_4_update',
                    nestedAttr1_2: 3,
                },
                {
                    nestedAttr1_1: 'test_value_5_update',
                    nestedAttr1_2: 4,
                },
            ],
        });

        const itemExists = await client.nestedtestmodel.findOne(item.partitionKey);

        expect(itemExists.nestedAttr1).toEqual({
            nestedAttr1_1: 'test_value_1_update',
            nestedAttr1_2: 1,
        });

        expect(itemExists.nestedAttr2).toEqual({
            nestedAttr2_1: 'test_value_2_update',
            nestedAttr2_2: {
                nestedAttr2_2_1: 'test_value_3_update',
                nestedAttr2_2_2: 2,
            },
        });

        expect(itemExists.nestedArrayAttr1).toEqual([
            {
                nestedAttr1_1: 'test_value_4_update',
                nestedAttr1_2: 3,
            },
            {
                nestedAttr1_1: 'test_value_5_update',
                nestedAttr1_2: 4,
            },
        ]);

        await client.nestedtestmodel.delete(item.partitionKey);
    });
});
