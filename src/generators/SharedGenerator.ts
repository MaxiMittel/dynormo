export const shared_js = `const { randomUUID } = require('crypto');
const { marshall } = require('@aws-sdk/util-dynamodb');

function parseFilterExpression(filter) {
    const generateExpression = (filter, type, prefix) => {
        let FilterExpressionItems = []
        let ExpressionAttributeValues = {}
        let ExpressionAttributeNames = {}

        const keys = Object.keys(filter)
        keys.forEach((key, index) => {
            const value = filter[key]
            if (key === 'OR' || key === 'AND' || key === 'NOT') {
                if (Array.isArray(value)) {
                    const expr = generateExpression(value, key, \`\${prefix}\${key}_\${index}_\`)
                    if (key === 'NOT') {
                        FilterExpressionItems.push(\`NOT \${expr.FilterExpression}\`)
                    } else {
                        FilterExpressionItems.push(expr.FilterExpression)
                    }
                    ExpressionAttributeValues = { ...ExpressionAttributeValues, ...expr.ExpressionAttributeValues }
                    ExpressionAttributeNames = { ...ExpressionAttributeNames, ...expr.ExpressionAttributeNames }
                }
            } else {
                if (typeof value === 'object') {
                    const item = value
                    const itemKeys = Object.keys(item)
                    itemKeys.forEach((itemKey, itemIndex) => {
                        if (!item[itemKey]) return
                        if (itemKey === 'beginsWith') {
                            FilterExpressionItems.push(\`begins_with(#\${prefix}\${key}, :\${prefix}\${key})\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey], { removeUndefinedValues: true })
                        } else if (itemKey === 'eq') {
                            FilterExpressionItems.push(\`#\${prefix}\${key} = :\${prefix}\${key}\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey], { removeUndefinedValues: true })
                        } else if (itemKey === 'g') {
                            FilterExpressionItems.push(\`#\${prefix}\${key} > :\${prefix}\${key}\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey], { removeUndefinedValues: true })
                        } else if (itemKey === 'ge') {
                            FilterExpressionItems.push(\`#\${prefix}\${key} >= :\${prefix}\${key}\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey], { removeUndefinedValues: true })
                        } else if (itemKey === 'l') {
                            FilterExpressionItems.push(\`#\${prefix}\${key} < :\${prefix}\${key}\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey], { removeUndefinedValues: true })
                        } else if (itemKey === 'le') {
                            FilterExpressionItems.push(\`#\${prefix}\${key} <= :\${prefix}\${key}\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey], { removeUndefinedValues: true })
                        } else if (itemKey === 'between') {
                            if (!Array.isArray(item[itemKey])) return
                            FilterExpressionItems.push(\`#\${prefix}\${key} BETWEEN :\${prefix}\${key}0 AND :\${prefix}\${key}1\`)
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key
                            if (item[itemKey] && item[itemKey].length === 2) {
                                ExpressionAttributeValues[\`:\${prefix}\${key}0\`] = marshall(item[itemKey][0], { removeUndefinedValues: true })
                                ExpressionAttributeValues[\`:\${prefix}\${key}1\`] = marshall(item[itemKey][1], { removeUndefinedValues: true })
                            }
                        }
                    })
                } else {
                    if (!value) return
                    const keyName = \`\${prefix}\${key}\`
                    ExpressionAttributeNames[\`#\${keyName}\`] = key
                    ExpressionAttributeValues[\`:\${keyName}\`] = marshall(value, { removeUndefinedValues: true })
                    FilterExpressionItems.push(\`#\${keyName} = :\${keyName}\`)
                }
            }
        })

        return {
            FilterExpression: FilterExpressionItems.length? '(' + FilterExpressionItems.join(\` \${type} \`) + ')' : '',
            ExpressionAttributeValues,
            ExpressionAttributeNames,
        }
    }

    return generateExpression(filter, 'AND', '')
}
 
function uuid() {
    return randomUUID();
}

module.exports = { parseFilterExpression, uuid };
`

export const shared_d_ts = `export type FilterExpression<T> = {
    beginsWith?: T;
    eq?: T;
    g?: T;
    ge?: T;
    l?: T;
    le?: T;
    between?: [T, T];
};
export declare function parseFilterExpression<T extends {
    [key: string]: any;
}>(filter: T): {
    FilterExpression: string;
    ExpressionAttributeValues: any;
    ExpressionAttributeNames: any;
};

export declare function uuid(): string;

export enum ItemEvent {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE'
}
`
