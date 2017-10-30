import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import * as diff from 'diff';
import * as fs from 'fs';
import * as minimatch from 'minimatch';
import * as path from 'path';
import * as vscode from 'vscode';
import { config } from './config';
import { codeLensProvider, outputChannel } from './extension';
import { runTests } from './TestRunner';
import { ItCodeLens, TestCodeLensBase } from './TestsCodeLensProvider';
import { FileTestStates, TestResult, TestState, TestStates } from './Types';
import {
  appendError,
  getDocumentSelector,
  getFileSelector,
  languages,
  throwIfNot,
} from './Utils';
const npmRun = require('npm-run');

type TestContext = { lines: string[]; passing: number; failing: number };

let compilerProcess: ChildProcess;
let compilerOutputChannel: vscode.OutputChannel;
export function commandRunTests(codeLens: TestCodeLensBase) {
  throwIfNot('commandRunTests', codeLens, 'codeLens');

  if (codeLens.state === 'Running') {
    return;
  }

  outputChannel.clear();

  if (codeLens.document.isDirty) {
    codeLens.document.save();
  }

  const selector = getDocumentSelector(codeLens.document);

  const states: TestStates = {};
  testFileExists(selector)
    .then(() => {
      for (const sel of codeLens.selectors) {
        states[sel] = 'Running';
      }
      codeLensProvider.updateTestStates(selector, states);
    })
    .then(() =>
      runTests(
        codeLens instanceof ItCodeLens && codeLens.debug,
        codeLens.grep,
        [selector],
      ),
    )
    .then(response => {
      updateTestStates(
        states,
        selector,
        response.results[selector] || [],
        codeLens.selectors,
      );
      outputChannel.append(response.stdout);
    })
    .catch(err => {
      updateTestStates(states, selector, [], codeLens.selectors, 'Fail');
      appendError(err);
    })
    .then(() => codeLensProvider.updateTestStates(selector, states));
}

export function commandRunAllTests() {
  outputChannel.clear();

  runTests(false)
    .then(response => {
      const fileStates: FileTestStates = {};

      const keys = Object.keys(response.results);
      for (const selector of keys) {
        let states = fileStates[selector];
        if (!states) {
          states = {};
          fileStates[selector] = states;
        }

        updateTestStates(states, selector, response.results[selector]);
      }

      codeLensProvider.updateFileTestStates(fileStates);
      outputChannel.append(response.stdout);
    })
    .catch(appendError)
    .then(() => codeLensProvider.updateAllRunningStatesTo('Fail'));
}

export function commandRunFileTests() {
  outputChannel.clear();

  if (!vscode.window.activeTextEditor) {
    outputChannel.appendLine('run-file-tests: No active editor');
    return;
  }

  const document = vscode.window.activeTextEditor.document;
  if (
    !document ||
    languages.findIndex(
      o =>
        o.language === document.languageId &&
        minimatch(document.fileName, o.pattern, { dot: true }),
    ) === -1
  ) {
    outputChannel.appendLine(
      'run-file-tests: Active document is not valid test file.',
    );
    return;
  }

  if (document.isDirty) {
    document.save();
  }

  const selector = getDocumentSelector(document);
  let states: TestStates;
  testFileExists(selector)
    .then(() => {
      states = codeLensProvider.updateFileStates(selector, 'Running');
    })
    .then(() => runTests(false, undefined, [selector]))
    .then(response => {
      updateTestStates(
        states,
        selector,
        response.results[selector],
        Object.keys(states),
      );
      codeLensProvider.updateTestStates(selector, states);
      outputChannel.append(response.stdout);
    })
    .catch(appendError)
    .then(() => codeLensProvider.updateAllRunningStatesTo('Fail'));
}

export function commandRunScript() {
  if (!config.compilerScript) {
    vscode.window.showWarningMessage(`No 'mocha.script' script specified!`);
    return;
  }

  if (compilerOutputChannel) {
    compilerOutputChannel.clear();
  } else {
    compilerOutputChannel = vscode.window.createOutputChannel(
      'Mocha test runner - script',
    );
    compilerOutputChannel.show();
  }

  compilerProcess = npmRun.spawn('npm', ['run', config.compilerScript], {
    cwd: vscode.workspace.rootPath,
    env: {
      ...process.env,
      path:
        process.env.path +
        ';' +
        path.join(vscode.workspace.rootPath, 'node_modules/.bin'),
    },
  });

  compilerProcess.stdout.on('data', data => {
    if (typeof data !== 'string') {
      data = data.toString();
    }
    compilerOutputChannel.append(data);
  });

  compilerProcess.stderr.on('data', data => {
    if (typeof data !== 'string') {
      data = data.toString();
    }
    compilerOutputChannel.append(data);
  });

  compilerProcess.on('close', code => {
    compilerOutputChannel.appendLine(`child process exited with code ${code}`);
  });
}

export function commandStopCompiling() {
  if (compilerProcess) {
    compilerProcess.kill();
    compilerOutputChannel.dispose();
  }
}

function updateTestStates(
  states: TestStates,
  fileSelector: string,
  results: TestResult[],
  selectors?: string[],
  selectorsState: TestState = 'Inconclusive',
) {
  throwIfNot('updateTestStates', states, 'states');
  throwIfNot('updateTestStates', fileSelector, 'fileSelector');
  throwIfNot('updateTestStates', results, 'results');

  if (selectors) {
    for (const sel of selectors) {
      states[sel] = selectorsState;
    }
  }
  for (const test of results) {
    states[test.selector.join(' ')] = test.state;
  }
}

function testFileExists(fileSelector: string) {
  return new Promise((resolve, reject) => {
    const testFile = path.join(vscode.workspace.rootPath, fileSelector + '.js');
    fs.exists(testFile, exists => {
      if (exists) {
        resolve();
      } else {
        reject(
          `Test file '${testFile}' was not found.` +
            `(Didnt u forget to transpile sources?)`,
        );
      }
    });
  });
}

function nodeJSPath() {
  return new Promise<string>((resolve, reject) => {
    const paths = process.env.path.split(
      process.platform === 'win32' ? ';' : ':',
    );

    const searchPaths = [].concat(
      paths.map(p => path.resolve(p, 'node')),
      paths.map(p => path.resolve(p, 'node.exe')),
    );

    Promise.all(
      searchPaths.map(p => access(p).then(() => p, err => false)),
    ).then(
      results => {
        results = trimArray(results);

        if (results.length) {
          resolve(results[0]);
        } else {
          const err = new Error('cannot find nodejs');
          (err as any).code = 'ENOENT';
          reject(err);
        }
      },
      err => reject(err),
    );
  });
}

function npmPath() {
  return new Promise<string>((resolve, reject) => {
    const paths = process.env.path.split(
      process.platform === 'win32' ? ';' : ':',
    );
    const searchPaths = [].concat(
      paths.map(p =>
        path.resolve(p, process.platform === 'win32' ? 'npm.cmd' : 'npm'),
      ),
    );

    Promise.all(
      searchPaths.map(p => access(p).then(() => p, err => false)),
    ).then(
      results => {
        results = trimArray(results);

        if (results.length) {
          resolve(results[0]);
        } else {
          const err = new Error('cannot find npm');
          (err as any).code = 'ENOENT';
          reject(err);
        }
      },
      err => reject(err),
    );
  });
}

function trimArray<T>(array: T[]): T[] {
  return array.reduce((trimmed, item) => {
    if (item) {
      trimmed.push(item);
    }
    return trimmed;
  }, []);
}

function access(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    fs.access(filePath, err => {
      if (err) {
        reject(err);
      }
      resolve(filePath);
    });
  });
}
