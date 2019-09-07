var fs = require('fs')
module.exports = function(s,config,lang,app,io){
    if(config.dropInEventServer === true){
        if(config.dropInEventForceSaveEvent === undefined)config.dropInEventForceSaveEvent = true
        if(config.dropInEventDeleteFileAfterTrigger === undefined)config.dropInEventDeleteFileAfterTrigger = true
        var beforeMonitorsLoadedOnStartup = function(){
            if(!config.dropInEventsDir){
                config.dropInEventsDir = s.dir.streams + 'dropInEvents/'
            }
            s.dir.dropInEvents = s.checkCorrectPathEnding(config.dropInEventsDir)
            //dropInEvents dir
            if(!fs.existsSync(s.dir.dropInEvents)){
                fs.mkdirSync(s.dir.dropInEvents)
            }
        }
        var getDropInEventDir = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var groupEventDropDir = s.dir.dropInEvents + ke
            var monitorEventDropDir = groupEventDropDir + '/' + mid + '/'
            return monitorEventDropDir
        }
        var onMonitorStop = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            if(s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher){
                s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher.close()
                delete(s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher)
                var monitorEventDropDir = getDropInEventDir(monitorConfig)
                s.file('deleteFolder',monitorEventDropDir + '*')
            }
        }
        var createDropInEventDirectory = function(e,callback){
            var directory = s.dir.dropInEvents + e.ke + '/'
            fs.mkdir(directory,function(err){
                s.handleFolderError(err)
                directory = s.dir.dropInEvents + e.ke + '/' + (e.id || e.mid) + '/'
                fs.mkdir(directory,function(err){
                    s.handleFolderError(err)
                    callback(err,directory)
                })
            })
        }
        var onMonitorInit = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var groupEventDropDir = s.dir.dropInEvents + ke
            createDropInEventDirectory(monitorConfig,function(err,monitorEventDropDir){
                var monitorEventDropDir = getDropInEventDir(monitorConfig)
                var fileQueue = {}
                s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventFileQueue = fileQueue
                var search = function(searchIn,searchFor){
                    return searchIn.indexOf(searchFor) > -1
                }
                var processFile = function(filename){
                    var filePath = monitorEventDropDir + filename
                    if(search(filename,'.jpg') || search(filename,'.jpeg')){
                        var snapPath = s.dir.streams + ke + '/' + mid + '/s.jpg'
                        fs.unlink(snapPath,function(err){
                            fs.createReadStream(filePath).pipe(fs.createWriteStream(snapPath))
                            s.triggerEvent({
                                id: mid,
                                ke: ke,
                                details: {
                                    confidence: 100,
                                    name: filename,
                                    plug: "dropInEvent",
                                    reason: "ftpServer"
                                },
                            },config.dropInEventForceSaveEvent)
                        })
                    }else{
                        var reason = "ftpServer"
                        if(search(filename,'.mp4')){
                            fs.stat(filePath,function(err,stats){
                                var startTime = stats.ctime
                                var endTime = stats.mtime
                                var shinobiFilename = s.formattedTime(startTime) + '.mp4'
                                var recordingPath = s.getVideoDirectory(monitorConfig) + shinobiFilename
                                var writeStream = fs.createWriteStream(recordingPath)
                                fs.createReadStream(filePath).pipe(writeStream)
                                writeStream.on('finish', () => {
                                    s.insertCompletedVideo(s.group[monitorConfig.ke].rawMonitorConfigurations[monitorConfig.mid],{
                                        file : shinobiFilename
                                    },function(){
                                    })
                                })
                            })
                        }
                        var completeAction = function(){
                            s.triggerEvent({
                                id: mid,
                                ke: ke,
                                details: {
                                    confidence: 100,
                                    name: filename,
                                    plug: "dropInEvent",
                                    reason: reason
                                }
                            },config.dropInEventForceSaveEvent)
                        }
                        if(search(filename,'.txt')){
                            fs.readFile(filePath,{encoding: 'utf-8'},function(err,data){
                                if(data){
                                    reason = data.split('\n')[0] || filename
                                }else if(filename){
                                    reason = filename
                                }
                                completeAction()
                            })
                        }else{
                            completeAction()
                        }

                    }
                    if(config.dropInEventDeleteFileAfterTrigger){
                        setTimeout(function(){
                            fs.unlink(filePath,function(err){

                            })
                        },1000 * 60 * 5)
                    }
                }
                var eventTrigger = function(eventType,filename,stats){
                    if(stats.isDirectory()){
                        fs.readdir(monitorEventDropDir + filename,function(err,files){
                            if(files){
                                files.forEach(function(filename){
                                    processFile(filename)
                                })
                            }else if(err){
                                console.log(err)
                            }
                        })
                    }else{
                        processFile(filename)
                    }
                }
                var directoryWatch = fs.watch(monitorEventDropDir,function(eventType,filename){
                    fs.stat(monitorEventDropDir + filename,function(err,stats){
                        if(!err){
                            clearTimeout(fileQueue[filename])
                            fileQueue[filename] = setTimeout(function(){
                                eventTrigger(eventType,filename,stats)
                            },1750)
                        }
                    })
                })
                s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher = directoryWatch
            })
        }
        // FTP Server
        if(config.ftpServer === true){
            if(!config.ftpServerPort)config.ftpServerPort = 21
            if(!config.ftpServerUrl)config.ftpServerUrl = `ftp://0.0.0.0:${config.ftpServerPort}`
            config.ftpServerUrl = config.ftpServerUrl.replace('{{PORT}}',config.ftpServerPort)
            const FtpSrv = require('ftp-srv')
            const ftpServer = new FtpSrv({
                url: config.ftpServerUrl,
            })

            ftpServer.on('login', (data, resolve, reject) => {
                var username = data.username
                var password = data.password
                s.basicOrApiAuthentication(username,password,function(err,user){
                    if(user){
                        resolve({root: s.dir.dropInEvents + user.ke})
                    }else{
                        // reject(new Error('Failed Authorization'))
                    }
                })
            })
            ftpServer.on('client-error', ({connection, context, error}) => {
                console.log('error')
            })
            ftpServer.listen().then(() => {
                s.systemLog(`FTP Server running on port ${config.ftpServerPort}...`)
            }).catch(function(err){
                s.systemLog(err)
            })
        }
        //add extensions
        s.beforeMonitorsLoadedOnStartup(beforeMonitorsLoadedOnStartup)
        s.onMonitorInit(onMonitorInit)
        s.onMonitorStop(onMonitorStop)
    }
    // SMTP Server
    // allow starting SMTP server without dropInEventServer
    if(config.smtpServer === true){
        if(config.smtpServerHideStartTls === undefined)config.smtpServerHideStartTls = null
        var SMTPServer = require("smtp-server").SMTPServer;
        if(!config.smtpServerPort && (config.smtpServerSsl && config.smtpServerSsl.enabled !== false || config.ssl)){config.smtpServerPort = 465}else if(!config.smtpServerPort){config.smtpServerPort = 25}
        var smtpOptions = {
            hideSTARTTLS: config.smtpServerHideStartTls,
            onAuth(auth, session, callback) {
                var username = auth.username
                var password = auth.password
                s.basicOrApiAuthentication(username,password,function(err,user){
                    if(user){
                        callback(null, {user: user.ke})
                    }else{
                        callback(new Error(lang.failedLoginText2))
                    }
                })
            },
            onRcptTo(address, session, callback) {
                var split = address.address.split('@')
                var monitorId = split[0]
                var ke = session.user
                if(s.group[ke].rawMonitorConfigurations[monitorId] && s.group[ke].activeMonitors[monitorId].isStarted === true){
                    session.monitorId = monitorId
                }else{
                    return callback(new Error(lang['No Monitor Exists with this ID.']))
                }
                callback()
            },
            onData(stream, session, callback) {
                if(session.monitorId){
                    var ke = session.user
                    var monitorId = session.monitorId
                    var reasonTag = 'smtpServer'
                    var text = ''
                    stream.on('data',function(data){
                        text += data.toString()
                    }) // print message to console
                    stream.on("end", function(){
                        var contentPart = text.split('--PartBoundary12345678')
                        contentPart.forEach(function(part){
                            var parsed = {}
                            var lines = part.split(/\r?\n/)
                            lines.forEach(function(line,n){
                                var pieces = line.split(':')
                                if(pieces[1]){
                                    var nextLine = lines[n + 1]
                                    var keyName = pieces[0].trim().toLowerCase()
                                    pieces.shift()
                                    var parsedValue = pieces.join(':')
                                    parsed[keyName] = parsedValue
                                }
                            })
                            if(parsed['content-type'] && parsed['content-type'].indexOf('image/jpeg') > -1){
                                // console.log(lines)
                            }
                            if(parsed['alarm event']){
                                reasonTag = parsed['alarm event']
                            }else if(parsed.subject){
                                reasonTag = parsed.subject
                            }
                        })
                        s.triggerEvent({
                            id: monitorId,
                            ke: ke,
                            details: {
                                confidence: 100,
                                name: 'smtpServer',
                                plug: "dropInEvent",
                                reason: reasonTag
                            }
                        },config.dropInEventForceSaveEvent)
                        callback()
                    })
                }else{
                    callback()
                }
            }
        }
        if(config.smtpServerSsl && config.smtpServerSsl.enabled !== false || config.ssl && config.ssl.cert && config.ssl.key){
            var key = config.ssl.key || fs.readFileSync(config.smtpServerSsl.key)
            var cert = config.ssl.cert || fs.readFileSync(config.smtpServerSsl.cert)
            smtpOptions = Object.assign(smtpOptions,{
                secure: true,
                key: config.ssl.key,
                cert: config.ssl.cert
            })
        }
        var server = new SMTPServer(smtpOptions)
        server.listen(config.smtpServerPort,function(){
            s.systemLog(`SMTP Server running on port ${config.smtpServerPort}...`)
        })
    }
}
