export const shared_js = `import { randomUUID } from 'crypto';
import { marshall } from '@aws-sdk/util-dynamodb';
export function parseFilterExpression(filter) {
    let FilterExpression = '';
    let ExpressionAttributeValues = {};
    let ExpressionAttributeNames = {};
    const generateExpression = (filter, prefix = '') => {
        const keys = Object.keys(filter);
        keys.forEach((key, index) => {
            if (index !== 0) {
                FilterExpression += ' AND ';
            }
            const value = filter[key];
            if (key === 'OR' || key === 'AND' || key === 'NOT') {
                FilterExpression += '(';
                if (key === 'NOT') {
                    FilterExpression += 'NOT ';
                }
                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        generateExpression(item, \`\${prefix}\${key}\${index}\`);
                        if (index !== value.length - 1) {
                            switch (key) {
                                case 'OR':
                                    FilterExpression += ' OR ';
                                    break;
                                case 'AND':
                                    FilterExpression += ' AND ';
                                    break;
                                case 'NOT':
                                    FilterExpression += ' AND NOT ';
                                    break;
                            }
                        }
                    });
                }
                if (index === keys.length - 1) {
                    FilterExpression += ')';
                }
            }
            else {
                if (index !== 0) {
                    FilterExpression += ' AND ';
                }
                if (typeof value === 'object') {
                    const item = value;
                    const itemKeys = Object.keys(item);
                    itemKeys.forEach((itemKey, index) => {
                        if (index !== 0) {
                            FilterExpression += ' AND ';
                        }
                        if (itemKey === 'beginsWidth') {
                            FilterExpression += \`begins_with(#\${prefix}\${key}, :\${prefix}\${key})\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'eq') {
                            FilterExpression += \`#\${prefix}\${key} = :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'g') {
                            FilterExpression += \`#\${prefix}\${key} > :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'ge') {
                            FilterExpression += \`#\${prefix}\${key} >= :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'l') {
                            FilterExpression += \`#\${prefix}\${key} < :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'le') {
                            FilterExpression += \`#\${prefix}\${key} <= :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'between') {
                            FilterExpression += \`#\${prefix}\${key} BETWEEN :\${prefix}\${key}0 AND :\${prefix}\${key}1\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            if (item[itemKey] && item[itemKey].length === 2) {
                                ExpressionAttributeValues[\`:\${prefix}\${key}0\`] = marshall(item[itemKey][0]);
                                ExpressionAttributeValues[\`:\${prefix}\${key}1\`] = marshall(item[itemKey][1]);
                            }
                        }
                    });
                }
                else {
                    FilterExpression += \`#\${prefix}\${key} = :\${prefix}\${key}\`;
                    ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                    ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(value);
                }
            }
        });
    };
    generateExpression(filter);
    return {
        FilterExpression,
        ExpressionAttributeValues,
        ExpressionAttributeNames,
    };
}
export function parseKeyConditionExpression(keyCondition) {
    let KeyConditionExpression = '';
    let ExpressionAttributeValues = {};
    let ExpressionAttributeNames = {};
    const generateExpression = (keyCondition, prefix = '') => {
        const keys = Object.keys(keyCondition);
        keys.forEach((key, index) => {
            if (index !== 0) {
                KeyConditionExpression += ' AND ';
            }
            const value = keyCondition[key];
            if (key === 'OR' || key === 'AND' || key === 'NOT') {
                KeyConditionExpression += '(';
                if (key === 'NOT') {
                    KeyConditionExpression += 'NOT ';
                }
                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        generateExpression(item, \`\${prefix}\${key}\${index}\`);
                        if (index !== value.length - 1) {
                            switch (key) {
                                case 'OR':
                                    KeyConditionExpression += ' OR ';
                                    break;
                                case 'AND':
                                    KeyConditionExpression += ' AND ';
                                    break;
                                case 'NOT':
                                    KeyConditionExpression += ' AND NOT ';
                                    break;
                            }
                        }
                    });
                }
                if (index === keys.length - 1) {
                    KeyConditionExpression += ')';
                }
            }
            else {
                if (index !== 0) {
                    KeyConditionExpression += ' AND ';
                }
                if (typeof value === 'object') {
                    const item = value;
                    const itemKeys = Object.keys(item);
                    itemKeys.forEach((itemKey, index) => {
                        if (index !== 0) {
                            KeyConditionExpression += ' AND ';
                        }
                        if (itemKey === 'beginsWidth') {
                            KeyConditionExpression += \`begins_with(#\${prefix}\${key}, :\${prefix}\${key})\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'eq') {
                            KeyConditionExpression += \`#\${prefix}\${key} = :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'g') {
                            KeyConditionExpression += \`#\${prefix}\${key} > :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'ge') {
                            KeyConditionExpression += \`#\${prefix}\${key} >= :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'l') {
                            KeyConditionExpression += \`#\${prefix}\${key} < :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'le') {
                            KeyConditionExpression += \`#\${prefix}\${key} <= :\${prefix}\${key}\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(item[itemKey]);
                        }
                        else if (itemKey === 'between') {
                            KeyConditionExpression += \`#\${prefix}\${key} BETWEEN :\${prefix}\${key}0 AND :\${prefix}\${key}1\`;
                            ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                            if (item[itemKey] && item[itemKey].length === 2) {
                                ExpressionAttributeValues[\`:\${prefix}\${key}0\`] = marshall(item[itemKey][0]);
                                ExpressionAttributeValues[\`:\${prefix}\${key}1\`] = marshall(item[itemKey][1]);
                            }
                        }
                    });
                }
                else {
                    KeyConditionExpression += \`#\${prefix}\${key} = :\${prefix}\${key}\`;
                    ExpressionAttributeNames[\`#\${prefix}\${key}\`] = key;
                    ExpressionAttributeValues[\`:\${prefix}\${key}\`] = marshall(value);
                }
            }
        });
    };
    generateExpression(keyCondition);
    return {
        KeyConditionExpression,
        ExpressionAttributeValues,
        ExpressionAttributeNames,
    };
}
export function uuid() {
    return randomUUID();
}
export function logQuery(type, entity, func, params) {
    console.log(\`[\${type}] [\${entity} - \${func}] \${JSON.stringify(params)}\`);
}
export function logError(type, entity, func, params, error) {
    console.error(\`[\${type}] [\${entity} - \${func}] \${JSON.stringify(params)} - \${JSON.stringify(error)}\`);
}
`;

export const shared_d_ts = `export type FilterExpression<T> = {
    beginsWidth?: T;
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
export declare function parseKeyConditionExpression<T extends {
    [key: string]: any;
}>(keyCondition: T): {
    KeyConditionExpression: string;
    ExpressionAttributeValues: any;
    ExpressionAttributeNames: any;
};
export declare function uuid(): string;
export declare function logQuery(type: string, entity: string, func: string, params: any): void;
export declare function logError(type: string, entity: string, func: string, params: any, error: any): void;
`;