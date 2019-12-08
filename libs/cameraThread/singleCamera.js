
const fs = require('fs')
const spawn = require('child_process').spawn
try{
  fs.unlinkSync('/home/Shinobi/test.log')
}catch(err){

}
process.send = process.send || function () {};
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
const rawMonitorConfig = jsonData.rawMonitorConfig
const stdioPipes = jsonData.pipes || []
var newPipes = []
var stdioWriters = [];

var writeToStderr = function(text){
  if(!stdioWriters[2]){
      fs.appendFileSync('/home/Shinobi/test.log',text + '\n','utf8')
  }else{
      stdioWriters[2].write(Buffer.from(`${text}`, 'utf8' ))
      // stdioWriters[2].write(Buffer.from(`${new Error('writeToStderr').stack}`, 'utf8' ))
  }
}
process.on('uncaughtException', function (err) {
    writeToStderr('Uncaught Exception occured!');
    writeToStderr(err.stack);
});

for(var i=0; i < stdioPipes; i++){
    switch(i){
      case 3:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i});
        if(rawMonitorConfig.details.detector === '1' && rawMonitorConfig.details.detector_pam === '1'){
          newPipes[i] = 'pipe'
        }else{
          newPipes[i] = stdioWriters[i]
        }
      break;
      default:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i});
        newPipes[i] = stdioWriters[i]
      break;
    }
}
var cameraProcess = spawn(ffmpegAbsolutePath,ffmpegCommandString,{detached: true,stdio:newPipes})
cameraProcess.on('close',()=>{
  process.exit();
})
writeToStderr('------')
newPipes.forEach((pipe)=>{
  writeToStderr(typeof pipe)
  // writeToStderr(JSON.stringify(pipe,null,3))
})

setTimeout(()=>{
  if(rawMonitorConfig.details.detector === '1' && rawMonitorConfig.details.detector_pam === '1'){
    try{
      const attachPamDetector = require(__dirname + '/detector.js')(jsonData,stdioWriters[3])
      attachPamDetector(cameraProcess)
    }catch(err){
      writeToStderr(err.stack)
    }
  }
},3000)
