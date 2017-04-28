# Mocha test runner 

Creates code lens before each **describe** and **it** function call in test files.

Lense on **it** function shows last test result and can be used to run given test (using mocha --grep pattern - tests titles needs to be unique otherwise more than one test will be executed).

Lense on **describe** shows aggregated results from nested **it** and can be used to run all tests in given group / only test with specific status.

Tests not writen in javascript that mocha can load (es6 with import command, razor syntax, typescript, etc.) needs to be transpiled to es5 or es6 without import command - see example projects in .vscode-test directory.

## Valid test file names:
- javascript: ```**/*.test.js``` or ```**/*.test.jsx```
- typescript: ```**/*.test.ts``` or ```**/*.test.tsx```

(mocha is searching for transpiled scripts ```**/*.test.js``` in project root directory -or- in mocha.files.rootPath directory if is present - additional script needed that will transpile sources)

## Preview:

![preview](./images/preview.png)

## Examples:
- [es5 project](.vscode-test/es5-project): basic usage
- [es6 project](.vscode-test/es6-project): tests uses es6 import command - is transpoled to es5 with babel, this configuration can handle jsx syntax (react.js needs to be included via mocha.files.setup)
- [typescript project](.vscode-test/ts-project) tests writen in typescript - transpiled to es6 without use of mport command, this configuration cal handle tsx syntax (react.js needs to be included via mocha.files.setup)
- [enzyme project](.vscode-test/enzyme-project) test writer in tsx syntax, tests budled with webpack - no need explicitly import react.js for test to work

## Known issues:
- Tests not wrapped by describe function are ignored.
- Cannot figure out how to start mocha and attach vscode debugger.
