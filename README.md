# Mocha test runner 

Creates code lens before each **describe** and **it** function call in files with these patterns: ***.test.js**, ***.test.jsx**, ***.test.ts** and ***.test.tsx**.

Lense on **it** function shows last test result and can be used to run given test (using grep pattern - tests titles needs to be unique).

Lense on **describe** shows aggregated results from nested **it** and can be used to run all tests in given group.

Tests not writen in es5 (es6, razor, typescript, etc.) needs to be transpiled to es5 so mocha can load them - see example projects in .vscode-test directory.

## Preview:

![preview](./images/preview.png)

## Examples:
- [es5 project](.vscode-test/es5-project).
- [es6 project](.vscode-test/es6-project)
- [typescript project](.vscode-test/ts-project)
- [enzyme project](.vscode-test/enzyme-project)


## Known issues:

- Tests not wrapped by describe function are ignored.

- Cannot figure out how to start mocha and attach vscode debugger.
