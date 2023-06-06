import { DynormoClient } from '.dynormo'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { expect, test, describe } from '@jest/globals'

describe('findOne', () => {
    test('pK - static sK - exists', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const user = await client.user.findOne('findOne#test#01')

        expect(user).toStrictEqual({
            partitionKey: 'findOne#test#01',
            sortKey: 'user',
            email: 'test@mail.com',
            password: 'test',
            createdAt: '2023-10-10T00:00:00.000Z',
        })
    })

    test('pK - static sK - null', async () => {
        const client = new DynormoClient({
            client: new DynamoDBClient({
                region: 'eu-central-1',
            }),
        })

        const user = await client.user.findOne('findOne#test#not-exists')

        expect(user).toBeNull()
    })
})
