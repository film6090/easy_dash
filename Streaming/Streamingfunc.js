const fs = require("fs");
const path = require("path");
const segment = require("./Segment_Creater.js")

const resolve_content_type = (filename) => filename === "audio.webm" ? "audio/webm" : "video/webm";
const resolve_file_path = (basepath, video_name, filename) => path.join(basepath, video_name, filename);

function sendFile(req, res, basepath){
	let file_name = req.params.filename;
	let file_path = resolve_file_path(basepath, req.params["video_name"], file_name);
	
	if (getExtension(file_name).toLowerCase() !== "webm"){
		res.sendFile(file_path);
		return
	}
    let { size: fileSize } = fs.statSync(file_path);
	const parts = req.headers.range.replace(/bytes=/, "").split("-");
	const start = parseInt(parts[0], 10);
	const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;

	let chunkSize = end - start + 1;
	let head = {
		"Transfer-Encoding": "chunked",
		"Content-Range": `bytes ${start}-${end}/${fileSize}`,
		"Accept-Ranges": "bytes",
		"Content-Length": chunkSize,
		"Content-Type": resolve_content_type(file_name)
	};
	res.writeHead(206, head);

	fs.createReadStream(file_path, { start, end }).pipe(res);
}

function getExtension(filename){
	var parts = filename.split('.');
	return parts[parts.length - 1];
}

function baseStream(){
	return path.join(__dirname,"/..","public")
}

function segment_creater(source, savevideo, fileoutname){
	return new segment(source, savevideo, fileoutname)
}

module.exports.sendFile = sendFile;
module.exports.baseStream = baseStream;
/*
source = "D:\\Documents\\Code\\Streaming_2\\master"
savevideo = "D:\\Documents\\Code\\Streaming_2\\master\\VDO_Streaming_master\\video\\drive"
fileoutname = "drive"
var obj = segment_creater(source, savevideo, fileoutname);
obj.extract_video('640x360')
obj.extract_video('320x180')
obj.extract_video('160x90')
obj.extract_audio()
*/
