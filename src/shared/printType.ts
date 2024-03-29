import { AttributeType } from '../enums/AttributeType';
import { PrintMode } from '../enums/PrintMode';
import { IAttribute } from '../interfaces/IAttribute';

export const printType = (attribute: IAttribute, mode: PrintMode) => {
    switch (attribute.type) {
        case AttributeType.NUMBER:
            return 'number';
        case AttributeType.STRING:
            return 'string';
        case AttributeType.BOOLEAN:
            return 'boolean';
        case AttributeType.DATE:
            return 'Date';
        case AttributeType.LIST:
            return `any[]`;
        case AttributeType.STRING_LIST:
            return 'string[]';
        case AttributeType.NUMBER_LIST:
            return 'number[]';
        case AttributeType.BOOLEAN_LIST:
            return 'boolean[]';
        case AttributeType.DATE_LIST:
            return 'Date[]';
        case AttributeType.MAP_LIST:
            return `{\n${printObject(attribute.properties, mode)}}[]`;
        case AttributeType.STRING_SET:
            return 'Set<string>';
        case AttributeType.NUMBER_SET:
            return 'Set<number>';
        case AttributeType.MAP:
            return `{\n${printObject(attribute.properties, mode)}}`;
    }
};

export const printObject = (attr: { [key: string]: IAttribute }, mode: PrintMode) => {
    let item = '';
    for (const key of Object.keys(attr)) {
        const attribute = attr[key];
        let keyItem = '';

        if (attribute.staticValue !== undefined) {
            continue;
        }

        switch (mode) {
            case PrintMode.FULL:
                keyItem += `${key}${attribute.nullable ? '?' : ''}: ${printType(attribute, mode)};\n`;
                break;
            case PrintMode.DEFAULT:
                keyItem += `${key}${attribute.nullable || attribute.defaultValue || attribute.generator ? '?' : ''}: ${printType(attribute, mode)};\n`;
                break;
            case PrintMode.PARTIAL:
                keyItem += `${key}?: ${printType(attribute, mode)};\n`;
                break;
        }

        item += keyItem;
    }

    return item;
};
