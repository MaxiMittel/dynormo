// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { expect, test, describe } from '@jest/globals';

describe('findMany', () => {
    test('pK - static sK - scan', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const item = await client.findone1.findMany({
            where: {
                stringAttr1: 'test_value_1',
                stringAttr2: undefined,
            },
        });

        expect(item.count).toBe(2);

        const expectedItems = [
            {
                partitionKey: 'findMany#test#01',
                sortKey: 'static_key',
                stringAttr1: 'test_value_1',
                stringAttr2: 'test_attr_2',
                dateAttr: new Date('2023-10-10T00:00:00.000Z'),
            },
            {
                partitionKey: 'findMany#test#02',
                sortKey: 'static_key',
                stringAttr1: 'test_value_1',
                stringAttr2: 'test_attr_2',
                dateAttr: new Date('2023-10-10T00:00:00.000Z'),
            },
        ];

        for (const expectedItem of expectedItems) {
            expect(item.items).toContainEqual(expectedItem);
        }
    });

    test('pK - static sK - scan empty', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const item = await client.findone1.findMany({
            where: {
                stringAttr1: 'test_value_5',
            },
        });

        expect(item.count).toBe(0);
        expect(item.items).toStrictEqual([]);
    });

    test('pK - static sK - query', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const item = await client.findone1.findMany({
            where: {
                stringAttr1: 'test_value_1',
            },
            key: {
                partitionKey: 'findMany#test#01',
            },
        });

        expect(item.count).toBe(1);

        const expectedItems = [
            {
                partitionKey: 'findMany#test#01',
                sortKey: 'static_key',
                stringAttr1: 'test_value_1',
                stringAttr2: 'test_attr_2',
                dateAttr: new Date('2023-10-10T00:00:00.000Z'),
            },
        ];

        for (const expectedItem of expectedItems) {
            expect(item.items).toContainEqual(expectedItem);
        }
    });

    test('pK - sK begins with - query', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const item = await client.findone3.findMany({
            key: {
                partitionKey: 'findMany#test#10',
                sortKey: {
                    beginsWith: 'findMany#test#10',
                },
            },
        });

        expect(item.count).toBe(3);

        const expectedItems = [
            {
                partitionKey: 'findMany#test#10',
                sortKey: 'findMany#test#10#01',
                dateAttr: new Date('2023-10-10T00:00:00.000Z'),
                stringAttr1: 'test_value_2',
                stringAttr2: 'test_attr_2',
            },
            {
                partitionKey: 'findMany#test#10',
                sortKey: 'findMany#test#10#02',
                dateAttr: new Date('2023-10-10T00:00:00.000Z'),
                stringAttr1: 'test_value_2',
                stringAttr2: 'test_attr_2',
            },
            {
                partitionKey: 'findMany#test#10',
                sortKey: 'findMany#test#10#03',
                dateAttr: new Date('2023-10-10T00:00:00.000Z'),
                stringAttr1: 'test_value_2',
                stringAttr2: 'test_attr_2',
            },
        ];

        for (const expectedItem of expectedItems) {
            expect(item.items).toContainEqual(expectedItem);
        }
    });

    test('pK - static sK - in', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error', 'log'],
        });

        await client.findone1.create({
            partitionKey: 'findOne#in#test#01',
            sortKey: 'static_key',
            stringAttr1: 'test_attr_in_1',
            stringAttr2: 'test_attr_2',
            dateAttr: new Date('2023-10-10T00:00:00.000Z'),
        });

        await client.findone1.create({
            partitionKey: 'findOne#in#test#02',
            sortKey: 'static_key',
            stringAttr1: 'test_attr_in_2',
            stringAttr2: 'test_attr_2',
            dateAttr: new Date('2023-10-10T00:00:00.000Z'),
        });

        await client.findone1.create({
            partitionKey: 'findOne#in#test#03',
            sortKey: 'static_key',
            stringAttr1: 'test_attr_not_in_1',
            stringAttr2: 'test_attr_2',
            dateAttr: new Date('2023-10-10T00:00:00.000Z'),
        });

        const results = await client.findone1.findMany({
            where: {
                stringAttr1: {
                    in: ['test_attr_in_1', 'test_attr_in_2'],
                },
            },
        });

        console.log(results);

        expect(results.count).toBe(2);
    });
});
