#!/usr/bin/env node

import * as commander from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { shared_d_ts, shared_js } from './generators/SharedGenerator'
import { ClientGenerator } from './generators/ClientGenerator'
import { EntityDeclarationGenerator } from './generators/EntityDeclarationGenerator'
import { writeFile } from './shared/writeFile'
import { EntityGenerator } from './generators/EntityGenerator'
import { logger_d_ts, logger_js } from './generators/LoggerGenerator'

const VERSION = '1.1.0'

const program = new commander.Command()
program.version(VERSION).description('Dynormo CLI')

program
    .command('generate')
    .description('Generate type and function definition from the schema')
    .option('-c, --config <config>', 'Config file')
    .action(async (_str, options) => {
        console.log(`> dynormo v${VERSION}\n`);

        const configPath = options.config ? options.config : './dynormo.config.json'
        let config;
        try {
            config = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'))
            console.log(`Found config file at ${configPath}\n`)
        } catch (error) {
            console.log(`Error: No config file found at ${configPath}`)
            return
        }

        const outputDir = path.resolve('node_modules/.dynormo')

        writeFile(path.join(outputDir, 'shared.js'), shared_js)
        writeFile(path.join(outputDir, 'shared.d.ts'), shared_d_ts)
        writeFile(path.join(outputDir, 'Logger.js'), logger_js)
        writeFile(path.join(outputDir, 'Logger.d.ts'), logger_d_ts)

        const entityNames = []
        const tableNamesMap: { [key: string]: string } = {}
        for (const file of config.entities) {
            const definition = JSON.parse(fs.readFileSync(file, 'utf-8'))
            const entity = new EntityGenerator(definition.name, definition.attributes)

            const entityDeclerations = new EntityDeclarationGenerator({
                name: definition.name,
                attributes: definition.attributes,
                entities: {
                    generate: config?.options?.generate ?? 'types',
                },
            })

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

            console.log(`Generated ${definition.name} entity`)
        }

        writeFile(path.join(outputDir, 'DynormoClient.js'), ClientGenerator.generate(entityNames, tableNamesMap))
        writeFile(path.join(outputDir, 'DynormoClient.d.ts'), ClientGenerator.generateDeclarations(entityNames))

        const indexFile = path.join(outputDir, 'index.js')
        writeFile(
            indexFile,
            `Object.defineProperty(exports, "__esModule", { value: true });
const { DynormoClient } = require("./DynormoClient");
const { Logger } = require("./Logger");

exports.Logger = Logger;
exports.DynormoClient = DynormoClient;`
        )

        const indexFileDeclerations = path.join(outputDir, 'index.d.ts')
        writeFile(
            indexFileDeclerations,
            `${entityNames.map((name) => `export * from "./${name}";`).join('\n')}
export { DynormoClient } from "./DynormoClient";
export { Logger } from "./Logger";`
        )

        const packageJson = path.join(outputDir, 'package.json')
        writeFile(packageJson, JSON.stringify({ name: '.dynormo', main: './index.js', types: './index.d.ts' }, null, 2))

        console.log(`\nSuccessfully generated ${entityNames.length} entities in ${outputDir}`)
    })

program
    .command('init')
    .description('Create a new dynormo.config.json file')
    .action(async () => {
        const configPath = './dynormo.config.json'
        if (fs.existsSync(configPath)) {
            console.log(`Error: Config file already exists at ${configPath}`)
            return
        }

        const config = {
            entities: [],
            options: {
                generate: 'types',
            },
        }

        writeFile(configPath, JSON.stringify(config, null, 2))

        console.log(`Successfully created config file at ${configPath}`)
    })

program.parse(process.argv)
