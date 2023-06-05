import { RelationType } from '../enums/RelationType'
import { IAttribute } from './IAttribute'

export interface IRelation {
    type: RelationType
}

export interface IDeleteRelation extends IRelation {
    type: RelationType.DELETE
    entity: string
    attribute: string
    key: { [key: string]: string }
}

export interface IUpdateRelation extends IRelation {
    type: RelationType.UPDATE
    entity: string
    attribute: string
    expression: string
    key: { [key: string]: string }
}

export interface ICreateRelation extends IRelation {
    type: RelationType.CREATE
    entity: string
    attributes: { [key: string]: IAttribute }
    key: { [key: string]: string }
}
