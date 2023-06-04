import { DatabaseType } from '../types/DatabaseType'

export const printLiteral = (value: DatabaseType): string => {
    switch (typeof value) {
        case 'number':
            return value.toString()
        case 'string':
            return `"${value}"`
        case 'boolean':
            return value.toString()
        case 'object':
            if (value instanceof Date) {
                return `"${value.toISOString()}"`
            } else if (Array.isArray(value)) {
                return `[${value.map((v) => printLiteral(v)).join(', ')}]`
            } else {
                return `{${Object.keys(value)
                    .map((key) => `"${key}": ${printLiteral(value[key])}`)
                    .join(', ')}}`
            }
        default:
            throw new Error(`Unknown type ${typeof value}`)
    }
}
