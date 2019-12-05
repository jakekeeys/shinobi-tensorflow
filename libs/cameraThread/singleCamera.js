
const fs = require('fs')
const spawn = require('child_process').spawn

process.send = process.send || function () {};
process.on('uncaughtException', function (err) {
    writeToStderr('Uncaught Exception occured!');
    writeToStderr(err.stack);
});
// [CTRL] + [C] = exit
process.on('SIGINT', function() {
  cameraProcess.kill('SIGTERM')
});

if(!process.argv[2] || !process.argv[3]){
    return writeToStderr('Missing FFMPEG Command String or no command operator')
}
var jsonData = JSON.parse(fs.readFileSync(process.argv[3],'utf8'))
const ffmpegAbsolutePath = process.argv[2].trim()
const ffmpegCommandString = jsonData.cmd
const mainDirectory = jsonData.mainDirectory
const rawMonitorConfig = jsonData.rawMonitorConfig
const stdioPipes = jsonData.pipes || []
var newPipes = []
var stdioWriters = [];
// var writeToStderr = function(text){
//   process.stderr.write(Buffer.from(text))
// }
fs.unlinkSync(rawMonitorConfig.sdir + '/errors.log')
var writeToStderr = function(text){
  fs.appendFileSync(rawMonitorConfig.sdir + '/errors.log',text + '\n','utf8')
}
for(var i=0; i < stdioPipes; i++){
    switch(i){
      case 3:
        newPipes.push('pipe')
        stdioWriters[i] = fs.createWriteStream(null, {fd: i});
      break;
      default:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i});
        newPipes.push(stdioWriters[i])
      break;
    }
}
var cameraProcess = spawn(ffmpegAbsolutePath,ffmpegCommandString,{detached: true,stdio:newPipes})
setTimeout(function(){
  writeToStderr('Start Process Now')
  try{
    const attachDetector = require(__dirname + '/detector.js')(jsonData,stdioWriters[3])
    attachDetector(cameraProcess)
  }catch(err){
    writeToStderr(err.stack)
  }
},3000)
