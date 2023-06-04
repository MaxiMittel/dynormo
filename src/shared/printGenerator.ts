import { GeneratorType } from '../enums/GeneratorType'

export const printGenerator = (generator: GeneratorType): string => {
    switch (generator) {
        case GeneratorType.UUID:
            return 'uuid()'
        case GeneratorType.NOW:
            return 'new Date().toISOString()'
        default:
            return generator
    }
}
