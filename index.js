require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const iplocation = require("iplocation");
const { sendFile } = require("./Streaming/Streamingfunc");
var video_list = null;

app.set("view engine", "ejs");

app.use((req, res, next) => {
	console.log("Request: ", req.url);
	console.log("Received request w/ headers:", req.headers);
	next();
});

if (process.env["NODE_ENV"] === "production") {
	app.use((req, res, next) => {
		let ip_addr = (req.headers["x-forwarded-for"] || req.connection.remoteAddress).split(",")[0];

		iplocation(ip_addr, (err, info) => {
			console.log(info);
			if (info && (info["country_code"] === process.env["COUNTRY_CODE"] || info["time_zone"].includes(process.env["KEY_WORD"]))) {
				res.redirect(process.env["OTHER_URL"]);
			} else {
				next();
			}
		});
	});
}
;
app.use(express.static(path.join(__dirname, "public")));

const resolve_file_path = (video_id, filename) => path.join(__dirname, "video", video_id, filename);

app.get("/", (req, res) => {
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

app.get("/watch/:video_id", (req, res) => {
	fs.stat(path.join(__dirname, "video", req.params["video_id"]), (err, stats) => {
		if (err || !stats.isDirectory()) {
			console.log(err);
			return res.redirect("/");
		}

		res.locals.video_id = req.params["video_id"];
		res.render("player");
	});
});

app.get("/watch/:video_id/manifest.mpd", (req, res) => {
	res.sendFile(resolve_file_path(req.params["video_id"], "manifest.mpd"));
});

app.get("/watch/:video_id/timestamps/:filename", (req, res) => {
	res.sendFile(resolve_file_path(req.params["video_id"], `timestamps/${req.params["filename"]}`));
});

app.get("/watch/:video_id/:filename", (req, res) => {
	let file_name = req.params.filename;
	let file_path = resolve_file_path(req.params["video_id"], file_name);

	sendFile(req , res , file_path , file_name);
});

app.listen(PORT, () => console.log(`Server listening in on port ${PORT}`));