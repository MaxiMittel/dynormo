// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { expect, test, describe } from '@jest/globals';

describe('findFirst', () => {
    test('pK - static sK - scan', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
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
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
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
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
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
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
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
