(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
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

},{"./streaming":6,"./timer":7,"path":1}],4:[function(require,module,exports){
const path = require("path");

class ManifestParser {
	constructor(video_id) {
		this.video_id = video_id;
		//this.base_video_url = base_video_url;
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
			representationObj["url"] = path.join(  this.video_id, this.getUrl(representations[i])  )
			//representationObj["url"] = `${this.base_video_url}/${this.video_id}/${this.getUrl(representations[i])}`;

			let timestampPromise = new Promise((res, rej) => {
				
				//fetch(`${this.base_video_url}/${this.video_id}/${this.getUrl(representations[i])}.json`)
				fetch(   path.join(this.video_id, this.getUrl(representations[i])+".json")   )
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
				return children[i].textContent.split("\\").pop();
			}
		}
	}

	getJSONManifest() {
		return new Promise((resolve, reject) => {
			//fetch(`${this.base_video_url}/${this.video_id}/manifest.mpd`)
			fetch(  path.join(this.video_id, "manifest.mpd")  )
			.then((response) => response.text())
			.then((manifest_str) => (new window.DOMParser()).parseFromString(manifest_str, "text/xml"))
			.then((manifest) => {
				//console.log(manifest)
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

},{"path":1}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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

},{"./manifest-parser":4,"./queue":5,"./util":8}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}]},{},[3]);
