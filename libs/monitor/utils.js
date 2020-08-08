var fs = require('fs');
module.exports = (s,config,lang) => {
    const getFileBinDirectory = (monitor) => {
        return s.dir.fileBin + monitor.ke + '/' + monitor.mid + '/'
    }
    const getStreamsDirectory = (monitor) => {
        return s.dir.streams + monitor.ke + '/' + monitor.mid + '/'
    }
    const initiateMonitorObject = (e) => {
        if(!s.group[e.ke]){s.group[e.ke]={}};
        if(!s.group[e.ke].activeMonitors){s.group[e.ke].activeMonitors={}}
        if(!s.group[e.ke].activeMonitors[e.mid]){s.group[e.ke].activeMonitors[e.mid]={}}
        if(!s.group[e.ke].activeMonitors[e.mid].streamIn){s.group[e.ke].activeMonitors[e.mid].streamIn={}};
        if(!s.group[e.ke].activeMonitors[e.mid].emitterChannel){s.group[e.ke].activeMonitors[e.mid].emitterChannel={}};
        if(!s.group[e.ke].activeMonitors[e.mid].mp4frag){s.group[e.ke].activeMonitors[e.mid].mp4frag={}};
        if(!s.group[e.ke].activeMonitors[e.mid].firstStreamChunk){s.group[e.ke].activeMonitors[e.mid].firstStreamChunk={}};
        if(!s.group[e.ke].activeMonitors[e.mid].contentWriter){s.group[e.ke].activeMonitors[e.mid].contentWriter={}};
        if(!s.group[e.ke].activeMonitors[e.mid].childNodeStreamWriters){s.group[e.ke].activeMonitors[e.mid].childNodeStreamWriters={}};
        if(!s.group[e.ke].activeMonitors[e.mid].eventBasedRecording){s.group[e.ke].activeMonitors[e.mid].eventBasedRecording={}};
        if(!s.group[e.ke].activeMonitors[e.mid].watch){s.group[e.ke].activeMonitors[e.mid].watch={}};
        if(!s.group[e.ke].activeMonitors[e.mid].fixingVideos){s.group[e.ke].activeMonitors[e.mid].fixingVideos={}};
        // if(!s.group[e.ke].activeMonitors[e.mid].viewerConnection){s.group[e.ke].activeMonitors[e.mid].viewerConnection={}};
        // if(!s.group[e.ke].activeMonitors[e.mid].viewerConnectionCount){s.group[e.ke].activeMonitors[e.mid].viewerConnectionCount=0};
        if(!s.group[e.ke].activeMonitors[e.mid].parsedObjects){s.group[e.ke].activeMonitors[e.mid].parsedObjects={}};
        if(!s.group[e.ke].activeMonitors[e.mid].detector_motion_count){s.group[e.ke].activeMonitors[e.mid].detector_motion_count=[]};
        if(!s.group[e.ke].activeMonitors[e.mid].eventsCounted){s.group[e.ke].activeMonitors[e.mid].eventsCounted = {}};
        if(!s.group[e.ke].activeMonitors[e.mid].isStarted){s.group[e.ke].activeMonitors[e.mid].isStarted = false};
        if(!s.group[e.ke].activeMonitors[e.mid].pipe4BufferPieces){s.group[e.ke].activeMonitors[e.mid].pipe4BufferPieces = []};
        if(s.group[e.ke].activeMonitors[e.mid].delete){clearTimeout(s.group[e.ke].activeMonitors[e.mid].delete)}
        if(!s.group[e.ke].rawMonitorConfigurations){s.group[e.ke].rawMonitorConfigurations={}}
        s.onMonitorInitExtensions.forEach(function(extender){
            extender(e)
        })
    }
    const sendMonitorStatus = function(e){
        s.group[e.ke].activeMonitors[e.id].monitorStatus = e.status
        s.tx(Object.assign(e,{f:'monitor_status'}),'GRP_'+e.ke)
    }
    const getMonitorCpuUsage = function(e,callback){
        if(s.group[e.ke].activeMonitors[e.mid] && s.group[e.ke].activeMonitors[e.mid].spawn){
            var getUsage = function(callback2){
                s.readFile("/proc/" + s.group[e.ke].activeMonitors[e.mid].spawn.pid + "/stat", function(err, data){
                    if(!err){
                        var elems = data.toString().split(' ');
                        var utime = parseInt(elems[13]);
                        var stime = parseInt(elems[14]);

                        callback2(utime + stime);
                    }else{
                        clearInterval(s.group[e.ke].activeMonitors[e.mid].getMonitorCpuUsage)
                    }
                })
            }
            getUsage(function(startTime){
                setTimeout(function(){
                    getUsage(function(endTime){
                        var delta = endTime - startTime;
                        var percentage = 100 * (delta / 10000);
                        callback(percentage)
                    });
                }, 1000)
            })
        }else{
            callback(0)
        }
    }
    const buildMonitorUrl = function(e,noPath){
        var authd = ''
        var url
        if(e.details.muser&&e.details.muser!==''&&e.host.indexOf('@')===-1) {
            e.username = e.details.muser
            e.password = e.details.mpass
            authd = e.details.muser+':'+e.details.mpass+'@'
        }
        if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
        url = e.protocol+'://'+authd+e.host+e.porty
        if(noPath !== true)url += e.path
        return url
    }
    const cleanMonitorObjectForDatabase = function(dirtyMonitor){
        var cleanMonitor = {}
        var acceptedFields = ['mid','ke','name','shto','shfr','details','type','ext','protocol','host','path','port','fps','mode','width','height']
        Object.keys(dirtyMonitor).forEach(function(key){
            if(acceptedFields.indexOf(key) > -1){
                cleanMonitor[key] = dirtyMonitor[key]
            }
        })
        return cleanMonitor
    }
    const cleanMonitorObject = function(e){
        x={keys:Object.keys(e),ar:{}};
        x.keys.forEach(function(v){
            if(v!=='last_frame'&&v!=='record'&&v!=='spawn'&&v!=='running'&&(v!=='time'&&typeof e[v]!=='function')){x.ar[v]=e[v];}
        });
        return x.ar;
    }
    const getRawSnapshotFromMonitor = function(monitor,options,callback){
        if(!callback){
            callback = options
            var options = {flags: ''}
        }
        s.checkDetails(monitor)
        var inputOptions = []
        var outputOptions = []
        var streamDir = s.dir.streams + monitor.ke + '/' + monitor.mid + '/'
        var url = options.url
        var secondsInward = options.secondsInward || '0'
        if(secondsInward.length === 1)secondsInward = '0' + secondsInward
        if(options.flags)outputOptions.push(options.flags)
        const checkExists = function(streamDir,callback){
            s.fileStats(streamDir,function(err){
                var response = false
                if(err){
                    // s.debugLog(err)
                }else{
                    response = true
                }
                callback(response)
            })
        }
        const noIconChecks = function(){
            const runExtraction = function(){
                var sendTempImage = function(){
                  fs.readFile(temporaryImageFile,function(err,buffer){
                     if(!err){
                       callback(buffer,false)
                     }
                     fs.unlink(temporaryImageFile,function(){})
                  })
                }
                try{
                    var snapBuffer = []
                    var temporaryImageFile = streamDir + s.gid(5) + '.jpg'
                    var iconImageFile = streamDir + 'icon.jpg'
                    var ffmpegCmd = s.splitForFFPMEG(`-loglevel warning -re -probesize 100000 -analyzeduration 100000 ${inputOptions.join(' ')} -i "${url}" ${outputOptions.join(' ')} -f image2 -an -vf "fps=1" -vframes 1 "${temporaryImageFile}"`)
                    fs.writeFileSync(s.group[monitor.ke].activeMonitors[monitor.id].sdir + 'snapCmd.txt',JSON.stringify({
                      cmd: ffmpegCmd,
                      temporaryImageFile: temporaryImageFile,
                      iconImageFile: iconImageFile,
                      useIcon: options.useIcon,
                      rawMonitorConfig: s.group[monitor.ke].rawMonitorConfigurations[monitor.mid],
                    },null,3),'utf8')
                    var cameraCommandParams = [
                      s.mainDirectory + '/libs/cameraThread/snapshot.js',
                      config.ffmpegDir,
                      s.group[monitor.ke].activeMonitors[monitor.id].sdir + 'snapCmd.txt'
                    ]
                    var snapProcess = spawn('node',cameraCommandParams,{detached: true})
                    snapProcess.stderr.on('data',function(data){
                        console.log(data.toString())
                    })
                    snapProcess.on('close',function(data){
                        clearTimeout(snapProcessTimeout)
                        sendTempImage()
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
                        },10000)
                    },30000)
                }catch(err){
                    console.log(err)
                }
            }
            if(url){
                runExtraction()
            }else{
                checkExists(streamDir + 's.jpg',function(success){
                    if(success === false){
                        checkExists(streamDir + 'detectorStream.m3u8',function(success){
                            if(success === false){
                                checkExists(streamDir + 's.m3u8',function(success){
                                    if(success === false){
                                        switch(monitor.type){
                                            case'h264':
                                                switch(monitor.protocol){
                                                    case'rtsp':
                                                        if(
                                                            monitor.details.rtsp_transport
                                                            && monitor.details.rtsp_transport !== ''
                                                            && monitor.details.rtsp_transport !== 'no'
                                                        ){
                                                            inputOptions.push('-rtsp_transport ' + monitor.details.rtsp_transport)
                                                        }
                                                    break;
                                                }
                                            break;
                                        }
                                        url = s.buildMonitorUrl(monitor)
                                    }else{
                                        outputOptions.push(`-ss 00:00:${secondsInward}`)
                                        url = streamDir + 's.m3u8'
                                    }
                                    runExtraction()
                                })
                            }else{
                                outputOptions.push(`-ss 00:00:${secondsInward}`)
                                url = streamDir + 'detectorStream.m3u8'
                                runExtraction()
                            }
                        })
                    }else{
                        s.readFile(streamDir + 's.jpg',function(err,snapBuffer){
                            callback(snapBuffer,true)
                        })
                    }
                })
            }
        }
        if(options.useIcon === true){
            checkExists(streamDir + 'icon.jpg',function(success){
                if(success === false){
                    noIconChecks()
                }else{
                    var snapBuffer = fs.readFileSync(streamDir + 'icon.jpg')
                    callback(snapBuffer,false)
                }
            })
        }else{
            noIconChecks()
        }
    }
    return {
        getFileBinDirectory: getFileBinDirectory,
        getStreamsDirectory: getStreamsDirectory,
        initiateMonitorObject: initiateMonitorObject,
        sendMonitorStatus: sendMonitorStatus,
        getMonitorCpuUsage: getMonitorCpuUsage,
        buildMonitorUrl: buildMonitorUrl,
        cleanMonitorObjectForDatabase: cleanMonitorObjectForDatabase,
        cleanMonitorObject: cleanMonitorObject,
        getRawSnapshotFromMonitor: getRawSnapshotFromMonitor,
    }
}
