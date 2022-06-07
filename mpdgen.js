const { exec } = require('node:child_process');
const fs = require("fs");

class mpdgen{
    constructor(path, manifest_path , sizes){
		var first_command = __dirname+"\\ffmpeg.exe "
		for(var i=0; i<sizes.length; i+=1){
			first_command += '-f webm_dash_manifest -i '+path+'_'+sizes[i]+'_output.webm '
				
		}
		first_command += '-f webm_dash_manifest -i '+path+'_audio.webm '
		
		var second_command = first_command + '-c copy '
		for(var i=0; i<sizes.length; i+=1){
			second_command += '-map '+i+' '
		}
		second_command += '-map '+sizes.length+' '
		
		var third_command = second_command + '-f webm_dash_manifest -adaptation_sets "id=0,streams=0'
		for(var i=1; i<sizes.length; i+=1){
			third_command += ','+i
		}
		third_command += ' id=1,streams='+sizes.length+'" '
		third_command += manifest_path+'_manifest.mpd'
		
		
		fs.unlink(manifest_path+'_manifest.mpd', function (err) {
		  if (err) {
			console.error("Creating new File");
		  } else {
			console.log("File removed");
		  }
		});
		
		exec(third_command, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
          });
          
    }
}
module.exports = mpdgen;
//new mpdgen("D:\\Documents\\Code\\Streaming_2\\master\\VDO_Streaming\\video\\Polkka_rock", ["160x90","320x180"])
