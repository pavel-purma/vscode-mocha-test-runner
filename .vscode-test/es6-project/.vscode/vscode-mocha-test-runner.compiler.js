const execSync = require('child_process').execSync;

// process.argv = [node.exe, _this_file_, args]
const args = process.argv.length > 2 ? process.argv.slice(2) : ['.', '--ignore=node_modules,dist'];

execSync('node_modules\\.bin\\babel.cmd --out-dir .temp ' + args.join(' '));
