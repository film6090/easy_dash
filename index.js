require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const { sendFile, baseStream } = require("./Streaming/Streamingfunc"); // เรียก Streaming
var video_list = null;

app.set("view engine", "ejs");
app.use(express.static( baseStream() )); // ให้รู้ว่าไฟล module อยู่ไหน

app.get("/", (req, res) => {
	console.log("1")
	if (!video_list) {
		let video_mnt_path = path.join(__dirname, "video");
		let folders = fs.readdirSync(video_mnt_path).filter((name) => {
			return fs.lstatSync(path.join(video_mnt_path, name)).isDirectory();
		});
		video_list = folders;
	}

	res.locals.video_list = video_list;
	res.render("index")
});

app.get("/home/:video_name", (req, res) => { 
	console.log("2")
	res.locals.video_id = req.params["video_name"];
	res.render("player");
	
});

app.get("/home/:video_name/:filename", (req, res) => {
	console.log("5")
	sendFile(req, res, __dirname+"/video"); // path ที่เก็บ folder video ทั้งหลาย (ตาม structure การแตกไฟล์)
});

app.listen(PORT, () => console.log(`Server listening in on port ${PORT}`));
