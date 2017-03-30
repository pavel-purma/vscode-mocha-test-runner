import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { config } from './config';

export function trimArray<T>(array: T[]): T[] {
    return array.reduce((trimmed, item) => {
        item && trimmed.push(item);
        return trimmed;
    }, []);
}

export function access(path: string) {
    return new Promise<string>((resolve, reject) => {
        fs.access(path, err => {
            if (err) {
                reject(err);
            }
            resolve(path);
        })
    })
}

export function dedupeStrings(array: string[]): string[] {
    const keys = {};
    array.forEach(key => keys[key] = 0);
    return Object.keys(keys);
}

export function loadJson<T>(file: string) {
    return new Promise<T>((resolve, reject) => {
        fs.exists(file, exists => {
            if (!exists) {
                reject();
            }

            fs.readFile(file, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                }

                try {
                    const json: T = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            });
        });
    });
}

function nodeJSPath() {
    return new Promise<string>((resolve, reject) => {
        const paths = process.env.path.split(process.platform === 'win32' ? ';' : ':');

        const searchPaths = [].concat(
            paths.map(p => path.resolve(p, 'node')),
            paths.map(p => path.resolve(p, 'node.exe'))
        );

        Promise.all(searchPaths.map(p => access(p).then(() => p, err => false)))
            .then(results => {
                results = trimArray(results);

                if (results.length) {
                    resolve(results[0]);
                } else {
                    const err = new Error('cannot find nodejs');
                    (err as any).code = 'ENOENT';
                    reject(err);
                }
            }, err => reject(err));
    });
}

export async function fork(jsPath: string, args: string[], options: SpawnOptions) {
    try {
        const execPath = await nodeJSPath();
        args = [jsPath].concat(args);
        //console.log('spawn: ' + execPath + ' ' + args.join(' '));
        return spawn(execPath, args, options);
    } catch (err) {
        if (err.code === 'ENOENT') {
            vscode.window.showErrorMessage('Cannot find Node.js installation from environment variable');
        } else {
            vscode.window.showErrorMessage(`Failed to find Node.js installation due to ${err.message}`);
        }

        throw err;
    }
}

export function envWithNodePath(rootPath: string): { NODE_PATH: string;[key: string]: string; } {
    return Object.assign({
        NODE_PATH: `${rootPath}${path.sep}node_modules`
    }, config.env);
}