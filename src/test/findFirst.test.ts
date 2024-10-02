// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { expect, test, describe, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

describe('findFirst', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    test('pK - static sK - scan', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        ddbMock.on(ScanCommand).resolves({
            Items: [
                {
                    partitionKey: { S: 'findMany#test#01' },
                    stringAttr1: { S: 'test_value_1' },
                },
            ],
        });

        const item = await client.findone1.findFirst({
            where: {
                stringAttr1: 'test_value_1',
            },
        });

        expect(item).toBeDefined();
    });

    test('pK - static sK - scan empty', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        ddbMock.on(ScanCommand).resolves({
            Items: [],
        });

        const item = await client.findone1.findFirst({
            where: {
                stringAttr1: 'test_value_5',
            },
        });

        expect(item).toBeNull();
    });

    test('pK - static sK - query', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    partitionKey: { S: 'findMany#test#01' },
                    stringAttr1: { S: 'test_value_1' },
                },
            ],
        });

        const item = await client.findone1.findFirst({
            where: {
                stringAttr1: 'test_value_1',
            },
            key: {
                partitionKey: 'findMany#test#01',
            },
        });

        expect(item).toBeDefined();
    });

    test('pK - sK begins with - query', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({}),
            logger: ['error'],
        });

        ddbMock.on(QueryCommand).resolves({
            Items: [
                {
                    partitionKey: { S: 'findMany#test#10' },
                    sortKey: { S: 'findMany#test#10#somevalue' },
                },
            ],
        });

        const item = await client.findone3.findFirst({
            key: {
                partitionKey: 'findMany#test#10',
                sortKey: {
                    beginsWith: 'findMany#test#10',
                },
            },
        });

        expect(item).toBeDefined();
    });
});
