const Queue = require("./queue");
const ManifestParser = require("./manifest-parser");
const { calculateByteRangeEnd, createByteRangeString, RetryTimer } = require("./util");

class Streaming {
	constructor(video_id, playerElement) {
		this.mse = new (window.MediaSource || window.WebKitMediaSource());
		this.video_id = video_id;
		this.playerElement = playerElement
		//this.base_video_url = base_video_url;
		this.initialized = false;
		this.buffer_move = true;
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
		//console.log("***************************************************** I'm HERE 1 *****************************************************")
		return URL.createObjectURL(this.mse);
	}

	appendBufFromQueue(srcBuffer, queue) {
		//console.log("***************************************************** I'm HERE 2 *****************************************************")
		queue.pipingToSourceBuffer = true;
		return !queue.empty() && (srcBuffer.appendBuffer(queue.popFirst()) || true);
	}

	readData(reader, bufferQueue, sourceBuffer, callback = () => {}) {
		//console.log("***************************************************** I'm HERE 3 *****************************************************")
		reader.read()
		.then((buffer) => {
			if (buffer.value) {
				bufferQueue.push(buffer.value);
				if(!bufferQueue.pipingToSourceBuffer) {
					//console.log("called: ", sourceBuffer, bufferQueue.pipingToSourceBuffer);
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
		//console.log("***************************************************** I'm HERE 4 *****************************************************")
		if (this.initialized) return;
		this.initialized = true;

		(new ManifestParser(this.video_id)).getJSONManifest()
		.then((adaptSetsObj) => {
			this.videoSets = adaptSetsObj["video/webm"];
			this.audioSets = adaptSetsObj["audio/webm"];

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

			//console.log(this.video_id+"===================");
			this.fetchData();
		});
	}

	attemptEndMse() {
		//console.log("***************************************************** I'm HERE 5 *****************************************************")
		if (this.videoDownFin && this.audioDownFin && !this.videoQueue.pipingToSourceBuffer && !this.audioQueue.pipingToSourceBuffer) {
			console.log("Ending MediaSource stream");
			this.mse.endOfStream();
		}
	}

	fetchData() {
		//console.log("***************************************************** I'm HERE 6 *****************************************************")
		this.fetchVideoAdaptive();
		this.fetchAudio();
	}

	fetchVideoAdaptive() {
		//console.log("***************************************************** I'm HERE 7 *****************************************************")
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
		//console.log("***************************************************** I'm HERE 8 *****************************************************")
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
		//console.log("***************************************************** I'm HERE 9 *****************************************************")
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
		//console.log("***************************************************** I'm HERE 10 *****************************************************")
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
		//console.log("***************************************************** I'm HERE 11 *****************************************************")
		return (err) => {
			if (err) {
				console.log("Retrying in video init", err);
				return retryRequestCall();
			}
			
			var Time = this._inTime()
			
			this.videoMediaIndex++
			
			this.playerElement.addEventListener("waiting", () => {
					this.videoMediaIndex = Time-1
					this.playerElement.pause()
					console.log("Jump!!")
			})
			
			this.videoQueue.resetByteCounter();
			finishForThrottle();
			nextAction();
		}
	}

	retryRequest(requestCall) {
		//console.log("***************************************************** I'm HERE 12 *****************************************************")
		console.log(`Retrying request in ${this.retryTimer.time}`);
		setTimeout(requestCall, this.retryTimer.time);
		this.retryTimer.increase();
	}

	// Improves quality (if possible) if time to fetch information < 50% of buffer duration decreases (if possible) if greater than 75%
	_throttleQualityOnFeedback(fetchCall) {
		//console.log("***************************************************** I'm HERE 13 *****************************************************")
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

	_calcDuration(){
		//console.log("***************************************************** I'm HERE 14 *****************************************************")
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
	
	_inTime(){
		var current_time = this.playerElement.currentTime
		
		let videoRepresentation = this.videoSets["representations"][this.videoQualityIndex];
		let { timestamp_info } = videoRepresentation;
		
		let n = timestamp_info["media"].length
		
		for(let i=0; n-1>i; i++){
			let lower = timestamp_info["media"][i]["timecode"];
			let upper = timestamp_info["media"][i+1]["timecode"];
			if(current_time >= lower && current_time < upper){
				return i
			}
		}
		
	}
};

module.exports = Streaming;
