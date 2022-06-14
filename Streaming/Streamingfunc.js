const fs = require("fs");
const resolve_content_type = (filename) => filename === "audio.webm" ? "audio/webm" : "video/webm";

function sendFile(req , res , file_path , file_name){
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

module.exports.sendFile = sendFile;