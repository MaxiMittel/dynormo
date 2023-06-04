#!/usr/bin/env node

import * as commander from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { shared_d_ts, shared_js } from './generators/SharedGenerator'
import { ClientGenerator } from './generators/ClientGenerator'
import { EntityDeclarationGenerator } from './generators/EntityDeclarationGenerator'
import { writeFile } from './shared/writeFile'
import { EntityGenerator } from './generators/EntityGenerator'

const program = new commander.Command()
program.version('1.0.0').description('DynamoDB ORM')

program
    .command('generate')
    .description('Generate type and function definition from the schema')
    .option('-c, --config <config>', 'Config file')
    .action(async (_str, options) => {
        const configPath = options.config ? options.config : './dynormo.config.json'
        const config = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'))

        const outputDir = path.resolve('node_modules/.dynormo')

        writeFile(path.join(outputDir, 'shared.js'), shared_js)
        writeFile(path.join(outputDir, 'shared.d.ts'), shared_d_ts)

        const entityNames = []
        const tableNamesMap: { [key: string]: string } = {}
        for (const file of config.entities) {
            const definition = JSON.parse(fs.readFileSync(file, 'utf-8'))
            const entity = new EntityGenerator(definition.name, definition.attributes)

            const entityDeclerations = new EntityDeclarationGenerator(definition.name, definition.attributes)

            const filePath = path.join(outputDir, definition.name + '.js')
            const filePathDeclerations = path.join(outputDir, definition.name + '.d.ts')

            entityNames.push(definition.name)
            tableNamesMap[definition.name.toLowerCase()] = definition.table

            const dirname = path.dirname(filePath)
            if (!fs.existsSync(dirname)) {
                fs.mkdirSync(dirname, { recursive: true })
            }

            writeFile(filePath, entity.generate())
            writeFile(filePathDeclerations, entityDeclerations.generate())
        }

        writeFile(path.join(outputDir, 'DynormoClient.js'), ClientGenerator.generate(entityNames, tableNamesMap))
        writeFile(path.join(outputDir, 'DynormoClient.d.ts'), ClientGenerator.generateDeclarations(entityNames))

        const indexFile = path.join(outputDir, 'index.js')
        writeFile(indexFile, `Object.defineProperty(exports, "__esModule", { value: true });
import { DynormoClient } from "./DynormoClient";
exports.DynormoClient = DynormoClient;`)

        const indexFileDeclerations = path.join(outputDir, 'index.d.ts')
        writeFile(indexFileDeclerations, `${entityNames.map((name) => `export * from "./${name}";`).join('\n')}
export { DynormoClient } from "./DynormoClient";`)

        const packageJson = path.join(outputDir, 'package.json')
        writeFile(packageJson, JSON.stringify({ name: '.dynormo', main: './index.js', types: './index.d.ts' }, null, 2))
    })

program.parse(process.argv)
