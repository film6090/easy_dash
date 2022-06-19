# Easy_Dash
## How to install
### 1 Install this thing
* [Go](http://golang.org/)

### 2 Run this file "mse_json_install.js" to Install tool for this package
- Run the following commands:
	<pre>
	node mse_json_install.js
	</pre>
   or run on whatever IDE
## How to use with example
- install npm:
	<pre>
	npm init
	</pre>
- install packages:
	<pre>
	npm i ejs
	</pre>
	<pre>
	npm i express
	</pre>
	<pre>
	npm i easy_dash
	</pre>
	<pre>
	npm i fluent-ffmpeg
	</pre>
- Javascript File:
 ```javascript
 /*index.js*/
const express = require("express");
const app = express();
const PORT = 5000;
const { sendFile, baseStream } = require("easy_dash"); // call easy_dash

app.set("view engine", "ejs"); // .ejs should on view folder
app.use(express.static( baseStream() )); // set where module is

app.get("/", (req, res) => {
		res.locals.video_id = "drive" // video name that will show
		res.render("index") // render a view that has script streaming-bundle.js with video tag
});

app.get("/:video_name/:filename", (req, res) => {
	sendFile(req, res, __dirname+"/video"); //__dirname+"/video" is path videos that extrect from origin video 
});

app.listen(PORT, () => console.log(`Server listening in on port ${PORT}`));
```
- ejs File:
 ```html
/*index.ejs*/
<!DOCTYPE html>
<html>
<head>
	<title>Easy Dash</title>
</head>
<body>
	<video id="videoPlayer" width="600" height="400" controls data-player-id="<%- locals.video_id %>"></video>
	<script type="text/javascript" src="/streaming-bundle.js" id_video="videoPlayer"></script>
</body>
</html>
 ```
- Prepairing file for streaming video
 ```javascript
 /*upload.js*/
const { segment_creater } = require("easy_dash"); // call Prepairing Streaming video
source = "D:/Documents/Code/Streaming_2/master/easy_dash/test-folder/source" // your directory that has origin video
savevideo = "D:/Documents/Code/Streaming_2/master/easy_dash/test-folder/video/Polkka_rock" // your directory that want to save
fileoutname = "Polkka_rock" // your file name (origin and new one will have the same name)
var obj = segment_creater(source, savevideo, fileoutname)
obj.extract_video('640x360') // video's resolution that is created
obj.extract_video('320x180') // video's resolution that is created
obj.extract_video('160x90') // video's resolution that is created
obj.extract_audio() // audio that is created
```
- Run Server
	<pre>
	node index.js
	</pre>
	or
	<pre>
	npm start
	</pre>
	same thing

You can test evey thing that I told on this repo
