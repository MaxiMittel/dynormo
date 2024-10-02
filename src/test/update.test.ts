// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('update', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('pK - static sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const mockItem = {
            partitionKey: { S: 'test_id' },
            sortKey: { S: 'static_key' },
            stringAttr1: { S: 'test_value_1_update' },
            stringAttr2: { S: 'test_value_2_update' },
        };

        const mockUpdatedItem = {
            ...mockItem,
            stringAttr1: { S: 'test_value_1_update_updated' },
        };

        ddbMock.on(PutItemCommand).resolves({ Attributes: mockItem });
        ddbMock.on(UpdateItemCommand).resolves({ Attributes: mockUpdatedItem });
        ddbMock.on(GetItemCommand).resolves({ Item: mockUpdatedItem });
        ddbMock.on(DeleteItemCommand).resolves({});

        const item = await client.findone1.create({
            stringAttr1: 'test_value_1_update',
            stringAttr2: 'test_value_2_update',
        });

        const updatedItem = await client.findone1.update(item.partitionKey, {
            stringAttr1: 'test_value_1_update_updated',
        });

        expect(updatedItem.stringAttr1).toBe('test_value_1_update_updated');

        const retrievedItem = await client.findone1.findOne(item.partitionKey);

        expect(retrievedItem.stringAttr1).toBe('test_value_1_update_updated');

        await client.findone1.delete(item.partitionKey);
    });

    test('pK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const date = new Date();

        const mockItem = {
            partitionKey: { S: 'test_id_update_pk' },
            stringAttr1: { S: 'test_value_1_update' },
            stringAttr2: { S: 'test_value_2_update' },
            dateAttr: { S: date.toISOString() },
        };

        const mockUpdatedItem = {
            ...mockItem,
            stringAttr1: { S: 'test_value_1_create_updated' },
        };

        ddbMock.on(PutItemCommand).resolves({ Attributes: mockItem });
        ddbMock.on(UpdateItemCommand).resolves({ Attributes: mockUpdatedItem });
        ddbMock.on(GetItemCommand).resolves({ Item: mockUpdatedItem });
        ddbMock.on(DeleteItemCommand).resolves({});

        const item = await client.findone2.create({
            partitionKey: 'test_id_update_pk',
            stringAttr1: 'test_value_1_update',
            stringAttr2: 'test_value_2_update',
            dateAttr: date,
        });

        const updatedItem = await client.findone2.update(item.partitionKey, {
            stringAttr1: 'test_value_1_create_updated',
        });

        expect(updatedItem.stringAttr1).toBe('test_value_1_create_updated');
        expect(updatedItem.stringAttr2).toBe('test_value_2_update');
        expect(updatedItem.dateAttr).toStrictEqual(date);

        const retrievedItem = await client.findone2.findOne(item.partitionKey);

        expect(retrievedItem.stringAttr1).toBe('test_value_1_create_updated');
        expect(retrievedItem.stringAttr2).toBe('test_value_2_update');
        expect(retrievedItem.dateAttr).toStrictEqual(date);

        await client.findone2.delete(item.partitionKey);
    });

    test('pK - sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const date = new Date();
        const newDate = new Date();

        const mockItem = {
            partitionKey: { S: 'test_id_update_pk_sk' },
            sortKey: { S: 'test_sort_key' },
            stringAttr1: { S: 'test_value_1_update' },
            stringAttr2: { S: 'test_value_2_update' },
            dateAttr: { S: date.toISOString() },
        };

        const mockUpdatedItem = {
            ...mockItem,
            stringAttr1: { S: 'test_value_1_create_updated' },
            stringAttr2: { S: 'test_value_2_create_updated' },
            dateAttr: { S: newDate.toISOString() },
        };

        ddbMock.on(PutItemCommand).resolves({ Attributes: mockItem });
        ddbMock.on(UpdateItemCommand).resolves({ Attributes: mockUpdatedItem });
        ddbMock.on(GetItemCommand).resolves({ Item: mockUpdatedItem });
        ddbMock.on(DeleteItemCommand).resolves({});

        const item = await client.findone3.create({
            partitionKey: 'test_id_update_pk_sk',
            sortKey: 'test_sort_key',
            stringAttr1: 'test_value_1_update',
            stringAttr2: 'test_value_2_update',
            dateAttr: date,
        });

        const updatedItem = await client.findone3.update(item.partitionKey, item.sortKey, {
            stringAttr1: 'test_value_1_create_updated',
            stringAttr2: 'test_value_2_create_updated',
            dateAttr: newDate,
        });

        expect(updatedItem.stringAttr1).toBe('test_value_1_create_updated');
        expect(updatedItem.stringAttr2).toBe('test_value_2_create_updated');
        expect(updatedItem.dateAttr).toStrictEqual(newDate);

        const retrievedItem = await client.findone3.findOne(item.partitionKey, item.sortKey);

        expect(retrievedItem.stringAttr1).toBe('test_value_1_create_updated');
        expect(retrievedItem.stringAttr2).toBe('test_value_2_create_updated');
        expect(retrievedItem.dateAttr).toStrictEqual(newDate);

        await client.findone3.delete(item.partitionKey, item.sortKey);
    });
});
