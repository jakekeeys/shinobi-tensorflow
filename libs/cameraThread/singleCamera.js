
const fs = require('fs')
const spawn = require('child_process').spawn
process.send = process.send || function () {};
// [CTRL] + [C] = exit
process.on('SIGINT', function() {
    if(cameraProcess && cameraProcess.kill)cameraProcess.kill(0)
});
process.on('exit', (code) => {
    if(cameraProcess && cameraProcess.kill)cameraProcess.kill(0)
});

if(!process.argv[2] || !process.argv[3]){
    return writeToStderr('Missing FFMPEG Command String or no command operator')
}
var jsonData = JSON.parse(fs.readFileSync(process.argv[3],'utf8'))
const ffmpegAbsolutePath = process.argv[2].trim()
const ffmpegCommandString = jsonData.cmd
const rawMonitorConfig = jsonData.rawMonitorConfig
const stdioPipes = jsonData.pipes || []
var newPipes = []
var stdioWriters = [];

var writeToStderr = function(text){
  try{
    stdioWriters[2].write(Buffer.from(`${text}`, 'utf8' ))
      // stdioWriters[2].write(Buffer.from(`${new Error('writeToStderr').stack}`, 'utf8' ))
  }catch(err){
    // fs.appendFileSync('/home/Shinobi/test.log',text + '\n','utf8')
  }
}
process.on('uncaughtException', function (err) {
    writeToStderr('Uncaught Exception occured!');
    writeToStderr(err.stack);
});

for(var i=0; i < stdioPipes; i++){
    switch(i){
      case 0:
        newPipes[i] = 0
      break;
      case 1:
        newPipes[i] = 1
      break;
      case 2:
        newPipes[i] = 2
      break;
      case 3:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
        if(rawMonitorConfig.details.detector === '1' && rawMonitorConfig.details.detector_pam === '1'){
          newPipes[i] = 'pipe'
        }else{
          newPipes[i] = stdioWriters[i]
        }
      break;
      case 5:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
        newPipes[i] = 'pipe'
      break;
      default:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
        newPipes[i] = stdioWriters[i]
      break;
    }
}
stdioWriters.forEach((writer)=>{
  writer.on('error', (err) => {
      writeToStderr(err.stack);
  });
})
writeToStderr(JSON.stringify(ffmpegCommandString))
var cameraProcess = spawn(ffmpegAbsolutePath,ffmpegCommandString,{detached: true,stdio:newPipes})
cameraProcess.on('close',()=>{
  writeToStderr('Process Closed')
  stdioWriters.forEach((writer)=>{
    writer.end()
  })
  process.exit();
})
cameraProcess.stdio[5].on('data',(data)=>{
    stdioWriters[5].write(data)
})
writeToStderr('Thread Opening')



if(rawMonitorConfig.details.detector === '1' && rawMonitorConfig.details.detector_pam === '1'){
  try{
    const attachPamDetector = require(__dirname + '/detector.js')(jsonData,stdioWriters[3])
    attachPamDetector(cameraProcess,(err)=>{
      writeToStderr(err)
    })
  }catch(err){
    writeToStderr(err.stack)
  }
}
