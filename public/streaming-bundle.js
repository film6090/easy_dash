(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Player = require("./streaming");
const Timer = require("./timer");

const playerElement = document.getElementById("videoPlayer");
const video_id = playerElement.getAttribute("data-player-id");

const player = new Player(video_id);

playerElement.src = player.objectUrl;
playerElement.addEventListener("error", (err) => console.log(err));

let timer = new Timer(playerElement.duration);

playerElement.addEventListener("play", () => {
	timer.start();
});

playerElement.addEventListener("ended", () => {
	timer.end();
	timer.setVideoDuration(playerElement.duration);
	console.log("Lag Ratio: " + timer.lagRatio);
});

},{"./streaming":4,"./timer":5}],2:[function(require,module,exports){
class ManifestParser {
	constructor(video_id) {
		this.video_id = video_id;
		this.base_video_url = "/watch";
	}

	adaptationSetToJSON(adaptationSet) {
		let adaptSetObj = {};

		adaptSetObj.mimeType = adaptationSet.getAttribute("mimeType");
		adaptSetObj.codecs = adaptationSet.getAttribute("codecs");

		adaptSetObj.representations = [];

		let representations = adaptationSet.children;

		let timestampPromises = [];

		for (let i = 0; i < representations.length; i++) {
			let representationObj = {};
			adaptSetObj.representations[i] = representationObj;
			representationObj["url"] = `${this.base_video_url}/${this.video_id}/${this.getUrl(representations[i])}`;

			let timestampPromise = new Promise((res, rej) => {
				fetch(`${this.base_video_url}/${this.video_id}/timestamps/${this.getUrl(representations[i])}.json`)
				.then((response) => response.json())
				.then((timestamp_info) => {
					representationObj["timestamp_info"] = timestamp_info;
					res();
				});
			});
			
			timestampPromises.push(timestampPromise);
		}

		return Promise.all(timestampPromises)
		.then(() => adaptSetObj);
	}

	getUrl(representation) {
		let { children } = representation;
		for (let i = 0; children.length; i++) {
			if (children[i].tagName == "BaseURL") {
				return children[i].textContent.split("\\\\")[1];
			}
		}
	}

	getJSONManifest() {
		return new Promise((resolve, reject) => {
			fetch(`${this.base_video_url}/${this.video_id}/manifest.mpd`)
			.then((response) => response.text())
			.then((manifest_str) => (new window.DOMParser()).parseFromString(manifest_str, "text/xml"))
			.then((manifest) => {
				let first_period = manifest.getElementsByTagName("Period")[0];
				let adaptationSets = first_period.children;

				window.manifest = manifest;

				let adaptationConversionPromises = [];

				let adaptSetsObj = {};
				for (let i = 0; i < adaptationSets.length; i++) {
					let adaptationPromise = new Promise((resAdapt, rejAdapt) => {
						this.adaptationSetToJSON(adaptationSets[i])
						.then((adaptation_json) => {
							adaptSetsObj[adaptationSets[i].getAttribute("mimeType")] = adaptation_json;
							resAdapt();
						});
					})
					adaptationConversionPromises.push(adaptationPromise);
				}

				Promise.all(adaptationConversionPromises)
				.then(() => resolve(adaptSetsObj));
			});
		});
	}
};

module.exports = ManifestParser;

},{}],3:[function(require,module,exports){
class Queue {
	constructor() {
		this.data = [];
		this.pipingToSourceBuffer = false;
		this.numBytesWrittenInSegment = 0;
	}

	push(buf) {
		if (!buf) {
			throw new Error("Cannot push falsey values to queue");
		}

		this.data.push(buf);
		this.numBytesWrittenInSegment += buf.length
	}

	resetByteCounter() {
		this.numBytesWrittenInSegment = 0;
	}

	empty() {
		return this.data.length === 0;
	}

	popFirst() {
		let buf = this.data[0];
		this.data.shift();
		return buf;
	}
}

module.exports = Queue;
},{}],4:[function(require,module,exports){
const Queue = require("./queue");
const ManifestParser = require("./manifest-parser");
const { calculateByteRangeEnd, createByteRangeString, RetryTimer } = require("./util");

class Streaming {
	constructor(video_id) {
		this.mse = new (window.MediaSource || window.WebKitMediaSource());
		this.video_id = video_id;
		this.initialized = false;
		this.audioQueue = new Queue();
		this.videoQueue = new Queue();

		this.videoDownFin = false;
		this.audioDownFin = false;

		this.videoMediaIndex = 0;
		this.videoQualityIndex = 0;
		this.videoBytesInSourceBuffer = 0;

		this.retryTimer = new RetryTimer();

		this.mse.addEventListener("sourceopen", () => {
			console.log("Source Opened");
			this.init.bind(this)();
		});
	}

	get objectUrl() {
		return URL.createObjectURL(this.mse);
	}

	appendBufFromQueue(srcBuffer, queue) {
		queue.pipingToSourceBuffer = true;

		return !queue.empty() && (srcBuffer.appendBuffer(queue.popFirst()) || true);
	}

	readData(reader, bufferQueue, sourceBuffer, callback = () => {}) {
		reader.read()
		.then((buffer) => {
			if (buffer.value) {
				bufferQueue.push(buffer.value);
				if(!bufferQueue.pipingToSourceBuffer) {
					console.log("called: ", sourceBuffer, bufferQueue.pipingToSourceBuffer);
					this.appendBufFromQueue(sourceBuffer, bufferQueue);
				}	
			}

			if(!buffer.done) {
				this.readData(...arguments);
			} else {
				callback();
			}
		})
		.catch((err) => callback(err));
	}

	init() {
		if (this.initialized) return;
		this.initialized = true;

		(new ManifestParser(this.video_id)).getJSONManifest()
		.then((adaptSetsObj) => {
			this.videoSets = adaptSetsObj["video/webm"];
			this.audioSets = adaptSetsObj["audio/webm"];
			console.log(this.videoSets);

			this.videoQualityIndex = this.videoSets.representations.length - 1;

			this.videoSourceBuffer = this.mse.addSourceBuffer(`video/webm; codecs="${this.videoSets["codecs"]}"`);
			this.audioSourceBuffer = this.mse.addSourceBuffer(`audio/webm; codecs="${this.audioSets["codecs"]}"`);

			this.videoSourceBuffer.addEventListener("updateend", () => {
				if(!this.appendBufFromQueue(this.videoSourceBuffer, this.videoQueue)) this.videoQueue.pipingToSourceBuffer = false;
				this.attemptEndMse();
			});

			this.audioSourceBuffer.addEventListener("updateend", () => {
				if(!this.appendBufFromQueue(this.audioSourceBuffer, this.audioQueue)) this.audioQueue.pipingToSourceBuffer = false;
				this.attemptEndMse();
			});

			this.fetchData();
		});
	}

	attemptEndMse() {
		if (this.videoDownFin && this.audioDownFin && !this.videoQueue.pipingToSourceBuffer && !this.audioQueue.pipingToSourceBuffer) {
			console.log("Ending MediaSource stream");
			this.mse.endOfStream();
		}
	}

	fetchData() {
		this.fetchVideoAdaptive();
		this.fetchAudio();
	}

	fetchVideoAdaptive() {
		this.fetchVideoInit()
		.then(() => {
			this.fetchVideoNextTimeSlice();
		})
		.catch((err) => {
			console.log(`Error thrown in init: ${err}`);
			this.retryRequest(this.fetchVideoAdaptive.bind(this));
		});
	}

	fetchVideoNextTimeSlice() {
		let videoRepresentation = this.videoSets["representations"][this.videoQualityIndex];
		let { timestamp_info } = videoRepresentation;

		if (this.videoMediaIndex < timestamp_info["media"].length) {
			this._throttleQualityOnFeedback((finish) => {
				fetch(videoRepresentation["url"], {
					headers: {
						range: `bytes=${createByteRangeString(this.videoQueue.numBytesWrittenInSegment, timestamp_info["media"][this.videoMediaIndex])}`
					}
				})
				.then((response) => {
					this.retryTimer.reset();
					let reader = response.body.getReader();
					let bindedFetch = this.fetchVideoNextTimeSlice.bind(this);
					let handleReadData = this.handleReadDataFinish(finish, bindedFetch, () => this.retryRequest(bindedFetch));

					this.readData(reader, this.videoQueue, this.videoSourceBuffer, handleReadData);
				})
				.catch((err) => {
					this.retryRequest(this.fetchVideoNextTimeSlice.bind(this));
				});
			});
		} else {
			this.videoDownFin = true;
			this.attemptEndMse();
		}
	}

	// fetches initial video (webm headers + initial 5 seconds)
	fetchVideoInit() {
		let videoRepresentation = this.videoSets["representations"][this.videoQualityIndex];
		let { timestamp_info } = videoRepresentation;

		return new Promise((resolveFetchVideoInit, rejectFetchVideoInit) => {
			this._throttleQualityOnFeedback((finish) => {
				fetch(videoRepresentation["url"], {
					headers: {
						range: `bytes=${this.videoQueue.numBytesWrittenInSegment}-${calculateByteRangeEnd(timestamp_info["media"][this.videoMediaIndex])}`
					}
				})
				.then((response) => {
					this.retryTimer.reset();
					let reader = response.body.getReader();
					let handleReadData = this.handleReadDataFinish(finish, resolveFetchVideoInit, rejectFetchVideoInit);

					this.readData(reader, this.videoQueue, this.videoSourceBuffer, handleReadData);
				})
				.catch((err) => {
					console.log(`Error in fetchVideoInit promise ${err}`);
					rejectFetchVideoInit(new Error("Propagate up"));
				});
			});
		});
	}

	fetchAudio() {
		fetch(this.audioSets["representations"][0]["url"], {
			headers: {
				range: `bytes=${this.audioQueue.numBytesWrittenInSegment}-`
			}
		})
		.then((response) => {
			this.retryTimer.reset();
			var reader = response.body.getReader();
			this.readData(reader, this.audioQueue, this.audioSourceBuffer, (err) => {
				if (err) return this.fetchAudio();
				
				this.audioDownFin = true;
				this.attemptEndMse();
			});
		})
		.catch((err) => {
			this.retryRequest(this.fetchAudio.bind(this));
		});
	}

	handleReadDataFinish(finishForThrottle, nextAction, retryRequestCall) {
		return (err) => {
			if (err) {
				console.log("Retrying in video init", err);
				return retryRequestCall();
			}

			this.videoMediaIndex++;
			this.videoQueue.resetByteCounter();
			finishForThrottle();
			nextAction();
		}
	}

	retryRequest(requestCall) {
		console.log(`Retrying request in ${this.retryTimer.time}`);
		setTimeout(requestCall, this.retryTimer.time);
		this.retryTimer.increase();
	}

	// Improves quality (if possible) if time to fetch information < 50% of buffer duration decreases (if possible) if greater than 75%
	_throttleQualityOnFeedback(fetchCall) {
		let bufferDuration = this._calcDuration();
		let startTime = Date.now();
		fetchCall(() => {
			let endTime = Date.now();

			console.log(`Time elapsed: ${endTime - startTime} and bufferDuration = ${bufferDuration}`);
			let fetchDuration = endTime - startTime;
			let maxQualityIndex = this.videoSets["representations"].length - 1;
			let lowestQualityIndex = 0;

			if (fetchDuration < 0.5 * bufferDuration && this.videoQualityIndex !== maxQualityIndex) {
				this.videoQualityIndex++;
				console.log("Incremented Quality index");
			}

			if (fetchDuration > 0.75 * bufferDuration && this.videoQualityIndex !== lowestQualityIndex) {
				this.videoQualityIndex--;
				console.log("Decremented Quality index");
			}
		});
	}

	_calcDuration() {
		let videoRepresentation = this.videoSets["representations"][this.videoQualityIndex];
		let { timestamp_info } = videoRepresentation;
		let startTimeCode = timestamp_info["media"][this.videoMediaIndex]["timecode"];

		if (this.videoMediaIndex === timestamp_info["media"].length - 1) {
			return timestamp_info["duration"] - (1000 * startTimeCode);
		} else {
			let nextTimeCode = timestamp_info["media"][this.videoMediaIndex + 1]["timecode"];
			return 1000 * (nextTimeCode - startTimeCode);
		}
	}
};

module.exports = Streaming;
},{"./manifest-parser":2,"./queue":3,"./util":6}],5:[function(require,module,exports){
class Timer {
	constructor() {
		this.startTime = null;
		this.endTime = null;
		this.videoDuration = null;
	}

	start() {
		this.startTime = Date.now();
	}

	end() {
		this.endTime = Date.now();
	}

	setVideoDuration(videoDuration) {
		this.videoDuration = videoDuration;
	}

	get timeElapsed() {
		return (this.endTime - this.startTime) / 1000;
	}

	get lagRatio() {
		return (this.timeElapsed - this.videoDuration) / this.videoDuration;
	}
}

module.exports = Timer;
},{}],6:[function(require,module,exports){
// Hosts general functions that don't necessarily have ties to a bigger class or entity

const calculateByteRangeEnd = ({ offset, size }) => {
	return size + offset - 1;
}

const createByteRangeString = (numBytesWrittenInSegment, { offset, size }) => {
	return `${numBytesWrittenInSegment + offset}-${calculateByteRangeEnd({ offset, size })}`;
}

class RetryTimer {
	constructor() {
		this.time = 250;
		this.limit = 10000;
	}

	increase() {
		this.time = Math.min(2 * this.time, this.limit);
	}

	reset() {
		this.time = 250;
	}
}

module.exports.calculateByteRangeEnd = calculateByteRangeEnd;
module.exports.createByteRangeString = createByteRangeString;
module.exports.RetryTimer = RetryTimer;
},{}]},{},[1]);
