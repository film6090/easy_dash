const { exec } = require('node:child_process');

class jsongen{
    constructor(path, manifest_path){
        exec('mse_json_manifest '+path+' > '+manifest_path+'.json', (error, stdout, stderr) => {
            if(error){
              console.error(`exec error: ${error}`);
              return;
            }
          });
    }
}
module.exports = jsongen;
