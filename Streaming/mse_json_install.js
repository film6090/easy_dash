const { exec } = require('node:child_process');
exec('go install github.com/acolwell/mse-tools/mse_json_manifest@latest', (error, stdout, stderr) => {
	if (error) {
		console.error(`exec error: ${error}`);
		return;
	}
});
