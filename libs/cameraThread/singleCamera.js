
const fs = require('fs')
const spawn = require('child_process').spawn
const Mp4Frag = require('mp4frag');
// [CTRL] + [C] = exit
process.on('SIGINT', function() {
  cameraProcess.kill(0)
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
process.send = process.send || function (data) {
  writeToStderr('cant send data')
};
process.on('uncaughtException', function (err) {
    writeToStderr('Uncaught Exception occured!');
    writeToStderr(err.stack);
});

for(var i=0; i < stdioPipes - 1; i++){
    switch(i){
      case 0:
        newPipes[i] = 0
      break;
      case 1:
        if(rawMonitorConfig.details.stream_type === 'mp4'){
          stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
          newPipes[i] = 'pipe'
        }else{
          newPipes[i] = 1
        }
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
//last pipe will be used for misc data sent back to the main daemon
const lastPipeNumber = parseInt(`${stdioWriters.length}`)
stdioWriters[lastPipeNumber] = fs.createWriteStream(null, {fd: lastPipeNumber, end:false})
stdioWriters[lastPipeNumber + 1] = fs.createWriteStream(null, {fd: lastPipeNumber + 1, end:false})
//add error handlers for the `fs.createWriteStream` file descriptor pipes.
stdioWriters.forEach((writer)=>{
  writer.on('error', (err) => {
      writeToStderr(err.stack);
  });
})
// writeToStderr(JSON.stringify(ffmpegCommandString))
//spawn ffmpeg process
var cameraProcess = spawn(ffmpegAbsolutePath,ffmpegCommandString,{detached: true,stdio:newPipes})
//kill this script if associated ffmpeg process dies
cameraProcess.on('close',()=>{
  writeToStderr('Process Closed')
  stdioWriters.forEach((writer)=>{
    writer.end()
  })
  process.exit();
})
//pipe progress data `-progress pipe:5`
cameraProcess.stdio[5].on('data',(data)=>{
    stdioWriters[5].write(data)
})

// writeToStderr('Thread Opening')


// Detector is using Built-In
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

// Stream Type is Poseidon
if(rawMonitorConfig.details.stream_type === 'mp4'){
    var mainMp4FragmentProcessor = new Mp4Frag()
    mainMp4FragmentProcessor.on('error',function(error){
        writeToStderr(`Poesidon Error`)
    })
    cameraProcess.stdio[1].pipe(mainMp4FragmentProcessor,{ end: false })
    mainMp4FragmentProcessor.on('segment',function(data){
      stdioWriters[1].write(data)
    })
    mainMp4FragmentProcessor.on('initialized', onInitialized = ()=>{
      var checkForSegment = setInterval(function(){
        if(mainMp4FragmentProcessor.segment){
          mainMp4FragmentProcessor.removeListener('initialized', onInitialized)
          clearInterval(checkForSegment)
          stdioWriters[lastPipeNumber].write(Buffer.from(JSON.stringify({
            f: 'mp4FragInfo',
            mime: mainMp4FragmentProcessor.mime,
            initialization: mainMp4FragmentProcessor.initialization,
          })))
          stdioWriters[lastPipeNumber + 1].write(Buffer.from(mainMp4FragmentProcessor.segment))
        }
      },3000)
    })
 }
