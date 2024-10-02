// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('delete', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('pK - static sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        // Mock PutItemCommand for create
        ddbMock.on(PutItemCommand).resolves({});

        // Mock GetItemCommand for findOne
        ddbMock
            .on(GetItemCommand)
            .onFirstCall()
            .resolves({ Item: { partitionKey: { S: 'test_id' } } })
            .onSecondCall()
            .resolves({ Item: null });

        // Mock DeleteItemCommand
        ddbMock.on(DeleteItemCommand).resolves({});

        const item = await client.findone1.create({
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
        });

        const itemExists = await client.findone1.findOne(item.partitionKey);

        expect(itemExists).toBeDefined();

        await client.findone1.delete(item.partitionKey);

        const itemDeleted = await client.findone1.findOne(item.partitionKey);

        expect(itemDeleted).toBeNull();
    });

    test('pK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        // Mock PutItemCommand for create
        ddbMock.on(PutItemCommand).resolves({});

        // Mock GetItemCommand for findOne
        ddbMock
            .on(GetItemCommand)
            .onFirstCall()
            .resolves({ Item: { partitionKey: { S: 'test_id_delete' } } })
            .onSecondCall()
            .resolves({ Item: null });

        // Mock DeleteItemCommand
        ddbMock.on(DeleteItemCommand).resolves({});

        const item = await client.findone2.create({
            stringAttr1: 'test_value_1_create',
            stringAttr2: 'test_value_2_create',
            partitionKey: 'test_id_delete',
            dateAttr: new Date(),
        });

        const itemExists = await client.findone2.findOne(item.partitionKey);

        expect(itemExists).toBeDefined();

        await client.findone2.delete(item.partitionKey);

        const itemDeleted = await client.findone2.findOne(item.partitionKey);

        expect(itemDeleted).toBeNull();
    });

    test('deleteMany', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        const time = Date.now();

        // Mock PutItemCommand for create
        ddbMock.on(PutItemCommand).resolves({});

        // Mock GetItemCommand for findOne
        ddbMock
            .on(GetItemCommand)
            .onFirstCall()
            .resolves({ Item: { partitionKey: { S: 'test_id_1' } } })
            .onSecondCall()
            .resolves({ Item: { partitionKey: { S: 'test_id_2' } } })
            .onThirdCall()
            .resolves({ Item: { partitionKey: { S: 'test_id_3' } } })
            .onFourthCall()
            .resolves({ Item: { partitionKey: { S: 'test_id_4' } } })
            .onCall(4)
            .resolves({ Item: null })
            .onCall(5)
            .resolves({ Item: null })
            .onCall(6)
            .resolves({ Item: null })
            .onCall(7)
            .resolves({ Item: null });

        // Mock ScanCommand for deleteMany
        ddbMock.on(ScanCommand).resolves({
            Items: [{ partitionKey: { S: 'test_id_1' } }, { partitionKey: { S: 'test_id_2' } }, { partitionKey: { S: 'test_id_3' } }, { partitionKey: { S: 'test_id_4' } }],
        });

        // Mock DeleteItemCommand
        ddbMock.on(DeleteItemCommand).resolves({});

        const items = await Promise.all([
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
            client.findone1.create({
                stringAttr1: 'to_delete' + time,
                stringAttr2: 'test_value_2_create',
            }),
        ]);

        const itemsExists = await Promise.all(items.map((item) => client.findone1.findOne(item.partitionKey)));

        expect(itemsExists.filter((a) => a)).toHaveLength(4);

        await client.findone1.deleteMany({
            where: {
                stringAttr1: 'to_delete' + time,
            },
        });

        const itemsDeleted = await Promise.all(items.map((item) => client.findone1.findOne(item.partitionKey)));

        expect(itemsDeleted.filter((a) => a)).toHaveLength(0);
    });
});
