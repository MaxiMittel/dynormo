import * as fs from 'fs'
import * as path from 'path'

/**
 * Writes content to a file at the specified filePath.
 * If the directory of the filePath does not exist, it will be created recursively.
 * @param {string} filePath - The path to the file where the content will be written.
 * @param {string} content - The content to be written to the file.
 */
export const writeFile = (filePath: string, content: string) => {
    const dirname = path.dirname(filePath)
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true })
    }

    fs.writeFileSync(filePath, content)
}
