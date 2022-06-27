//main server used express.js framework.

const express = require("express");
const app = express();
const PORT = 5000;
const { sendFile, baseStream } = require("./Streaming/Streamingfunc"); // call easy_dash

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
