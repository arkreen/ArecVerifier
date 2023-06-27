import pkg from 'log4js';
import path from "path";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const filePath=path.join(__dirname,'./report/report.log');
const options ={
    appenders: {
        fileout: {
            type: "dateFile",
            filename: filePath,
            layout: {
                type: 'messagePassThrough',
            },
            keepFileExt:true,
            numBackups: 7
        },
        console: {
            type: "console",
            layout: {
                type: 'messagePassThrough',
            }
        }
    },
    categories: {
        default: {
            appenders: ["fileout","console"],
            level: "info"
        }
    }
}
pkg.configure(options)

const logger = pkg.getLogger("out")

export default logger

