const { segment_creater } = require("easy_dash"); // call Prepairing Streaming video
source = "D:/Documents/Code/Streaming_2/master/easy_dash/test-folder/source" // your directory that has origin video
savevideo = "D:/Documents/Code/Streaming_2/master/easy_dash/test-folder/video/Polkka_rock" // your directory that want to save
fileoutname = "Polkka_rock" // your file name (origin and new one will have the same name)
var obj = segment_creater(source, savevideo, fileoutname)
obj.extract_video('640x360') // video's resolution that is created
obj.extract_video('320x180') // video's resolution that is created
obj.extract_video('160x90') // video's resolution that is created
obj.extract_audio() // audio that is created
