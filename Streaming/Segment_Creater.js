var ffmpeg = require('fluent-ffmpeg');
const mpdgen = require("./mpdgen.js");
const jsongen = require("./jsongen.js");
const fs = require("fs");

class Segment_Creater{
    constructor(source, savevideo, fileoutname){
		this.pathToSourceFile = source+"\\"+fileoutname
		this.pathToSaveFile = savevideo+"\\"+fileoutname
		this.pathToJsonFile = savevideo+"\\"+fileoutname
		this.pathToManifestFile = savevideo+"\\"
		
		this.counter = 0
		this.keep_sizes = []
		try {
		  if (!fs.existsSync(savevideo)) {
			fs.mkdirSync(savevideo);
		  }
		} 
		catch (err) {
		  console.error(err);
		}
		
		ffmpeg.setFfmpegPath(__dirname+"\\ffmpeg.exe ")
    }
	
    extract_video(size){
		var path = this.pathToSourceFile // this.pathToSourceFile can not use in function
		var save_path = this.pathToSaveFile
		var json_path = this.pathToJsonFile
		var manifest_path = this.pathToManifestFile
		
		this.counter += 1
		var counter = this.counter
		
		this.keep_sizes.push(size)
		var sizes = this.keep_sizes
		
		var _command = ffmpeg(path+".mp4");
		
		_command.videoCodec('libvpx') //libvpx-vp9 could be used too
        .videoBitrate(3000, true) //Outputting a constrained 3Mbit VP8 video stream
        .outputOptions(
                '-flags', '+global_header', //WebM won't love if you if you don't give it some headers
                '-psnr') //Show PSNR measurements in output. Anything above 40dB indicates excellent fidelity
        .on('start', function(progress) {
              console.log('Start...');
        })
        .on('end', function(err, stdout, stderr) {
			  new jsongen(save_path+'_'+size+'_output.webm', json_path+'_'+size+'_output.webm')
			  counter -= 1
			  if(counter == 0){
				new mpdgen(save_path, manifest_path, sizes)
			  }
			  
        }) 
        .size(size)
        .noAudio()
        .save(save_path+'_'+size+'_output.webm');
	}
	
	extract_audio(){
		var path = this.pathToSourceFile
		var save_path = this.pathToSaveFile
		var json_path = this.pathToJsonFile
		var manifest_path = this.pathToManifestFile
		
		this.counter += 1
		var counter = this.counter
			
		var sizes = this.keep_sizes
		
		var _command = ffmpeg(path+".mp4");
		
		_command.videoCodec('libvpx') //libvpx-vp9 could be used too
        .videoBitrate(3000, true) //Outputting a constrained 3Mbit VP8 video stream
        .outputOptions(
                '-flags', '+global_header', //WebM won't love if you if you don't give it some headers
                '-psnr') //Show PSNR measurements in output. Anything above 40dB indicates excellent fidelity
        .on('start', function(progress) {
              console.log('Start...');
        })
        .on('end', function(err, stdout, stderr) {
			  new jsongen(save_path+'_audio.webm', json_path+'_audio.webm')
			  counter -= 1
			  if(counter == 0){
				new mpdgen(save_path, manifest_path, sizes)
				console.log('End...');
			  }
        })
        .noVideo()
        .save(save_path+'_audio.webm');
	}
}
module.exports = Segment_Creater;
