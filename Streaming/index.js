const Player = require("./streaming");
const Timer = require("./timer");
const path = require("path");

const id_video = document.currentScript.getAttribute('id_video')
var playerElement = document.getElementById(id_video);
const video_id = playerElement.getAttribute("data-player-id");
			
const player = new Player(video_id, playerElement);

playerElement.src = player.objectUrl;
playerElement.addEventListener("error", (err) => console.log(err));

let timer = new Timer(playerElement.duration);

playerElement.addEventListener("play", () => {
	timer.start();
});

playerElement.addEventListener("ended", () => {
	console.log("***end***")
	timer.end();
	timer.setVideoDuration(playerElement.duration);
	console.log("Lag Ratio: " + timer.lagRatio);
});
