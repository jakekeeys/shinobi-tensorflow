const fs = require('fs');
const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
module.exports = async (s,config,lang,onFinish) => {
    const {
        sanitizedFfmpegCommand,
        createPipeArray,
        splitForFFPMEG,
        checkForWindows,
        checkForUnix,
        checkStaticBuilds,
        checkVersion,
        checkHwAccelMethods,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const {
        buildMainInput,
        buildMainStream,
        buildJpegApiOutput,
        buildMainRecording,
        buildAudioDetector,
        buildMainDetector,
        buildEventRecordingOutput,
        buildTimelapseOutput,
    } = require('./ffmpeg/builders.js')(s,config,lang)
    if(config.ffmpegBinary)config.ffmpegDir = config.ffmpegBinary

    s.ffmpeg = function(e){
        const ffmpegCommand = [`-progress pipe:5`];
        ([
            buildMainInput(e),
            buildMainStream(e),
            buildJpegApiOutput(e),
            buildMainRecording(e),
            buildAudioDetector(e),
            buildMainDetector(e),
            buildEventRecordingOutput(e),
            buildTimelapseOutput(e),
        ]).forEach(function(commandStringPart){
            ffmpegCommand.push(commandStringPart)
        })
        s.onFfmpegCameraStringCreationExtensions.forEach(function(extender){
            extender(e,ffmpegCommand)
        })
        const stdioPipes = createPipeArray(e)
        const ffmpegCommandString = ffmpegCommand.join(' ')
        //hold ffmpeg command for log stream
        s.group[e.ke].activeMonitors[e.mid].ffmpeg = sanitizedFfmpegCommand(e,ffmpegCommandString)
        //clean the string of spatial impurities and split for spawn()
        const ffmpegCommandParsed = splitForFFPMEG(ffmpegCommandString)
        try{
            fs.unlinkSync(e.sdir + 'cmd.txt')
        }catch(err){

        }
        fs.writeFileSync(e.sdir + 'cmd.txt',JSON.stringify({
            cmd: ffmpegCommandParsed,
            pipes: stdioPipes.length,
            rawMonitorConfig: s.group[e.ke].rawMonitorConfigurations[e.id],
            globalInfo: {
                config: config,
                isAtleatOneDetectorPluginConnected: s.isAtleatOneDetectorPluginConnected
            }
        },null,3),'utf8')
        var cameraCommandParams = [
          './libs/cameraThread/singleCamera.js',
          config.ffmpegDir,
          e.sdir + 'cmd.txt'
        ]
        return spawn('node',cameraCommandParams,{detached: true,stdio: stdioPipes})
    }
    if(!config.ffmpegDir){
        if(s.isWin){
            const windowsCheck = checkForWindows()
            if(!windowsCheck.ok){
                const staticBuildCheck = await checkStaticBuilds()
                if(!staticBuildCheck.ok){
                    console.log(staticBuildCheck.msg)
                    console.log('No FFmpeg found.')
                }
            }
        }else{
            const staticBuildCheck = await checkStaticBuilds()
            if(!staticBuildCheck.ok){
                const unixCheck = checkForUnix()
                if(!unixCheck.ok){
                    console.log(staticBuildCheck.msg.join('\n'))
                    console.log(unixCheck.msg)
                    console.log('No FFmpeg found.')
                }
            }else if(staticBuildCheck.msg.length > 0){
                console.log(staticBuildCheck.msg.join('\n'))
            }
        }
    }
    checkVersion()
    checkHwAccelMethods()
    s.onFFmpegLoadedExtensions.forEach(function(extender){
        extender()
    })
    onFinish()
}
