// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, PutItemCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe, beforeEach, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('subscribe', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('create', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const date = new Date();

        const mockItem = {
            partitionKey: { S: 'test_id_subscribe_create' },
            sortKey: { S: 'static_key' },
            stringAttr1: { S: 'test_value_1_create' },
            stringAttr2: { S: 'test_value_2_create' },
            dateAttr: { S: date.toISOString() },
        };

        ddbMock.on(PutItemCommand).resolves({ Attributes: mockItem });
        ddbMock.on(DeleteItemCommand).resolves({});

        const subscribeMock = jest.fn();

        client.findone1.subscribe('CREATE', subscribeMock);

        await client.findone1.create({
            partitionKey: 'test_id_subscribe_create',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        });

        expect(subscribeMock).toHaveBeenCalledWith({
            partitionKey: 'test_id_subscribe_create',
            sortKey: 'static_key',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        });

        await client.findone1.delete('test_id_subscribe_create');
    });

    test('update', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const date = new Date();

        const mockItem = {
            partitionKey: { S: 'test_id_subscribe_update' },
            sortKey: { S: 'static_key' },
            stringAttr1: { S: 'test_value_1_updated' },
            stringAttr2: { S: 'test_value_2_updated' },
            dateAttr: { S: date.toISOString() },
        };

        ddbMock.on(PutItemCommand).resolves({});
        ddbMock.on(UpdateItemCommand).resolves({ Attributes: mockItem });
        ddbMock.on(DeleteItemCommand).resolves({});

        const subscribeMock = jest.fn();

        client.findone1.subscribe('UPDATE', subscribeMock);

        await client.findone1.create({
            partitionKey: 'test_id_subscribe_update',
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            dateAttr: date,
        });

        await client.findone1.update('test_id_subscribe_update', {
            stringAttr1: 'test_value_1_updated',
            stringAttr2: 'test_value_2_updated',
        });

        expect(subscribeMock).toHaveBeenCalledWith({
            partitionKey: 'test_id_subscribe_update',
            sortKey: 'static_key',
            stringAttr1: 'test_value_1_updated',
            stringAttr2: 'test_value_2_updated',
            dateAttr: date,
        });

        await client.findone1.delete('test_id_subscribe_update');
    });
});
