// @ts-nocheck
import { expect, test, describe } from '@jest/globals'
import { parseFilterExpression } from '../../node_modules/.dynormo/shared'

describe('parseFilterExpression', () => {
    test('single statement', () => {
        const result = parseFilterExpression({ a: 'test' })
        expect(result).toStrictEqual({
            FilterExpression: '(#a = :a)',
            ExpressionAttributeNames: { '#a': 'a' },
            ExpressionAttributeValues: { ':a': { S: 'test' } }
        })
    })

    test('multiple statements', () => {
        const result = parseFilterExpression({ a: 'test', b: 'test' })
        expect(result).toStrictEqual({
            FilterExpression: '(#a = :a AND #b = :b)',
            ExpressionAttributeNames: { '#a': 'a', '#b': 'b' },
            ExpressionAttributeValues: { ':a': { S: 'test' }, ':b': { S: 'test' } }
        })
    })

    test('beginsWith', () => {
        const result = parseFilterExpression({ a: { beginsWith: 'test' } })
        expect(result).toStrictEqual({
            FilterExpression: '(begins_with(#a, :a))',
            ExpressionAttributeNames: { '#a': 'a' },
            ExpressionAttributeValues: { ':a': { S: 'test' } }
        })
    })

    test('between', () => {
        const result = parseFilterExpression({ a: { between: ['test', 'test'] } })
        expect(result).toStrictEqual({
            FilterExpression: '(#a BETWEEN :a0 AND :a1)',
            ExpressionAttributeNames: { '#a': 'a' },
            ExpressionAttributeValues: { ':a0': { S: 'test' }, ':a1': { S: 'test' } }
        })
    });

    test('eq', () => {
        const result = parseFilterExpression({ a: { eq: 'test' } })
        expect(result).toStrictEqual({
            FilterExpression: '(#a = :a)',
            ExpressionAttributeNames: { '#a': 'a' },
            ExpressionAttributeValues: { ':a': { S: 'test' } }
        })
    })

    test('ge', () => {
        const result = parseFilterExpression({ a: { ge: 5 } })
        expect(result).toStrictEqual({
            FilterExpression: '(#a >= :a)',
            ExpressionAttributeNames: { '#a': 'a' },
            ExpressionAttributeValues: { ':a': { N: "5" } }
        })
    })
})
