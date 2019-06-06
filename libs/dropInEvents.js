var fs = require('fs')
var execSync = require('child_process').execSync
module.exports = function(s,config,lang,app,io){
    if(config.dropInEventServer === true){
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
            if(s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher){
                s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher.close()
                delete(s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher)
            }
            var monitorEventDropDir = getDropInEventDir(monitorConfig)
            if(fs.existsSync(monitorEventDropDir))execSync('rm -rf ' + monitorEventDropDir)
        }
        var onMonitorInit = function(monitorConfig){
            onMonitorStop(monitorConfig)
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var monitorEventDropDir = getDropInEventDir(monitorConfig)
            var groupEventDropDir = s.dir.dropInEvents + ke
            if(!fs.existsSync(groupEventDropDir)){
                fs.mkdirSync(groupEventDropDir)
            }
            var monitorEventDropDir = groupEventDropDir + '/' + mid + '/'
            if(!fs.existsSync(monitorEventDropDir)){
                fs.mkdirSync(monitorEventDropDir)
            }
            var fileQueue = {}
            s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventFileQueue = fileQueue
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
                            }
                        })
                    })
                }else{
                    if(search(filename,'.mp4')){
                        fs.stat(filePath,function(err,stats){
                            var startTime = stats.ctime
                            var endTime = stats.mtime
                            var shinobiFilename = s.formattedTime(startTime) + '.mp4'
                            var recordingPath = s.getVideoDirectory(monitorConfig) + shinobiFilename
                            var writeStream = fs.createWriteStream(recordingPath)
                            fs.createReadStream(filePath).pipe(writeStream)
                            writeStream.on('finish', () => {
                                s.insertCompletedVideo(s.group[monitorConfig.ke].mon_conf[monitorConfig.mid],{
                                    file : shinobiFilename
                                },function(){
                                })
                            })
                        })
                    }
                    s.triggerEvent({
                        id: mid,
                        ke: ke,
                        details: {
                            confidence: 100,
                            name: filename,
                            plug: "dropInEvent",
                            reason: "ftpServer"
                        }
                    })
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
                        files.forEach(function(filename){
                            processFile(filename)
                        })
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
                        },10000)
                    }
                })
            })
            s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher = directoryWatch
        }
        // FTP Server
        if(config.ftpServer === true){
            if(!config.ftpServerPort)config.ftpServerPort = 21
            if(!config.ftpServerUrl)config.ftpServerUrl = `ftp://0.0.0.0:${config.ftpServerPort}`
            config.ftpServerUrl = config.ftpServerUrl.replace('{{PORT}}',config.ftpServerPort)
            const FtpSrv = require('ftp-srv')
            const ftpServer = new FtpSrv({
                // log: {
                //     warn: function(){},
                //     info: function(){},
                //     child: function(){},
                //     error: function(){},
                //     trace: function(){},
                // },
                url: config.ftpServerUrl,
                // log:{trace:function(){},error:function(){},child:function(){},info:function(){},warn:function(){}
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
        var SMTPServer = require("smtp-server").SMTPServer;
        if(!config.smtpServerPort && (config.smtpServerSsl && config.smtpServerSsl.enabled !== false || config.ssl)){config.smtpServerPort = 465}else if(!config.smtpServerPort){config.smtpServerPort = 25}
        var smtpOptions = {
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
                if(s.group[ke].mon_conf[monitorId] && s.group[ke].mon[monitorId].isStarted === true){
                    s.triggerEvent({
                        id: monitorId,
                        ke: ke,
                        details: {
                            confidence: 100,
                            name: address.address,
                            plug: "dropInEvent",
                            reason: "smtpServer"
                        }
                    })
                }else{
                    return callback(new Error(lang['No Monitor Exists with this ID.']))
                }
                callback()
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
