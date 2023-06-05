import { AttributeType } from '../enums/AttributeType'
import { GeneratorType } from '../enums/GeneratorType'
import { DatabaseType } from '../types/DatabaseType'
import { IRelation } from './IRelation'

export interface IAttribute {
    type: AttributeType
    staticValue?: DatabaseType
    defaultValue?: DatabaseType
    properties?: { [key: string]: IAttribute }
    generator?: GeneratorType
    partitionKey?: boolean
    sortKey?: boolean
    nullable?: boolean
    as?: string
    relations?: IRelation[]
}
