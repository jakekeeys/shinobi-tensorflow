const fs = require('fs');
const treekill = require('tree-kill');
const spawn = require('child_process').spawn;
module.exports = (s,config,lang) => {
    const {
        splitForFFPMEG,
    } = require('../ffmpeg/utils.js')(s,config,lang)
    const cameraDestroy = function(e,p){
        if(
            s.group[e.ke] &&
            s.group[e.ke].activeMonitors[e.id] &&
            s.group[e.ke].activeMonitors[e.id].spawn !== undefined
        ){
            const activeMonitor = s.group[e.ke].activeMonitors[e.id];
            const proc = s.group[e.ke].activeMonitors[e.id].spawn;
            if(proc){
                activeMonitor.allowStdinWrite = false
                s.txToDashcamUsers({
                    f : 'disable_stream',
                    ke : e.ke,
                    mid : e.id
                },e.ke)
    //            if(activeMonitor.p2pStream){activeMonitor.p2pStream.unpipe();}
                try{
                    proc.removeListener('end',activeMonitor.spawn_exit);
                    proc.removeListener('exit',activeMonitor.spawn_exit);
                    delete(activeMonitor.spawn_exit);
                }catch(er){

                }
            }
            if(activeMonitor.audioDetector){
              activeMonitor.audioDetector.stop()
              delete(activeMonitor.audioDetector)
            }
            activeMonitor.firstStreamChunk = {}
            clearTimeout(activeMonitor.recordingChecker);
            delete(activeMonitor.recordingChecker);
            clearTimeout(activeMonitor.streamChecker);
            delete(activeMonitor.streamChecker);
            clearTimeout(activeMonitor.checkSnap);
            delete(activeMonitor.checkSnap);
            clearTimeout(activeMonitor.watchdog_stop);
            delete(activeMonitor.watchdog_stop);
            delete(activeMonitor.lastJpegDetectorFrame);
            delete(activeMonitor.detectorFrameSaveBuffer);
            clearTimeout(activeMonitor.recordingSnapper);
            clearInterval(activeMonitor.getMonitorCpuUsage);
            clearInterval(activeMonitor.objectCountIntervals);
            delete(activeMonitor.onvifConnection)
            if(activeMonitor.onChildNodeExit){
                activeMonitor.onChildNodeExit()
            }
            activeMonitor.spawn.stdio.forEach(function(stdio){
              try{
                stdio.unpipe()
              }catch(err){
                console.log(err)
              }
            })
            if(activeMonitor.mp4frag){
                var mp4FragChannels = Object.keys(activeMonitor.mp4frag)
                mp4FragChannels.forEach(function(channel){
                    activeMonitor.mp4frag[channel].removeAllListeners()
                    delete(activeMonitor.mp4frag[channel])
                })
            }
            if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
                s.cx({f:'clearCameraFromActiveList',ke:e.ke,id:e.id})
            }
            if(activeMonitor.childNode){
                s.cx({f:'kill',d:s.cleanMonitorObject(e)},activeMonitor.childNodeId)
            }else{
                if(proc && proc.kill){
                    if(s.isWin){
                        spawn("taskkill", ["/pid", proc.pid, '/t'])
                    }else{
                        proc.kill('SIGTERM')
                    }
                    setTimeout(function(){
                        try{
                            proc.kill()
                        }catch(err){
                            s.debugLog(err)
                        }
                    },1000)
                }
            }
        }
    }
    const createSnapshot = (options) => {
        const url = options.url
        const streamDir = options.streamDir || s.dir.streams
        const inputOptions = options.input || []
        const outputOptions = options.output || []
        return new Promise((resolve,reject) => {
            if(!url){
                resolve(null);
                return
            }
            const completeRequest = () => {
                fs.readFile(temporaryImageFile,(err,imageBuffer) => {
                    fs.unlink(temporaryImageFile,(err) => {
                        if(err){
                            s.debugLog(err)
                        }
                    })
                    if(err){
                        s.debugLog(err)
                    }
                    resolve(imageBuffer)
                })
            }
            const temporaryImageFile = streamDir + s.gid(5) + '.jpg'
            const ffmpegCmd = splitForFFPMEG(`-loglevel warning -re -probesize 100000 -analyzeduration 100000 ${inputOptions.join(' ')} -i "${url}" ${outputOptions.join(' ')} -f image2 -an -vf "fps=1" -vframes 1 "${temporaryImageFile}"`)
            const snapProcess = spawn('ffmpeg',ffmpegCmd,{detached: true})
            snapProcess.stderr.on('data',function(data){
                // s.debugLog(data.toString())
            })
            snapProcess.on('close',async function(data){
                clearTimeout(snapProcessTimeout)
                completeRequest()
            })
            var snapProcessTimeout = setTimeout(function(){
                var pid = snapProcess.pid
                if(s.isWin){
                    spawn("taskkill", ["/pid", pid, '/t'])
                }else{
                    process.kill(-pid, 'SIGTERM')
                }
                setTimeout(function(){
                    if(s.isWin === false){
                        treekill(pid)
                    }else{
                        snapProcess.kill()
                    }
                    completeRequest()
                },10000)
            },30000)
        })
    }
    const addCredentialsToStreamLink = (options) => {
        const streamUrl = options.url
        const username = options.username
        const password = options.password
        const urlParts = streamUrl.split('://')
        urlParts[0] = 'http'
        return ['rtsp','://',`${username}:${password}@`,urlParts[1]].join('')
    }
    const monitorConfigurationMigrator = (monitor) => {
        // converts the old style to the new style.
        const updatedFields = require('./updatedFields.js')()
        const fieldKeys = Object.keys(updatedFields)
        fieldKeys.forEach((oldKey) => {
            if(oldKey === 'details'){
                const detailKeys = Object.keys(updatedFields.details)
                detailKeys.forEach((oldKey) => {
                    if(oldKey === 'stream_channels'){
                        if(monitor.details.stream_channels){
                            const channelUpdates = updatedFields.details.stream_channels
                            const channelKeys = Object.keys(channelUpdates)
                            const streamChannels = s.parseJSON(monitor.details.stream_channels) || []
                            streamChannels.forEach(function(channel,number){
                                channelKeys.forEach((oldKey) => {
                                    const newKey = channelUpdates[oldKey]
                                    monitor.details.stream_channels[number][newKey] = streamChannels[number][oldKey]
                                    // delete(e.details.stream_channels[number][oldKey])
                                })
                            })
                        }
                    }else{
                        const newKey = updatedFields.details[oldKey]
                        monitor.details[newKey] = monitor.details[oldKey]
                        // delete(monitor.details[oldKey])
                    }
                })
            }else{
                const newKey = updatedFields[oldKey]
                monitor[newKey] = monitor[oldKey]
                // delete(monitor[oldKey])
            }
        })
    }
    return {
        cameraDestroy: cameraDestroy,
        createSnapshot: createSnapshot,
        addCredentialsToStreamLink: addCredentialsToStreamLink,
        monitorConfigurationMigrator: monitorConfigurationMigrator,
    }
}
