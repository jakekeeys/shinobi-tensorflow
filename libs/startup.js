
var fs = require('fs');
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
    var loadMonitors = function(callback){
        s.beforeMonitorsLoadedOnStartupExtensions.forEach(function(extender){
            extender()
        })
        s.systemLog(lang.startUpText4)
        //preliminary monitor start
        s.sqlQuery('SELECT * FROM Monitors', function(err,monitors) {
            if(err){s.systemLog(err)}
            if(monitors && monitors[0]){
                var loadCompleted = 0
                var orphanedVideosForMonitors = {}
                var loadMonitor = function(monitor){
                    if(!orphanedVideosForMonitors[monitor.ke])orphanedVideosForMonitors[monitor.ke] = {}
                    if(!orphanedVideosForMonitors[monitor.ke][monitor.mid])orphanedVideosForMonitors[monitor.ke][monitor.mid] = 0
                    s.initiateMonitorObject(monitor)
                    s.group[monitor.ke].mon_conf[monitor.mid] = monitor
                    s.sendMonitorStatus({id:monitor.mid,ke:monitor.ke,status:'Stopped'});
                    var monObj = Object.assign(monitor,{id : monitor.mid})
                    s.camera(monitor.mode,monObj)
                    s.orphanedVideoCheck(monitor,2,function(orphanedFilesCount){
                        if(orphanedFilesCount){
                            orphanedVideosForMonitors[monitor.ke][monitor.mid] += orphanedFilesCount
                        }
                        ++loadCompleted
                        if(monitors[loadCompleted]){
                            loadMonitor(monitors[loadCompleted])
                        }else{
                            s.systemLog(lang.startUpText6+' : '+s.s(orphanedVideosForMonitors))
                            callback()
                        }
                    })
                }
                loadMonitor(monitors[loadCompleted])
            }else{
                callback()
            }
        })
    }
    var loadDiskUseForUser = function(user,callback){
        s.systemLog(user.mail+' : '+lang.startUpText0)
        var userDetails = JSON.parse(user.details)
        user.size = 0
        user.limit = userDetails.size
        s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
            s.sqlQuery('SELECT * FROM `Timelapse Frames` WHERE ke=?',[user.ke],function(err,timelapseFrames){
                s.sqlQuery('SELECT * FROM `Files` WHERE ke=?',[user.ke],function(err,files){
                    var usedSpace = 0
                    if(videos && videos[0]){
                        videos.forEach(function(video){
                            video.details = s.parseJSON(video.details)
                            if(!video.details.dir){
                                usedSpace += video.size
                            }
                        })
                    }
                    if(timelapseFrames && timelapseFrames[0]){
                        timelapseFrames.forEach(function(frame){
                            usedSpace += frame.size
                        })
                    }
                    if(files && files[0]){
                        files.forEach(function(file){
                            usedSpace += file.size
                        })
                    }
                    s.group[user.ke].usedSpace = usedSpace / 1000000
                    loadAddStorageDiskUseForUser(user,videos,function(){
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
        s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
            if(videos && videos[0]){
                videos.forEach(function(video){
                    var storageType = JSON.parse(video.details).type
                    if(!storageType)storageType = 's3'
                    user.cloudDiskUse[storageType].usedSpace += (video.size /1000000)
                    ++user.cloudDiskUse[storageType].firstCount
                })
                s.cloudDisksLoaded.forEach(function(storageType){
                    var firstCount = user.cloudDiskUse[storageType].firstCount
                    s.systemLog(user.mail+' : '+lang.startUpText1+' : '+firstCount,storageType,user.cloudDiskUse[storageType].usedSpace)
                    delete(user.cloudDiskUse[storageType].firstCount)
                })
            }
            s.group[user.ke].cloudDiskUse = user.cloudDiskUse
            callback()
        })
    }
    var loadAddStorageDiskUseForUser = function(user,videos,callback){
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
            storageIndex.sizeLimit = parseFloat(storageData.limit) || parseFloat(user.limit) || 10000
            if(videos && videos[0]){
                videos.forEach(function(video){
                    if(video.details.dir === storage.value){
                        storageIndex.usedSpace += video.size
                    }
                })
                storageIndex.usedSpace = storageIndex.usedSpace / 1000000
            }
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
    //check disk space every 20 minutes
    if(config.autoDropCache===true){
        setInterval(function(){
            exec('echo 3 > /proc/sys/vm/drop_caches',{detached: true})
        },60000*20)
    }
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
    if(config.childNodes.mode !== 'child'){
        //sql/database connection with knex
        s.databaseEngine = require('knex')(s.databaseOptions)
        //run prerequsite queries
        s.preQueries()
        setTimeout(function(){
            checkForTerminalCommands(function(){
                //load administrators (groups)
                loadAdminUsers(function(){
                    //load monitors (for groups)
                    loadMonitors(function(){
                        s.processReady()
                    })
                })
            })
        },1500)
    }
}
