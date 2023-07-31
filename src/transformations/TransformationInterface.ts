import { Transformation } from './Transformation'

export interface TransformationInterface<T> {
    transform(): Promise<Transformation<T>>
    rollback(): Promise<Transformation<T>>
    backup(name: string): Promise<void>
}
