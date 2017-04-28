# vscode-mocha-test-runner

Creates code lens before each **describe** and **it** function call in files with these patterns: ***.test.js**, ***.test.jsx**, ***.test.ts** and ***.test.tsx**.

Lense on **it** function shows last test result and can be used to run given test (using grep pattern - tests titles needs to be unique).

Lense on **describe** shows aggregated results from nested **it** and can be used to run all tests in given group.

## Preview

![preview](./images/preview.png)


## Known issues:

- Tests not wrapped by describe function are ignored.

- Cannot figure out how to start mocha and attach vscode debugger.
