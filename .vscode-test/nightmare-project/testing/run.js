const fork = require('child_process').fork;
const path = require('path');

const testProcess = path.join(__dirname, 'TestProcess.js');
const testScript = path.join(__dirname, 'TestScript.js');

const child = fork(testProcess, [], { silent: true });

child.on('message', data => {	
	console.log(JSON.stringify(data, null, 3));
});

child.stdout.on('data', data => { 
	if (typeof data !== 'string') { 
		data = data.toString('utf8');
	}

	console.log(data);
});

child.stderr.on('data', data => { 
	if (typeof data !== 'string') { 
		data = data.toString('utf8');
	}
	
	console.log(data);	
});


child.on('exit', code => {
	process.exit(code);
});

const args = {
	fileName: testScript,
	workspacePath: __dirname
};

child.send(args);

var timeout = setTimeout(()=>{
	console.log('timeout');
}, 3600 * 1000);
