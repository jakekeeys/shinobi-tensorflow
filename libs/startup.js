
var fs = require('fs');
var request  = require('request');
var moment = require('moment');
var crypto = require('crypto');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,io){
    console.log('FFmpeg version : '+s.ffmpegVersion)
    console.log('Node.js version : '+process.version)
    s.processReady = function(){
        s.systemLog(lang.startUpText5)
        s.onProcessReadyExtensions.forEach(function(extender){
            extender(true)
        })
        process.send('ready')
    }
    var checkForTerminalCommands = function(callback){
        var next = function(){
            if(callback)callback()
        }
        if(!s.isWin && s.packageJson.mainDirectory !== '.'){
            var etcPath = '/etc/shinobisystems/cctv.txt'
            fs.stat(etcPath,function(err,stat){
                if(err || !stat){
                    exec('node '+ s.mainDirectory + '/INSTALL/terminalCommands.js',function(err){
                        if(err)console.log(err)
                    })
                }
                next()
            })
        }else{
            next()
        }
    }
    var loadedAccounts = []
    var foundMonitors = []
    var loadMonitors = function(callback){
        s.beforeMonitorsLoadedOnStartupExtensions.forEach(function(extender){
            extender()
        })
        s.systemLog(lang.startUpText4)
        //preliminary monitor start
        s.sqlQuery('SELECT * FROM Monitors', function(err,monitors) {
            foundMonitors = monitors
            if(err){s.systemLog(err)}
            if(monitors && monitors[0]){
                var loadCompleted = 0
                var orphanedVideosForMonitors = {}
                var loadMonitor = function(monitor){
                    setTimeout(function(){
                        if(!orphanedVideosForMonitors[monitor.ke])orphanedVideosForMonitors[monitor.ke] = {}
                        if(!orphanedVideosForMonitors[monitor.ke][monitor.mid])orphanedVideosForMonitors[monitor.ke][monitor.mid] = 0
                        s.initiateMonitorObject(monitor)
                        s.group[monitor.ke].rawMonitorConfigurations[monitor.mid] = monitor
                        s.sendMonitorStatus({id:monitor.mid,ke:monitor.ke,status:'Stopped'});
                        var monObj = Object.assign(monitor,{id : monitor.mid})
                        s.camera(monitor.mode,monObj)
                        ++loadCompleted
                        if(monitors[loadCompleted]){
                            loadMonitor(monitors[loadCompleted])
                        }else{
                            callback()
                        }
                    },2000)
                }
                loadMonitor(monitors[loadCompleted])
            }else{
                callback()
            }
        })
    }
    var checkForOrphanedVideos = function(callback){
        var monitors = foundMonitors
        if(monitors && monitors[0]){
            var loadCompleted = 0
            var orphanedVideosForMonitors = {}
            var checkForOrphanedVideosForMonitor = function(monitor){
                if(!orphanedVideosForMonitors[monitor.ke])orphanedVideosForMonitors[monitor.ke] = {}
                if(!orphanedVideosForMonitors[monitor.ke][monitor.mid])orphanedVideosForMonitors[monitor.ke][monitor.mid] = 0
                s.orphanedVideoCheck(monitor,null,function(orphanedFilesCount){
                    if(orphanedFilesCount){
                        orphanedVideosForMonitors[monitor.ke][monitor.mid] += orphanedFilesCount
                    }
                    ++loadCompleted
                    if(monitors[loadCompleted]){
                        checkForOrphanedVideosForMonitor(monitors[loadCompleted])
                    }else{
                        s.systemLog(lang.startUpText6+' : '+s.s(orphanedVideosForMonitors))
                        delete(foundMonitors)
                        callback()
                    }
                })
            }
            checkForOrphanedVideosForMonitor(monitors[loadCompleted])
        }else{
            callback()
        }
    }
    var loadDiskUseForUser = function(user,callback){
        s.systemLog(user.mail+' : '+lang.startUpText0)
        var userDetails = JSON.parse(user.details)
        s.group[user.ke].sizeLimit = parseFloat(userDetails.size) || 10000
        s.group[user.ke].sizeLimitVideoPercent = parseFloat(userDetails.size_video_percent) || 90
        s.group[user.ke].sizeLimitTimelapseFramesPercent = parseFloat(userDetails.size_timelapse_percent) || 10
        s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
            s.sqlQuery('SELECT * FROM `Timelapse Frames` WHERE ke=?',[user.ke],function(err,timelapseFrames){
                s.sqlQuery('SELECT * FROM `Files` WHERE ke=?',[user.ke],function(err,files){
                    var usedSpaceVideos = 0
                    var usedSpaceTimelapseFrames = 0
                    var usedSpaceFilebin = 0
                    var addStorageData = {
                        files: [],
                        videos: [],
                        timelapeFrames: [],
                    }
                    if(videos && videos[0]){
                        videos.forEach(function(video){
                            video.details = s.parseJSON(video.details)
                            if(!video.details.dir){
                                usedSpaceVideos += video.size
                            }else{
                                addStorageData.videos.push(video)
                            }
                        })
                    }
                    if(timelapseFrames && timelapseFrames[0]){
                        timelapseFrames.forEach(function(frame){
                            frame.details = s.parseJSON(frame.details)
                            if(!frame.details.dir){
                                usedSpaceTimelapseFrames += frame.size
                            }else{
                                addStorageData.timelapeFrames.push(frame)
                            }
                        })
                    }
                    if(files && files[0]){
                        files.forEach(function(file){
                            file.details = s.parseJSON(file.details)
                            if(!file.details.dir){
                                usedSpaceFilebin += file.size
                            }else{
                                addStorageData.files.push(file)
                            }
                        })
                    }
                    s.group[user.ke].usedSpace = (usedSpaceVideos + usedSpaceTimelapseFrames + usedSpaceFilebin) / 1000000
                    s.group[user.ke].usedSpaceVideos = usedSpaceVideos / 1000000
                    s.group[user.ke].usedSpaceFilebin = usedSpaceFilebin / 1000000
                    s.group[user.ke].usedSpaceTimelapseFrames = usedSpaceTimelapseFrames / 1000000
                    loadAddStorageDiskUseForUser(user,addStorageData,function(){
                        callback()
                    })
                })
            })
        })
    }
    var loadCloudDiskUseForUser = function(user,callback){
        var userDetails = JSON.parse(user.details)
        user.cloudDiskUse = {}
        user.size = 0
        user.limit = userDetails.size
        s.cloudDisksLoaded.forEach(function(storageType){
            user.cloudDiskUse[storageType] = {
                usedSpace : 0,
                firstCount : 0
            }
            if(s.cloudDiskUseStartupExtensions[storageType])s.cloudDiskUseStartupExtensions[storageType](user,userDetails)
        })
        var loadCloudVideos = function(callback){
            s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
                if(videos && videos[0]){
                    videos.forEach(function(video){
                        var storageType = JSON.parse(video.details).type
                        if(!storageType)storageType = 's3'
                        var videoSize = video.size / 1000000
                        user.cloudDiskUse[storageType].usedSpace += videoSize
                        user.cloudDiskUse[storageType].usedSpaceVideos += videoSize
                        ++user.cloudDiskUse[storageType].firstCount
                    })
                    s.cloudDisksLoaded.forEach(function(storageType){
                        var firstCount = user.cloudDiskUse[storageType].firstCount
                        s.systemLog(user.mail+' : '+lang.startUpText1+' : '+firstCount,storageType,user.cloudDiskUse[storageType].usedSpace)
                        delete(user.cloudDiskUse[storageType].firstCount)
                    })
                }
                callback()
            })
        }
        var loadCloudTimelapseFrames = function(callback){
            s.sqlQuery('SELECT * FROM `Cloud Timelapse Frames` WHERE ke=?',[user.ke],function(err,frames){
                if(frames && frames[0]){
                    frames.forEach(function(frame){
                        var storageType = JSON.parse(frame.details).type
                        if(!storageType)storageType = 's3'
                        var frameSize = frame.size / 1000000
                        user.cloudDiskUse[storageType].usedSpace += frameSize
                        user.cloudDiskUse[storageType].usedSpaceTimelapseFrames += frameSize
                    })
                }
                callback()
            })
        }
        loadCloudVideos(function(){
            loadCloudTimelapseFrames(function(){
                s.group[user.ke].cloudDiskUse = user.cloudDiskUse
                callback()
            })
        })
    }
    var loadAddStorageDiskUseForUser = function(user,data,callback){
        var videos = data.videos
        var timelapseFrames = data.timelapseFrames
        var files = data.files
        var userDetails = JSON.parse(user.details)
        var userAddStorageData = s.parseJSON(userDetails.addStorage) || {}
        var currentStorageNumber = 0
        var readStorageArray = function(){
            var storage = s.listOfStorage[currentStorageNumber]
            if(!storage){
                //done all checks, move on to next user
                callback()
                return
            }
            var path = storage.value
            if(path === ''){
                ++currentStorageNumber
                readStorageArray()
                return
            }
            var storageId = path
            var storageData = userAddStorageData[storageId] || {}
            if(!s.group[user.ke].addStorageUse[storageId])s.group[user.ke].addStorageUse[storageId] = {}
            var storageIndex = s.group[user.ke].addStorageUse[storageId]
            storageIndex.name = storage.name
            storageIndex.path = path
            storageIndex.usedSpace = 0
            storageIndex.sizeLimit = parseFloat(storageData.limit) || parseFloat(userDetails.size) || 10000
            var usedSpaceVideos = 0
            var usedSpaceTimelapseFrames = 0
            var usedSpaceFilebin = 0
            if(videos && videos[0]){
                videos.forEach(function(video){
                    if(video.details.dir === storage.value){
                        usedSpaceVideos += video.size
                    }
                })
            }
            if(timelapseFrames && timelapseFrames[0]){
                timelapseFrames.forEach(function(frame){
                    if(video.details.dir === storage.value){
                        usedSpaceTimelapseFrames += frame.size
                    }
                })
            }
            if(files && files[0]){
                files.forEach(function(file){
                    if(video.details.dir === storage.value){
                        usedSpaceFilebin += file.size
                    }
                })
            }
            storageIndex.usedSpace = (usedSpaceVideos + usedSpaceTimelapseFrames + usedSpaceFilebin) / 1000000
            storageIndex.usedSpaceVideos = usedSpaceVideos / 1000000
            storageIndex.usedSpaceFilebin = usedSpaceFilebin / 1000000
            storageIndex.usedSpaceTimelapseFrames = usedSpaceTimelapseFrames / 1000000
            s.systemLog(user.mail+' : '+path+' : '+videos.length,storageIndex.usedSpace)
            ++currentStorageNumber
            readStorageArray()
        }
        readStorageArray()
    }
    var loadAdminUsers = function(callback){
        //get current disk used for each isolated account (admin user) on startup
        s.sqlQuery('SELECT * FROM Users WHERE details NOT LIKE ?',['%"sub"%'],function(err,users){
            if(users && users[0]){
                var loadLocalDiskUse = function(callback){
                    var count = users.length
                    var countFinished = 0
                    users.forEach(function(user){
                        s.loadGroup(user)
                        s.loadGroupApps(user)
                        loadedAccounts.push(user.ke)
                        loadDiskUseForUser(user,function(){
                            ++countFinished
                            if(countFinished === count){
                                callback()
                            }
                        })
                    })
                }
                var loadCloudDiskUse = function(callback){
                    var count = users.length
                    var countFinished = 0
                    users.forEach(function(user){
                        loadCloudDiskUseForUser(user,function(){
                            ++countFinished
                            if(countFinished === count){
                                callback()
                            }
                        })
                    })
                }
                loadLocalDiskUse(function(){
                    loadCloudDiskUse(function(){
                        callback()
                    })
                })
            }else{
                s.processReady()
            }
        })
    }
    config.userHasSubscribed = false
    var checkSubscription = function(callback){
        var subscriptionFailed = function(){
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.error('This Install of Shinobi is NOT Activated')
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            s.systemLog('This Install of Shinobi is NOT Activated')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log('https://licenses.shinobi.video/subscribe')
        }
        if(config.subscriptionId){
            var url = 'https://licenses.shinobi.video/subscribe/check?subscriptionId=' + config.subscriptionId
            request(url,{
                method: 'GET',
                timeout: 30000
            }, function(err,resp,body){
                var json = s.parseJSON(body)
                if(err)console.log(err,json)
                var hasSubcribed = !!json.ok
                config.userHasSubscribed = hasSubcribed
                callback(hasSubcribed)
                if(config.userHasSubscribed){
                    s.systemLog('This Install of Shinobi is Activated')
                }else{
                    subscriptionFailed()
                }
            })
        }else{
            subscriptionFailed()
            callback(false)
        }
    }
    //check disk space every 20 minutes
    if(config.autoDropCache===true){
        setInterval(function(){
            exec('echo 3 > /proc/sys/vm/drop_caches',{detached: true})
        },60000*20)
    }
    if(config.childNodes.mode !== 'child'){
        //master node - startup functions
        setInterval(function(){
            s.cpuUsage(function(cpu){
                s.ramUsage(function(ram){
                    s.tx({f:'os',cpu:cpu,ram:ram},'CPU');
                })
            })
        },10000)
        //hourly check to see if sizePurge has failed to unlock
        //checks to see if request count is the number of monitors + 10
        s.checkForStalePurgeLocks()
        //run prerequsite queries, load users and monitors
        //sql/database connection with knex
        s.databaseEngine = require('knex')(s.databaseOptions)
        //run prerequsite queries
        s.preQueries()
        setTimeout(function(){
            //check for subscription
            checkSubscription(function(){
                //check terminal commander
                checkForTerminalCommands(function(){
                    //load administrators (groups)
                    loadAdminUsers(function(){
                        //load monitors (for groups)
                        loadMonitors(function(){
                            //check for orphaned videos
                            checkForOrphanedVideos(function(){
                                s.processReady()
                            })
                        })
                    })
                })
            })
        },1500)
    }
}
