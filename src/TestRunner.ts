import { ForkOptions } from 'child_process';
import * as fs from 'fs';
import { Glob } from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as vscode from 'vscode';
import { config } from './config';
import { runTestProcess } from './TestProcess';
import { TestProcessRequest, TestProcessResponse, TestsResults } from './Types';
import { spawnTestProcess, throwIfNot } from './Utils';

export function runTests(
  debug = false,
  grep?: string,
  fileSelectors?: string[],
) {
  return runTestsCore({ grep, fileSelectors }, debug);
}

export function runTestsInFile(fileName: string) {
  throwIfNot('runTestsInFile', fileName, 'fileName');

  return runTestsCore({ fileName }, false);
}

function runTestsCore(
  processArgs: Partial<TestProcessRequest>,
  debug: boolean,
) {
  const args = {
    glob: config.glob,
    ignore: config.ignoreGlobs,
    options: config.options,
    rootPath: config.outputDir,
    setup: config.setupFile,
    workspacePath: vscode.workspace.rootPath,
    ...processArgs,
  };

  const testProcess = path.join(
    path.dirname(module.filename),
    'TestProcess.js',
  );

  const spawnTestProcessOptions = {
    cwd: vscode.workspace.rootPath,
    env: config.env,
    execArgv: [],
    execPath: config.nodeExec,
    requires: config.requires || [],
  };

  if (debug) {
    spawnTestProcessOptions.execArgv = ['--inspect-brk=' + config.debugPort];
  }

  const childProcess = spawnTestProcess(
    testProcess,
    [],
    spawnTestProcessOptions,
  );

  if (debug) {
    vscode.commands.executeCommand('vscode.startDebug', {
      address: 'localhost',
      env: {
        NODE_ENV: 'test',
      },
      name: 'Attach',
      outFiles: [path.join(args.workspacePath, args.rootPath, '**/*.js')],
      port: config.debugPort,
      request: 'attach',
      runtimeArgs: ['--nolazy'],
      sourceMaps: true,
      trace: config.debugTrace,
      type: 'node',
    });

    args.options = { ...args.options, timeout: 360000 };
  }

  return new Promise<TestProcessResponse>((resolve, reject) => {
    let results: any;
    const stdout: string[] = [];
    const stderr: string[] = [];
    let stderrTimeout: NodeJS.Timer;
    let pendingReject: boolean;

    const doReject = () => {
      reject(stdout.join('') + '\r\n' + stderr.join(''));
    };

    childProcess.on('message', data => {
      results = data;
    });

    childProcess.stdout.on('data', data => {
      if (typeof data !== 'string') {
        data = data.toString('utf8');
      }

      stdout.push(data);
    });

    childProcess.stderr.on('data', data => {
      if (typeof data !== 'string') {
        data = data.toString('utf8');
      }

      if (
        data.startsWith('Warning:') ||
        data.startsWith('Debugger listening on')
      ) {
        stdout.push(data);
        return;
      }

      stderr.push(data);
      if (!stderrTimeout) {
        stderrTimeout = setTimeout(() => {
          childProcess.kill('SIGTERM');
          doReject();
        }, 500);
      }
    });

    childProcess.on('exit', code => {
      if (code !== 0) {
        if (stderrTimeout) {
          pendingReject = true;
        } else {
          doReject();
        }
      } else {
        resolve({
          results,
          stdout: stdout.join(''),
        } as TestProcessResponse);
      }
    });

    if (debug) {
      // give debugger some time to properly attach itself before running tests
      setTimeout(() => {
        childProcess.send(args);
      }, 1000);
    } else {
      childProcess.send(args);
    }
  });
}
