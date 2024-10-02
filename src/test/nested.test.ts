// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('nested', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('create', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const createdItem = {
            partitionKey: { S: 'test_id' },
            nestedAttr1: { M: {
                nestedAttr1_1: { S: 'test_value_1_create' },
                nestedAttr1_2: { N: '1' },
            }},
            nestedAttr2: { M: {
                nestedAttr2_1: { S: 'test_value_2_create' },
                nestedAttr2_2: { M: {
                    nestedAttr2_2_1: { S: 'test_value_3_create' },
                    nestedAttr2_2_2: { N: '2' },
                }},
            }},
            nestedArrayAttr1: { L: [
                { M: {
                    nestedAttr1_1: { S: 'test_value_4_create' },
                    nestedAttr1_2: { N: '3' },
                }},
                { M: {
                    nestedAttr1_1: { S: 'test_value_5_create' },
                    nestedAttr1_2: { N: '4' },
                }},
            ]},
        };

        ddbMock.on(PutItemCommand).resolves({});
        ddbMock.on(GetItemCommand).resolves({ Item: createdItem });
        ddbMock.on(DeleteItemCommand).resolves({});

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
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const createdItem = {
            partitionKey: { S: 'test_id' },
            nestedAttr1: { M: {
                nestedAttr1_1: { S: 'test_value_1_create' },
                nestedAttr1_2: { N: '1' },
            }},
            nestedAttr2: { M: {
                nestedAttr2_1: { S: 'test_value_2_create' },
                nestedAttr2_2: { M: {
                    nestedAttr2_2_1: { S: 'test_value_3_create' },
                    nestedAttr2_2_2: { N: '2' },
                }},
            }},
            nestedArrayAttr1: { L: [
                { M: {
                    nestedAttr1_1: { S: 'test_value_4_create' },
                    nestedAttr1_2: { N: '3' },
                }},
                { M: {
                    nestedAttr1_1: { S: 'test_value_5_create' },
                    nestedAttr1_2: { N: '4' },
                }},
            ]},
        };

        const updatedItem = {
            partitionKey: { S: 'test_id' },
            nestedAttr1: { M: {
                nestedAttr1_1: { S: 'test_value_1_update' },
                nestedAttr1_2: { N: '1' },
            }},
            nestedAttr2: { M: {
                nestedAttr2_1: { S: 'test_value_2_update' },
                nestedAttr2_2: { M: {
                    nestedAttr2_2_1: { S: 'test_value_3_update' },
                    nestedAttr2_2_2: { N: '2' },
                }},
            }},
            nestedArrayAttr1: { L: [
                { M: {
                    nestedAttr1_1: { S: 'test_value_4_update' },
                    nestedAttr1_2: { N: '3' },
                }},
                { M: {
                    nestedAttr1_1: { S: 'test_value_5_update' },
                    nestedAttr1_2: { N: '4' },
                }},
            ]},
        };

        ddbMock.on(PutItemCommand).resolves({});
        ddbMock.on(GetItemCommand)
            .onFirstCall().resolves({ Item: createdItem })
            .onSecondCall().resolves({ Item: updatedItem });
        ddbMock.on(UpdateItemCommand).resolves({});
        ddbMock.on(DeleteItemCommand).resolves({});

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