// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('array', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('empty set', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        // Mock DynamoDB responses
        ddbMock.on(PutItemCommand).resolves({});
        ddbMock.on(GetItemCommand).resolves({
            Item: {
                partitionKey: { S: 'test_id_delete' },
                setAttr1: { SS: [] },
                arrayAttr2: { L: [] },
            },
        });
        ddbMock.on(UpdateItemCommand).resolves({
            Attributes: {
                partitionKey: { S: 'test_id_delete' },
                setAttr1: { SS: ['test_value_1_create', 'test_value_2_create'] },
                arrayAttr2: { L: [] },
            },
        });
        ddbMock.on(DeleteItemCommand).resolves({});

        const item = await client.arraytest.create({
            partitionKey: 'test_id_delete',
            setAttr1: new Set([]),
            arrayAttr2: [],
        });

        expect(item.setAttr1).toEqual(new Set([]));

        const itemExists = await client.arraytest.findOne(item.partitionKey);

        expect(itemExists.setAttr1).toEqual(new Set([]));

        const updated = await client.arraytest.update(item.partitionKey, {
            setAttr1: new Set(['test_value_1_create', 'test_value_2_create']),
        });

        expect(updated.setAttr1).toEqual(new Set(['test_value_1_create', 'test_value_2_create']));

        const itemUpdated = await client.arraytest.findOne(item.partitionKey);

        expect(itemUpdated.setAttr1).toEqual(new Set(['test_value_1_create', 'test_value_2_create']));

        await client.arraytest.delete(item.partitionKey);
    });

    test('empty array', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const item = await client.arraytest.create({
            partitionKey: 'test_id_delete',
            setAttr1: new Set([]),
            arrayAttr2: [],
        });

        expect(item.arrayAttr2).toEqual([]);

        const itemExists = await client.arraytest.findOne(item.partitionKey);

        expect(itemExists.arrayAttr2).toEqual([]);

        const updated = await client.arraytest.update(item.partitionKey, {
            arrayAttr2: [1, 2],
        });

        expect(updated.arrayAttr2).toEqual([1, 2]);

        const itemUpdated = await client.arraytest.findOne(item.partitionKey);

        expect(itemUpdated.arrayAttr2).toEqual([1, 2]);

        await client.arraytest.delete(item.partitionKey);
    });

    test('create array', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const item = await client.arraytest.create({
            partitionKey: 'test_id_delete',
            arrayAttr2: [1, 2, 3],
            setAttr1: new Set([]),
        });

        expect(item.arrayAttr2).toEqual([1, 2, 3]);

        const itemExists = await client.arraytest.findOne(item.partitionKey);

        expect(itemExists.arrayAttr2).toEqual([1, 2, 3]);

        await client.arraytest.delete(item.partitionKey);
    });

    test('contains array', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        // Mock DynamoDB responses
        ddbMock.on(PutItemCommand).resolves({});
        ddbMock.on(ScanCommand).resolves({
            Items: [
                {
                    partitionKey: { S: 'test_id_in_1' },
                    setAttr1: { SS: [] },
                    arrayAttr2: { L: [{ N: '1' }, { N: '2' }, { N: '3' }, { N: '56' }] },
                },
            ],
        });
        ddbMock.on(DeleteItemCommand).resolves({});

        await client.arraytest.create({
            partitionKey: 'test_id_in_1',
            arrayAttr2: [1, 2, 3, 56],
            setAttr1: new Set([]),
        });

        await client.arraytest.create({
            partitionKey: 'test_id_in_2',
            arrayAttr2: [1, 2, 3],
            setAttr1: new Set([]),
        });

        const result = await client.arraytest.findMany({
            where: {
                arrayAttr2: {
                    contains: 56,
                },
            },
        });

        expect(result.items.length).toEqual(1);

        await client.arraytest.delete('test_id_in_1');
        await client.arraytest.delete('test_id_in_2');
    });
});
