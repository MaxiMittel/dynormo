#!/usr/bin/env node

import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { shared_d_ts, shared_js } from './generators/SharedGenerator';
import { ClientGenerator } from './generators/ClientGenerator';
import { EntityDeclarationGenerator } from './generators/EntityDeclarationGenerator';
import { writeFile } from './shared/writeFile';
import { EntityGenerator } from './generators/EntityGenerator';
import { logger_d_ts, logger_js } from './generators/LoggerGenerator';
import { TransformationInterface } from './transformations/TransformationInterface';
import { Transformation } from './transformations/Transformation';
import { spawnSync } from 'child_process';
const prompts = require('prompts');

const VERSION = '1.1.0';

const program = new commander.Command();
program.version(VERSION).description('Dynormo CLI');

program
    .command('generate')
    .description('Generate type and function definition from the schema')
    .option('-c, --config <config>', 'Config file')
    .action(async (_str, options) => {
        console.log(`> dynormo v${VERSION}\n`);

        const configPath = options.config ? options.config : './dynormo.config.json';
        let config;
        try {
            config = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'));
            console.log(`Found config file at ${configPath}\n`);
        } catch (error) {
            console.log(`Error: No config file found at ${configPath}`);
            return;
        }

        const outputDir = path.resolve('node_modules/.dynormo');

        writeFile(path.join(outputDir, 'shared.js'), shared_js);
        writeFile(path.join(outputDir, 'shared.d.ts'), shared_d_ts);
        writeFile(path.join(outputDir, 'Logger.js'), logger_js);
        writeFile(path.join(outputDir, 'Logger.d.ts'), logger_d_ts);

        const entityNames = [];
        const tableNamesMap: { [key: string]: string } = {};
        for (const file of config.entities) {
            const definition = JSON.parse(fs.readFileSync(file, 'utf-8'));
            const entity = new EntityGenerator(definition.name, definition.attributes);

            const entityDeclerations = new EntityDeclarationGenerator({
                name: definition.name,
                attributes: definition.attributes,
                indexes: definition.indexes,
            });

            const filePath = path.join(outputDir, definition.name + '.js');
            const filePathDeclerations = path.join(outputDir, definition.name + '.d.ts');

            entityNames.push(definition.name);
            tableNamesMap[definition.name.toLowerCase()] = definition.table;

            const dirname = path.dirname(filePath);
            if (!fs.existsSync(dirname)) {
                fs.mkdirSync(dirname, { recursive: true });
            }

            writeFile(filePath, await entity.generate());
            writeFile(filePathDeclerations, await entityDeclerations.generate());

            console.log(`Generated ${definition.name} entity`);
        }

        writeFile(path.join(outputDir, 'DynormoClient.js'), await ClientGenerator.generate(entityNames, tableNamesMap));
        writeFile(path.join(outputDir, 'DynormoClient.d.ts'), await ClientGenerator.generateDeclarations(entityNames));

        const indexFile = path.join(outputDir, 'index.js');
        writeFile(
            indexFile,
            `Object.defineProperty(exports, "__esModule", { value: true });
const { DynormoClient } = require("./DynormoClient");
const { Logger } = require("./Logger");

exports.Logger = Logger;
exports.DynormoClient = DynormoClient;`,
        );

        const indexFileDeclerations = path.join(outputDir, 'index.d.ts');
        writeFile(
            indexFileDeclerations,
            `${entityNames.map((name) => `export * from "./${name}";`).join('\n')}
export { DynormoClient } from "./DynormoClient";
export { Logger } from "./Logger";`,
        );

        const packageJson = path.join(outputDir, 'package.json');
        writeFile(packageJson, JSON.stringify({ name: '.dynormo', main: './index.js', types: './index.d.ts' }, null, 2));

        console.log(`\nSuccessfully generated ${entityNames.length} entities in ${outputDir}`);
    });

program
    .command('init')
    .description('Create a new dynormo.config.json file')
    .action(async () => {
        const configPath = './dynormo.config.json';
        if (fs.existsSync(configPath)) {
            console.log(`Error: Config file already exists at ${configPath}`);
            return;
        }

        const config = {
            entities: [],
            options: {
                generate: 'types',
            },
        };

        writeFile(configPath, JSON.stringify(config, null, 2));

        console.log(`Successfully created config file at ${configPath}`);
    });

program
    .command('create-transformation <name>')
    .description('Create a new transformation file')
    .action(async (name: string) => {
        const configPath = './dynormo.config.json';
        if (!fs.existsSync(configPath)) {
            console.log(`Error: No config file found at ${configPath}`);
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const transformationsPath = config.transformations ?? './transformations';

        const transformationPath = path.join(transformationsPath, name + '.ts');

        if (fs.existsSync(transformationPath)) {
            console.log(`Error: Transformation file already exists at ${transformationPath}`);
            return;
        }

        let className = name[0].toUpperCase() + name.slice(1) + 'Transformation';

        const transformation = `import { Transformation, TransformationInterface } from 'dynormo'
import { DynormoClient } from '.dynormo'

// TODO: Add the entity types affected in this transformation here (e.g. Entity1 | Entity2)
type ItemTypes = any; 

class ${className} implements TransformationInterface<ItemTypes> {
    table = '<<TABLE_NAME>>';
    client = new DynormoClient({}).rawClient; // TODO: Add your DynamoDBClient here

    public async transform(): Promise<Transformation<ItemTypes>> {
        return new Transformation<ItemTypes>(this.table, this.client);
        // TODO: Add transformation here
        // e.g. .addAttribute('newAttribute', (item: ItemTypes) => {
        //          return 'string'
        //      })
    }

    public async rollback(): Promise<Transformation<ItemTypes>> {
        return new Transformation<ItemTypes>(this.table, this.client);
        // TODO: Add transformation that revert the changes made in transform() here
        // e.g. .removeAttribute('newAttribute')
    }

    public async backup(name: string): Promise<void> {
        new Transformation<ItemTypes>(this.table, this.client).backup(name);
    }
}

export default ${className};`;

        writeFile(transformationPath, transformation);

        console.log(`Successfully created transformation file at ${transformationPath}`);
    });

program
    .command('run-transformation <name>')
    .description('Run a transformation')
    .action(async (name: string) => {
        const configPath = './dynormo.config.json';
        if (!fs.existsSync(configPath)) {
            console.log(`Error: No config file found at ${configPath}`);
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const transformationsPath = config.transformations ?? './transformations';

        const transformationPath = path.join(transformationsPath, name + '.ts');

        if (!fs.existsSync(transformationPath)) {
            console.log(`Error: Transformation file not found at ${transformationPath}`);
            return;
        }

        const tsc = spawnSync('tsc', [transformationPath]);
        if (tsc.status !== 0) {
            console.log(`Error: Failed to compile transformation ${name}. See error below:`);
            console.log(tsc.stdout.toString());
            return;
        }

        const compiledTransformationPath = transformationPath.replace('.ts', '.js');

        const TransformationClass = require(path.resolve(compiledTransformationPath)).default;
        const transformation = new TransformationClass();

        const backup = await prompts({
            type: 'toggle',
            name: 'value',
            message: 'Do you want to perform a backup before running the transformation?',
            initial: true,
            active: 'yes',
            inactive: 'no',
        });

        if (backup.value) {
            const backupName = await prompts({
                type: 'text',
                name: 'value',
                message: 'Enter a name for the backup',
                initial: 'backup-' + Date.now(),
            });

            await transformation.backup(backupName.value);
        }

        console.log(`Running transformation ${name}...`);

        await transformation.transform();

        fs.unlinkSync(compiledTransformationPath);
        console.log(`Successfully ran transformation ${name}`);
    });

program
    .command('rollback-transformation <name>')
    .description('Rollback a transformation')
    .action(async (name: string) => {
        const configPath = './dynormo.config.json';
        if (!fs.existsSync(configPath)) {
            console.log(`Error: No config file found at ${configPath}`);
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const transformationsPath = config.transformations ?? './transformations';

        const transformationPath = path.join(transformationsPath, name + '.ts');

        if (!fs.existsSync(transformationPath)) {
            console.log(`Error: Transformation file not found at ${transformationPath}`);
            return;
        }

        const tsc = spawnSync('tsc', [transformationPath]);
        if (tsc.status !== 0) {
            console.log(`Error: Failed to compile transformation ${name}. See error below:`);
            console.log(tsc.stdout.toString());
            return;
        }

        const compiledTransformationPath = transformationPath.replace('.ts', '.js');

        const TransformationClass = require(path.resolve(compiledTransformationPath)).default;
        const transformation = new TransformationClass();

        const backup = await prompts({
            type: 'toggle',
            name: 'value',
            message: 'Do you want to perform a backup before rolling back the transformation?',
            initial: true,
            active: 'yes',
            inactive: 'no',
        });

        if (backup.value) {
            const backupName = await prompts({
                type: 'text',
                name: 'value',
                message: 'Enter a name for the backup',
                initial: 'backup-' + Date.now(),
            });

            await transformation.backup(backupName.value);
        }

        console.log(`Running transformation ${name}...`);
        await transformation.rollback();

        fs.unlinkSync(compiledTransformationPath);
        console.log(`Successfully ran transformation ${name}`);
    });

program
    .command('preview-transformation <name>')
    .description('Preview a transformation')
    .action(async (name: string) => {
        const configPath = './dynormo.config.json';
        if (!fs.existsSync(configPath)) {
            console.log(`Error: No config file found at ${configPath}`);
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const transformationsPath = config.transformations ?? './transformations';

        const transformationPath = path.join(transformationsPath, name + '.ts');

        if (!fs.existsSync(transformationPath)) {
            console.log(`Error: Transformation file not found at ${transformationPath}`);
            return;
        }

        const tsc = spawnSync('tsc', [transformationPath]);
        if (tsc.status !== 0) {
            console.log(`Error: Failed to compile transformation ${name}. See error below:`);
            console.log(tsc.stdout.toString());
            return;
        }

        const compiledTransformationPath = transformationPath.replace('.ts', '.js');

        const previewPath = await prompts({
            type: 'text',
            name: 'value',
            message: 'Enter a path for the preview file',
            initial: './preview.json',
        });

        const TransformationClass = require(path.resolve(compiledTransformationPath)).default;
        const transformation = new TransformationClass();

        console.log(`Previewing transformation ${name}...`);
        await transformation.preview(previewPath.value);

        fs.unlinkSync(compiledTransformationPath);
        console.log(`Successfully previewed transformation ${name}`);
    });

program.parse(process.argv);

export { TransformationInterface, Transformation };
