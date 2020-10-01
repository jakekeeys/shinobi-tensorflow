module.exports = (s,config,lang) => {
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
                s.coSpawnClose(e)
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
    return {
        cameraDestroy: cameraDestroy
    }
}
