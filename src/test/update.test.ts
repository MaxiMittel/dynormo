// @ts-nocheck
import { DynormoClient } from '.dynormo';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { expect, test, describe } from '@jest/globals';

describe('update', () => {
    test('pK - static sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

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
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const date = new Date();

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
        expect(updatedItem.stringAttr2).toBe('test_value_2_update');
        expect(retrievedItem.dateAttr).toStrictEqual(date);

        await client.findone2.delete(item.partitionKey);
    });

    test('pK - sK', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
            logger: ['error'],
        });

        const date = new Date();

        const item = await client.findone3.create({
            partitionKey: 'test_id_update_pk_sk',
            sortKey: 'test_sort_key',
            stringAttr1: 'test_value_1_update',
            stringAttr2: 'test_value_2_update',
            dateAttr: date,
        });

        const newDate = new Date();

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
