var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
module.exports = function(s,config,lang){
    s.purgeDiskForGroup = function(e){
        if(config.cron.deleteOverMax === true && s.group[e.ke] && s.group[e.ke].sizePurgeQueue){
            s.group[e.ke].sizePurgeQueue.push(1)
            if(s.group[e.ke].sizePurging !== true){
                s.group[e.ke].sizePurging = true
                var finish = function(){
                    //remove value just used from queue
                    s.group[e.ke].sizePurgeQueue.shift()
                    //do next one
                    if(s.group[e.ke].sizePurgeQueue.length > 0){
                        checkQueue()
                    }else{
                        s.group[e.ke].sizePurging = false
                        s.sendDiskUsedAmountToClients(e)
                    }
                }
                var checkQueue = function(){
                    //get first in queue
                    var currentPurge = s.group[e.ke].sizePurgeQueue[0]
                    var reRunCheck = function(){}
                    var deleteSetOfVideos = function(err,videos,storageIndex,callback){
                        var completedCheck = 0
                        var whereQuery = [
                            ['ke','=',e.ke],
                            []
                        ]
                        if(videos){
                            var didOne = false
                            videos.forEach(function(video){
                                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                                var whereGroup
                                if(didOne){
                                    whereGroup = [
                                        ['or','mid','=',video.mid],
                                        ['time','=',video.time]
                                    ]
                                }else{
                                    didOne = false
                                    whereGroup = [
                                        ['mid','=',video.mid],
                                        ['time','=',video.time]
                                    ]
                                }
                                whereQuery[1].push(whereGroup)
                                fs.chmod(video.dir,0o777,function(err){
                                    fs.unlink(video.dir,function(err){
                                        ++completedCheck
                                        if(err){
                                            fs.stat(video.dir,function(err){
                                                if(!err){
                                                    s.file('delete',video.dir)
                                                }
                                            })
                                        }
                                        if(whereQuery[1].length > 0 && whereQuery[1].length === completedCheck){
                                            s.knexQuery({
                                                action: "delete",
                                                table: "Videos",
                                                where: whereQuery
                                            },() => {
                                                reRunCheck()
                                            })
                                        }
                                    })
                                })
                                if(storageIndex){
                                    s.setDiskUsedForGroupAddStorage(e,{
                                        size: -(video.size/1048576),
                                        storageIndex: storageIndex
                                    })
                                }else{
                                    s.setDiskUsedForGroup(e,-(video.size/1048576))
                                }
                                s.tx({
                                    f: 'video_delete',
                                    ff: 'over_max',
                                    filename: s.formattedTime(video.time)+'.'+video.ext,
                                    mid: video.mid,
                                    ke: video.ke,
                                    time: video.time,
                                    end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                                },'GRP_'+e.ke)
                            })
                        }else{
                            console.log(err)
                        }
                        if(whereQuery[1].length === 0){
                            if(callback)callback()
                        }
                    }
                    var deleteSetOfTimelapseFrames = function(err,frames,storageIndex,callback){
                        var whereQuery = [
                            ['ke','=',e.ke],
                            []
                        ]
                        var completedCheck = 0
                        if(frames){
                            var didOne = false
                            frames.forEach(function(frame){
                                var selectedDate = frame.filename.split('T')[0]
                                var dir = s.getTimelapseFrameDirectory(frame)
                                var fileLocationMid = `${dir}` + frame.filename
                                var whereGroup
                                if(didOne){
                                    whereGroup = [
                                        ['or','mid','=',frame.mid],
                                        ['time','=',frame.time]
                                    ]
                                }else{
                                    didOne = false
                                    whereGroup = [
                                        ['mid','=',frame.mid],
                                        ['time','=',frame.time]
                                    ]
                                }
                                whereQuery[1].push(whereGroup)
                                fs.unlink(fileLocationMid,function(err){
                                    ++completedCheck
                                    if(err){
                                        fs.stat(fileLocationMid,function(err){
                                            if(!err){
                                                s.file('delete',fileLocationMid)
                                            }
                                        })
                                    }
                                    if(whereQuery[1].length > 0 && whereQuery[1].length === completedCheck){
                                        s.knexQuery({
                                            action: "delete",
                                            table: "Timelapse Frames",
                                            where: whereQuery
                                        },() => {
                                            reRunCheck()
                                        })
                                    }
                                })
                                if(storageIndex){
                                    s.setDiskUsedForGroupAddStorage(e,{
                                        size: -(frame.size/1048576),
                                        storageIndex: storageIndex
                                    },'timelapeFrames')
                                }else{
                                    s.setDiskUsedForGroup(e,-(frame.size/1048576),'timelapeFrames')
                                }
                                // s.tx({
                                //     f: 'timelapse_frame_delete',
                                //     ff: 'over_max',
                                //     filename: s.formattedTime(video.time)+'.'+video.ext,
                                //     mid: video.mid,
                                //     ke: video.ke,
                                //     time: video.time,
                                //     end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                                // },'GRP_'+e.ke)
                            })
                        }else{
                            console.log(err)
                        }
                        if(whereQuery[1].length === 0){
                            if(callback)callback()
                        }
                    }
                    var deleteSetOfFileBinFiles = function(err,files,storageIndex,callback){
                        var whereQuery = [
                            ['ke','=',e.ke],
                            []
                        ]
                        var completedCheck = 0
                        if(files){
                            files.forEach(function(file){
                                var dir = s.getFileBinDirectory(file)
                                var fileLocationMid = `${dir}` + file.name
                                var whereGroup
                                if(didOne){
                                    whereGroup = [
                                        ['or','mid','=',file.mid],
                                        ['name','=',file.name]
                                    ]
                                }else{
                                    didOne = false
                                    whereGroup = [
                                        ['mid','=',file.mid],
                                        ['name','=',file.name]
                                    ]
                                }
                                whereQuery[1].push(whereGroup)
                                fs.unlink(fileLocationMid,function(err){
                                    ++completedCheck
                                    if(err){
                                        fs.stat(fileLocationMid,function(err){
                                            if(!err){
                                                s.file('delete',fileLocationMid)
                                            }
                                        })
                                    }
                                    if(whereQuery[1].length > 0 && whereQuery[1].length === completedCheck){
                                        s.knexQuery({
                                            action: "delete",
                                            table: "Files",
                                            where: whereQuery
                                        },() => {
                                            reRunCheck()
                                        })
                                    }
                                })
                                if(storageIndex){
                                    s.setDiskUsedForGroupAddStorage(e,{
                                        size: -(file.size/1048576),
                                        storageIndex: storageIndex
                                    },'fileBin')
                                }else{
                                    s.setDiskUsedForGroup(e,-(file.size/1048576),'fileBin')
                                }
                            })
                        }else{
                            console.log(err)
                        }
                        if(whereQuery[1].length === 0){
                            if(callback)callback()
                        }
                    }
                    var deleteMainVideos = function(callback){
                        reRunCheck = function(){
                            return deleteMainVideos(callback)
                        }
                        //run purge command
                        if(s.group[e.ke].usedSpaceVideos > (s.group[e.ke].sizeLimit * (s.group[e.ke].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)){
                            s.knexQuery({
                                action: "select",
                                columns: "*",
                                table: "Videos",
                                where: [
                                    ['ke','=',e.ke],
                                    ['status','!=','0'],
                                    ['details','NOT LIKE',`%"archived":"1"%`],
                                    ['details','NOT LIKE',`%"dir"%`],
                                ],
                                orderBy: ['time','asc'],
                                limit: 3
                            },(err,rows) => {
                                deleteSetOfVideos(err,rows,null,callback)
                            })
                        }else{
                            callback()
                        }
                    }
                    var deleteAddStorageVideos = function(callback){
                        reRunCheck = function(){
                            return deleteAddStorageVideos(callback)
                        }
                        var currentStorageNumber = 0
                        var readStorageArray = function(finishedReading){
                            setTimeout(function(){
                                reRunCheck = readStorageArray
                                var storage = s.listOfStorage[currentStorageNumber]
                                if(!storage){
                                    //done all checks, move on to next user
                                    callback()
                                    return
                                }
                                var storageId = storage.value
                                if(storageId === '' || !s.group[e.ke].addStorageUse[storageId]){
                                    ++currentStorageNumber
                                    readStorageArray()
                                    return
                                }
                                var storageIndex = s.group[e.ke].addStorageUse[storageId]
                                //run purge command
                                if(storageIndex.usedSpace > (storageIndex.sizeLimit * (storageIndex.deleteOffset || config.cron.deleteOverMaxOffset))){
                                    s.knexQuery({
                                        action: "select",
                                        columns: "*",
                                        table: "Videos",
                                        where: [
                                            ['ke','=',e.ke],
                                            ['status','!=','0'],
                                            ['details','NOT LIKE',`%"archived":"1"%`],
                                            ['details','LIKE',`%"dir":"${storage.value}"%`],
                                        ],
                                        orderBy: ['time','asc'],
                                        limit: 3
                                    },(err,rows) => {
                                        deleteSetOfVideos(err,rows,storageIndex,callback)
                                    })
                                }else{
                                    ++currentStorageNumber
                                    readStorageArray()
                                }
                            })
                        }
                        readStorageArray()
                    }
                    var deleteTimelapseFrames = function(callback){
                        reRunCheck = function(){
                            return deleteTimelapseFrames(callback)
                        }
                        //run purge command
                        if(s.group[e.ke].usedSpaceTimelapseFrames > (s.group[e.ke].sizeLimit * (s.group[e.ke].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset)){
                            s.knexQuery({
                                action: "select",
                                columns: "*",
                                table: "Timelapse Frames",
                                where: [
                                    ['ke','=',e.ke],
                                    ['details','NOT LIKE',`%"archived":"1"%`],
                                ],
                                orderBy: ['time','asc'],
                                limit: 3
                            },(err,frames) => {
                                deleteSetOfTimelapseFrames(err,frames,null,callback)
                            })
                        }else{
                            callback()
                        }
                    }
                    var deleteFileBinFiles = function(callback){
                        if(config.deleteFileBinsOverMax === true){
                            reRunCheck = function(){
                                return deleteSetOfFileBinFiles(callback)
                            }
                            //run purge command
                            if(s.group[e.ke].usedSpaceFileBin > (s.group[e.ke].sizeLimit * (s.group[e.ke].sizeLimitFileBinPercent / 100) * config.cron.deleteOverMaxOffset)){
                                s.knexQuery({
                                    action: "select",
                                    columns: "*",
                                    table: "Files",
                                    where: [
                                        ['ke','=',e.ke],
                                    ],
                                    orderBy: ['time','asc'],
                                    limit: 1
                                },(err,frames) => {
                                    deleteSetOfFileBinFiles(err,frames,null,callback)
                                })
                            }else{
                                callback()
                            }
                        }else{
                            callback()
                        }
                    }
                    deleteMainVideos(function(){
                        deleteTimelapseFrames(function(){
                            deleteFileBinFiles(function(){
                                deleteAddStorageVideos(function(){
                                    finish()
                                })
                            })
                        })
                    })
                }
                checkQueue()
            }
        }else{
            s.sendDiskUsedAmountToClients(e)
        }
    }
    s.setDiskUsedForGroup = function(e,bytes,storagePoint){
        //`bytes` will be used as the value to add or substract
        if(s.group[e.ke] && s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('set',bytes,storagePoint)
        }
    }
    s.setDiskUsedForGroupAddStorage = function(e,data,storagePoint){
        if(s.group[e.ke] && s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('setAddStorage',data,storagePoint)
        }
    }
    s.purgeCloudDiskForGroup = function(e,storageType,storagePoint){
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('purgeCloud',storageType,storagePoint)
        }
    }
    s.setCloudDiskUsedForGroup = function(e,usage,storagePoint){
        //`usage` will be used as the value to add or substract
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('setCloud',usage,storagePoint)
        }
    }
    s.sendDiskUsedAmountToClients = function(e){
        //send the amount used disk space to connected users
        if(s.group[e.ke]&&s.group[e.ke].init){
            s.tx({
                f: 'diskUsed',
                size: s.group[e.ke].usedSpace,
                usedSpace: s.group[e.ke].usedSpace,
                usedSpaceVideos: s.group[e.ke].usedSpaceVideos,
                usedSpaceFilebin: s.group[e.ke].usedSpaceFilebin,
                usedSpaceTimelapseFrames: s.group[e.ke].usedSpaceTimelapseFrames,
                limit: s.group[e.ke].sizeLimit,
                addStorage: s.group[e.ke].addStorageUse
            },'GRP_'+e.ke);
        }
    }
    //user log
    s.userLog = function(e,x){
        if(e.id && !e.mid)e.mid = e.id
        if(!x||!e.mid){return}
        if(
            (e.details && e.details.sqllog === '1') ||
            e.mid.indexOf('$') > -1
        ){
            s.knexQuery({
                action: "insert",
                table: "Logs",
                insert: {
                    ke: e.ke,
                    mid: e.mid,
                    info: s.s(x),
                }
            })
        }
        s.tx({f:'log',ke:e.ke,mid:e.mid,log:x,time:s.timeObject()},'GRPLOG_'+e.ke);
    }
    s.loadGroup = function(e){
        s.loadGroupExtensions.forEach(function(extender){
            extender(e)
        })
        if(!s.group[e.ke]){
            s.group[e.ke]={}
        }
        if(!s.group[e.ke].init){
            s.group[e.ke].init={}
        }
        if(!s.group[e.ke].addStorageUse){s.group[e.ke].addStorageUse={}};
        if(!s.group[e.ke].fileBin){s.group[e.ke].fileBin={}};
        if(!s.group[e.ke].users){s.group[e.ke].users={}}
        if(!s.group[e.ke].dashcamUsers){s.group[e.ke].dashcamUsers={}}
        if(!s.group[e.ke].sizePurgeQueue){s.group[e.ke].sizePurgeQueue=[]}
        if(!s.group[e.ke].addStorageUse){s.group[e.ke].addStorageUse = {}}
        if(!e.limit||e.limit===''){e.limit=10000}else{e.limit=parseFloat(e.limit)}
        //save global space limit for group key (mb)
        s.group[e.ke].sizeLimit = e.limit || s.group[e.ke].sizeLimit || 10000
        s.group[e.ke].sizeLimitVideoPercent = parseFloat(s.group[e.ke].init.size_video_percent) || 90
        s.group[e.ke].sizeLimitTimelapseFramesPercent = parseFloat(s.group[e.ke].init.size_timelapse_percent) || 5
        s.group[e.ke].sizeLimitFileBinPercent = parseFloat(s.group[e.ke].init.size_filebin_percent) || 5
        //save global used space as megabyte value
        s.group[e.ke].usedSpace = s.group[e.ke].usedSpace || ((e.size || 0) / 1048576)
        //emit the changes to connected users
        s.sendDiskUsedAmountToClients(e)
    }
    s.loadGroupApps = function(e){
        // e = user
        if(!s.group[e.ke].init){
            s.group[e.ke].init={};
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Users",
            where: [
                ['ke','=',e.ke],
                ['details','NOT LIKE',`%"sub"%`],
            ],
            limit: 1
        },(err,r) => {
            if(r && r[0]){
                r = r[0];
                const details = JSON.parse(r.details);
                //load extenders
                s.loadGroupAppExtensions.forEach(function(extender){
                    extender(r,details)
                })
                //disk Used Emitter
                if(!s.group[e.ke].diskUsedEmitter){
                    s.group[e.ke].diskUsedEmitter = new events.EventEmitter()
                    s.group[e.ke].diskUsedEmitter.on('setCloud',function(currentChange,storagePoint){
                        var amount = currentChange.amount
                        var storageType = currentChange.storageType
                        var cloudDisk = s.group[e.ke].cloudDiskUse[storageType]
                        //validate current values
                        if(!cloudDisk.usedSpace){
                            cloudDisk.usedSpace = 0
                        }else{
                            cloudDisk.usedSpace = parseFloat(cloudDisk.usedSpace)
                        }
                        if(cloudDisk.usedSpace < 0 || isNaN(cloudDisk.usedSpace)){
                            cloudDisk.usedSpace = 0
                        }
                        //change global size value
                        cloudDisk.usedSpace = cloudDisk.usedSpace + amount
                        switch(storagePoint){
                            case'timelapeFrames':
                                cloudDisk.usedSpaceTimelapseFrames += amount
                            break;
                            case'fileBin':
                                cloudDisk.usedSpaceFilebin += amount
                            break;
                            default:
                                cloudDisk.usedSpaceVideos += amount
                            break;
                        }
                    })
                    s.group[e.ke].diskUsedEmitter.on('purgeCloud',function(storageType,storagePoint){
                        if(config.cron.deleteOverMax === true){
                            var cloudDisk = s.group[e.ke].cloudDiskUse[storageType]
                            //set queue processor
                            var finish=function(){
                                // s.sendDiskUsedAmountToClients(e)
                            }
                            var deleteVideos = function(){
                                //run purge command
                                if(cloudDisk.sizeLimitCheck && cloudDisk.usedSpace > (cloudDisk.sizeLimit*config.cron.deleteOverMaxOffset)){
                                    s.knexQuery({
                                        action: "select",
                                        columns: "*",
                                        table: "Cloud Videos",
                                        where: [
                                            ['status','!=','0'],
                                            ['ke','=',e.ke],
                                            ['details','LIKE',`%"type":"${storageType}"%`],
                                        ],
                                        orderBy: ['time','asc'],
                                        limit: 2
                                    },function(err,videos) {
                                        if(!videos)return console.log(err)
                                        var whereQuery = [
                                            ['ke','=',e.ke],
                                            []
                                        ]
                                        var didOne = false
                                        videos.forEach(function(video){
                                            video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                                            var whereGroup
                                            if(didOne){
                                                whereGroup = [
                                                    ['or','mid','=',video.mid],
                                                    ['time','=',video.time]
                                                ]
                                            }else{
                                                didOne = false
                                                whereGroup = [
                                                    ['mid','=',video.mid],
                                                    ['time','=',video.time]
                                                ]
                                            }
                                            whereQuery[1].push(whereGroup)
                                            s.setCloudDiskUsedForGroup(e,{
                                                amount : -(video.size/1048576),
                                                storageType : storageType
                                            })
                                            s.deleteVideoFromCloudExtensionsRunner(e,storageType,video)
                                        })
                                        if(whereQuery[1].length > 0){
                                            s.knexQuery({
                                                action: "delete",
                                                table: "Cloud Videos",
                                                where: whereQuery
                                            },() => {
                                                deleteVideos()
                                            })
                                        }else{
                                            finish()
                                        }
                                    })
                                }else{
                                    finish()
                                }
                            }
                            var deleteTimelapseFrames = function(callback){
                                reRunCheck = function(){
                                    return deleteTimelapseFrames(callback)
                                }
                                //run purge command
                                if(cloudDisk.usedSpaceTimelapseFrames > (cloudDisk.sizeLimit * (s.group[e.ke].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset)){
                                    s.knexQuery({
                                        action: "select",
                                        columns: "*",
                                        table: "Cloud Timelapse Frames",
                                        where: [
                                            ['ke','=',e.ke],
                                            ['details','NOT LIKE',`%"archived":"1"%`],
                                        ],
                                        orderBy: ['time','asc'],
                                        limit: 3
                                    },(err,frames) => {
                                        if(!frames)return console.log(err)
                                        var whereQuery = [
                                            ['ke','=',e.ke],
                                            []
                                        ]
                                        frames.forEach(function(frame){
                                            frame.dir = s.getVideoDirectory(frame) + s.formattedTime(frame.time) + '.' + frame.ext
                                            var whereGroup
                                            if(didOne){
                                                whereGroup = [
                                                    ['or','mid','=',frame.mid],
                                                    ['time','=',frame.time]
                                                ]
                                            }else{
                                                didOne = false
                                                whereGroup = [
                                                    ['mid','=',frame.mid],
                                                    ['time','=',frame.time]
                                                ]
                                            }
                                            whereQuery[1].push(whereGroup)
                                            s.setCloudDiskUsedForGroup(e,{
                                                amount : -(frame.size/1048576),
                                                storageType : storageType
                                            })
                                            s.deleteVideoFromCloudExtensionsRunner(e,storageType,frame)
                                        })
                                        s.knexQuery({
                                            action: "delete",
                                            table: "Cloud Timelapse Frames",
                                            where: whereQuery
                                        },() => {
                                            deleteTimelapseFrames(callback)
                                        })
                                    })
                                }else{
                                    callback()
                                }
                            }
                            deleteVideos(function(){
                                deleteTimelapseFrames(function(){

                                })
                            })
                        }else{
                            // s.sendDiskUsedAmountToClients(e)
                        }
                    })
                    //s.setDiskUsedForGroup
                    s.group[e.ke].diskUsedEmitter.on('set',function(currentChange,storageType){
                        //validate current values
                        if(!s.group[e.ke].usedSpace){
                            s.group[e.ke].usedSpace=0
                        }else{
                            s.group[e.ke].usedSpace=parseFloat(s.group[e.ke].usedSpace)
                        }
                        if(s.group[e.ke].usedSpace<0||isNaN(s.group[e.ke].usedSpace)){
                            s.group[e.ke].usedSpace=0
                        }
                        //change global size value
                        s.group[e.ke].usedSpace += currentChange
                        switch(storageType){
                            case'timelapeFrames':
                                s.group[e.ke].usedSpaceTimelapseFrames += currentChange
                            break;
                            case'fileBin':
                                s.group[e.ke].usedSpaceFilebin += currentChange
                            break;
                            default:
                                s.group[e.ke].usedSpaceVideos += currentChange
                            break;
                        }
                        //remove value just used from queue
                        s.sendDiskUsedAmountToClients(e)
                    })
                    s.group[e.ke].diskUsedEmitter.on('setAddStorage',function(data,storageType){
                        var currentSize = data.size
                        var storageIndex = data.storageIndex
                        //validate current values
                        if(!storageIndex.usedSpace){
                            storageIndex.usedSpace = 0
                        }else{
                            storageIndex.usedSpace = parseFloat(storageIndex.usedSpace)
                        }
                        if(storageIndex.usedSpace < 0 || isNaN(storageIndex.usedSpace)){
                            storageIndex.usedSpace = 0
                        }
                        //change global size value
                        storageIndex.usedSpace += currentSize
                        switch(storageType){
                            case'timelapeFrames':
                                storageIndex.usedSpaceTimelapseFrames += currentSize
                            break;
                            case'fileBin':
                                storageIndex.usedSpaceFilebin += currentSize
                            break;
                            default:
                                storageIndex.usedSpaceVideos += currentSize
                            break;
                        }
                        //remove value just used from queue
                        s.sendDiskUsedAmountToClients(e)
                    })
                }
                Object.keys(details).forEach(function(v){
                    s.group[e.ke].init[v] = details[v]
                })
            }
        })
    }
    s.accountSettingsEdit = function(d,dontRunExtensions){
        s.knexQuery({
            action: "select",
            columns: "details",
            table: "Users",
            where: [
                ['ke','=',d.ke],
                ['uid','=',d.uid],
            ]
        },(err,r) => {
            if(r && r[0]){
                r = r[0];
                const details = JSON.parse(r.details);
                if(!details.sub || details.user_change !== "0"){
                    if(d.cnid){
                        if(details.get_server_log === '1'){
                            s.clientSocketConnection[d.cnid].join('GRPLOG_'+d.ke)
                        }else{
                            s.clientSocketConnection[d.cnid].leave('GRPLOG_'+d.ke)
                        }
                    }
                    ///unchangeable from client side, so reset them in case they did.
                    var form = d.form
                    var formDetails = JSON.parse(form.details)
                    if(!dontRunExtensions){
                        s.beforeAccountSaveExtensions.forEach(function(extender){
                            extender({
                                form: form,
                                formDetails: formDetails,
                                d: details
                            })
                        })
                    }
                    //admin permissions
                    formDetails.permissions = details.permissions
                    formDetails.edit_size = details.edit_size
                    formDetails.edit_days = details.edit_days
                    formDetails.use_admin = details.use_admin
                    formDetails.use_ldap = details.use_ldap
                    formDetails.landing_page = details.landing_page
                    //check
                    if(details.edit_days == "0"){
                        formDetails.days = details.days;
                    }
                    if(details.edit_size == "0"){
                        formDetails.size = details.size;
                        formDetails.addStorage = details.addStorage;
                    }
                    if(details.sub){
                        formDetails.sub = details.sub;
                        if(details.monitors){formDetails.monitors = details.monitors;}
                        if(details.allmonitors){formDetails.allmonitors = details.allmonitors;}
                        if(details.monitor_create){formDetails.monitor_create = details.monitor_create;}
                        if(details.video_delete){formDetails.video_delete = details.video_delete;}
                        if(details.video_view){formDetails.video_view = details.video_view;}
                        if(details.monitor_edit){formDetails.monitor_edit = details.monitor_edit;}
                        if(details.size){formDetails.size = details.size;}
                        if(details.days){formDetails.days = details.days;}
                        delete(formDetails.mon_groups)
                    }
                    var newSize = parseFloat(formDetails.size) || 10000
                    //load addStorageUse
                    var currentStorageNumber = 0
                    var readStorageArray = function(){
                        var storage = s.listOfStorage[currentStorageNumber]
                        if(!storage){
                            //done all checks, move on to next user
                            return
                        }
                        var path = storage.value
                        if(path === ''){
                            ++currentStorageNumber
                            readStorageArray()
                            return
                        }
                        var detailContainer = formDetails || s.group[r.ke].init
                        var storageId = path
                        var detailsContainerAddStorage = s.parseJSON(detailContainer.addStorage)
                        if(!s.group[d.ke].addStorageUse[storageId])s.group[d.ke].addStorageUse[storageId] = {}
                        var storageIndex = s.group[d.ke].addStorageUse[storageId]
                        storageIndex.name = storage.name
                        storageIndex.path = path
                        storageIndex.usedSpace = storageIndex.usedSpace || 0
                        if(detailsContainerAddStorage && detailsContainerAddStorage[path] && detailsContainerAddStorage[path].limit){
                            storageIndex.sizeLimit = parseFloat(detailsContainerAddStorage[path].limit)
                        }else{
                            storageIndex.sizeLimit = newSize
                        }
                    }
                    readStorageArray()
                    ///
                    formDetails = JSON.stringify(s.mergeDeep(details,formDetails))
                    ///
                    const updateQuery = {}
                    if(form.pass && form.pass !== ''){
                        form.pass = s.createHash(form.pass)
                    }else{
                        delete(form.pass)
                    }
                    delete(form.password_again)
                    Object.keys(form).forEach(function(key){
                        const value = form[key]
                        updateQuery[key] = value
                    })
                    s.knexQuery({
                        action: "update",
                        table: "Users",
                        update: updateQuery,
                        where: [
                            ['ke','=',d.ke],
                            ['uid','=',d.uid],
                        ]
                    },() => {
                        if(!details.sub){
                            var user = Object.assign(form,{ke : d.ke})
                            var userDetails = JSON.parse(formDetails)
                            s.group[d.ke].sizeLimit = parseFloat(newSize)
                            if(!dontRunExtensions){
                                s.onAccountSaveExtensions.forEach(function(extender){
                                    extender(s.group[d.ke],userDetails,user)
                                })
                                s.unloadGroupAppExtensions.forEach(function(extender){
                                    extender(user)
                                })
                                s.loadGroupApps(d)
                            }
                        }
                        if(d.cnid)s.tx({f:'user_settings_change',uid:d.uid,ke:d.ke,form:form},d.cnid)
                    })
                }
            }
        })
    }
    s.findPreset = function(presetQueryVals,callback){
        //presetQueryVals = [ke, type, name]
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Presets",
            where: [
                ['ke','=',presetQueryVals[0]],
                ['type','=',presetQueryVals[1]],
                ['name','=',presetQueryVals[2]],
            ],
            limit: 1
        },function(err,presets) {
            var preset
            var notFound = false
            if(presets && presets[0]){
                preset = presets[0]
                s.checkDetails(preset)
            }else{
                notFound = true
            }
            callback(notFound,preset)
        })
    }
    s.checkUserPurgeLock = function(groupKey){
        var userGroup = s.group[groupKey]
        if(s.group[groupKey].usedSpace > s.group[groupKey].sizeLimit){
            s.group[groupKey].sizePurgeQueue = []
            s.group[groupKey].sizePurging = false
            s.systemLog(lang.sizePurgeLockedText + ' : ' + groupKey)
            s.onStalePurgeLockExtensions.forEach(function(extender){
                extender(groupKey,s.group[groupKey].usedSpace,s.group[groupKey].sizeLimit)
            })
        }
    }
    if(config.cron.deleteOverMax === true){
        s.checkForStalePurgeLocks = function(){
            var doCheck = function(){
                Object.keys(s.group).forEach(function(groupKey){
                    s.checkUserPurgeLock(groupKey)
                })
            }
            clearTimeout(s.checkForStalePurgeLocksInterval)
            s.checkForStalePurgeLocksInterval = setInterval(function(){
                doCheck()
            },1000 * 60 * 60)
            doCheck()
        }
    }else{
        s.checkForStalePurgeLocks = function(){}
    }
}
