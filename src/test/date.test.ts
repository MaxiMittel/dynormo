// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('date', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('create with nullable date', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        // Mock the PutItemCommand
        ddbMock.on(PutItemCommand).resolves({});

        const item = await client.date.create({
            partitionKey: 'date#test#01',
            dateAttr: null,
        });

        expect(item.dateAttr).toBeInstanceOf(Date);
        expect(item.dateAttr2).toBeNull();

        // Verify the PutItemCommand was called with the expected parameters
        expect(ddbMock.calls()).toHaveLength(1);
        const putItemInput = ddbMock.call(0).args[0].input;
        expect(putItemInput).toEqual({
            TableName: expect.any(String), // Replace with your actual table name if known
            Item: {
                partitionKey: { S: 'date#test#01' },
                dateAttr: { NULL: true },
                dateAttr2: { NULL: true },
            },
        });
    });
});
