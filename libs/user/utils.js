var fs = require('fs');
module.exports = (s,config,lang) => {
    const deleteSetOfVideos = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const videos = options.videos
        const storageIndex = options.storageIndex
        const reRunCheck = options.reRunCheck
        var completedCheck = 0
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
        ]
        if(videos){
            videos.forEach(function(video){
                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                const queryGroup = {
                    mid: video.mid,
                    time: video.time,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
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
                        const whereGroupLength = whereGroup.length
                        if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                            whereQuery[1] = whereGroup
                            s.knexQuery({
                                action: "delete",
                                table: "Videos",
                                where: whereQuery
                            },(err,info) => {
                                setTimeout(reRunCheck,1000)
                            })
                        }
                    })
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(video.size/1048576),
                        storageIndex: storageIndex
                    })
                }else{
                    s.setDiskUsedForGroup(groupKey,-(video.size/1048576))
                }
                s.tx({
                    f: 'video_delete',
                    ff: 'over_max',
                    filename: s.formattedTime(video.time)+'.'+video.ext,
                    mid: video.mid,
                    ke: video.ke,
                    time: video.time,
                    end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                },'GRP_'+groupKey)
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteSetOfTimelapseFrames = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const frames = options.frames
        const storageIndex = options.storageIndex
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
            []
        ]
        var completedCheck = 0
        if(frames){
            frames.forEach(function(frame){
                const details = s.parseJSON(frame.details)
                var selectedDate = frame.filename.split('T')[0]
                var dir = s.getTimelapseFrameDirectory(frame)
                var timeFolder = s.formattedTime(new Date(frame.time),'YYYY-MM-DD')
                var fileLocationMid = `${dir}${timeFolder}/` + frame.filename
                const queryGroup = {
                    mid: frame.mid,
                    time: frame.time,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.unlink(fileLocationMid,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(fileLocationMid,function(err){
                            if(!err){
                                s.file('delete',fileLocationMid)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Timelapse Frames",
                            where: whereQuery
                        },() => {
                            deleteTimelapseFrames(groupKey,callback)
                        })
                    }
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(frame.size/1048576),
                        storageIndex: storageIndex
                    },'timelapeFrames')
                }else{
                    s.setDiskUsedForGroup(groupKey,-(frame.size/1048576),'timelapeFrames')
                }
                // s.tx({
                //     f: 'timelapse_frame_delete',
                //     ff: 'over_max',
                //     filename: s.formattedTime(video.time)+'.'+video.ext,
                //     mid: video.mid,
                //     ke: video.ke,
                //     time: video.time,
                //     end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                // },'GRP_'+groupKey)
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteSetOfFileBinFiles = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const files = options.files
        const storageIndex = options.storageIndex
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
            []
        ]
        var completedCheck = 0
        if(files){
            files.forEach(function(file){
                var dir = s.getFileBinDirectory(file)
                var fileLocationMid = `${dir}` + file.name
                const queryGroup = {
                    mid: file.mid,
                    name: file.name,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.unlink(fileLocationMid,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(fileLocationMid,function(err){
                            if(!err){
                                s.file('delete',fileLocationMid)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Files",
                            where: whereQuery
                        },() => {
                            deleteFileBinFiles(groupKey,callback)
                        })
                    }
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(file.size/1048576),
                        storageIndex: storageIndex
                    },'fileBin')
                }else{
                    s.setDiskUsedForGroup(groupKey,-(file.size/1048576),'fileBin')
                }
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteAddStorageVideos = function(groupKey,callback){
        reRunCheck = function(){
            s.debugLog('deleteAddStorageVideos')
            return deleteAddStorageVideos(groupKey,callback)
        }
        var currentStorageNumber = 0
        var readStorageArray = function(){
            setTimeout(function(){
                reRunCheck = readStorageArray
                var storage = s.listOfStorage[currentStorageNumber]
                if(!storage){
                    //done all checks, move on to next user
                    callback()
                    return
                }
                var storageId = storage.value
                if(storageId === '' || !s.group[groupKey].addStorageUse[storageId]){
                    ++currentStorageNumber
                    readStorageArray()
                    return
                }
                var storageIndex = s.group[groupKey].addStorageUse[storageId]
                //run purge command
                if(storageIndex.usedSpace > (storageIndex.sizeLimit * (storageIndex.deleteOffset || config.cron.deleteOverMaxOffset))){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Videos",
                        where: [
                            ['ke','=',groupKey],
                            ['status','!=','0'],
                            ['details','NOT LIKE',`%"archived":"1"%`],
                            ['details','LIKE',`%"dir":"${storage.value}"%`],
                        ],
                        orderBy: ['time','asc'],
                        limit: 3
                    },(err,rows) => {
                        deleteSetOfVideos({
                            groupKey: groupKey,
                            err: err,
                            videos: rows,
                            storageIndex: storageIndex,
                            reRunCheck: () => {
                                return readStorageArray()
                            }
                        },callback)
                    })
                }else{
                    ++currentStorageNumber
                    readStorageArray()
                }
            })
        }
        readStorageArray()
    }
    const deleteMainVideos = function(groupKey,callback){
        // //run purge command
        // s.debugLog('!!!!!!!!!!!deleteMainVideos')
        // s.debugLog('s.group[groupKey].usedSpaceVideos > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)')
        // s.debugLog(s.group[groupKey].usedSpaceVideos > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset))
        // s.debugLog('s.group[groupKey].usedSpaceVideos')
        // s.debugLog(s.group[groupKey].usedSpaceVideos)
        // s.debugLog('s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset')
        // s.debugLog(s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)
        // s.debugLog('s.group[groupKey].sizeLimitVideoPercent / 100')
        // s.debugLog(s.group[groupKey].sizeLimitVideoPercent / 100)
        // s.debugLog('s.group[groupKey].sizeLimit')
        // s.debugLog(s.group[groupKey].sizeLimit)
        if(s.group[groupKey].usedSpaceVideos > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Videos",
                where: [
                    ['ke','=',groupKey],
                    ['status','!=','0'],
                    ['details','NOT LIKE',`%"archived":"1"%`],
                    ['details','NOT LIKE',`%"dir"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,rows) => {
                deleteSetOfVideos({
                    groupKey: groupKey,
                    err: err,
                    videos: rows,
                    storageIndex: null,
                    reRunCheck: () => {
                        return deleteMainVideos(groupKey,callback)
                    }
                },callback)
            })
        }else{
            callback()
        }
    }
    const deleteTimelapseFrames = function(groupKey,callback){
        //run purge command
        if(s.group[groupKey].usedSpaceTimelapseFrames > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Timelapse Frames",
                where: [
                    ['ke','=',groupKey],
                    ['details','NOT LIKE',`%"archived":"1"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,frames) => {
                deleteSetOfTimelapseFrames({
                    groupKey: groupKey,
                    err: err,
                    frames: frames,
                    storageIndex: null
                },callback)
            })
        }else{
            callback()
        }
    }
    const deleteFileBinFiles = function(groupKey,callback){
        if(config.deleteFileBinsOverMax === true){
            //run purge command
            if(s.group[groupKey].usedSpaceFileBin > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitFileBinPercent / 100) * config.cron.deleteOverMaxOffset)){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Files",
                    where: [
                        ['ke','=',groupKey],
                    ],
                    orderBy: ['time','asc'],
                    limit: 1
                },(err,files) => {
                    deleteSetOfFileBinFiles({
                        groupKey: groupKey,
                        err: err,
                        files: files,
                        storageIndex: null
                    },callback)
                })
            }else{
                callback()
            }
        }else{
            callback()
        }
    }
    const deleteCloudVideos = function(groupKey,storageType,storagePoint,callback){
        const whereGroup = []
        const cloudDisk = s.group[groupKey].cloudDiskUse[storageType]
        //run purge command
        if(cloudDisk.sizeLimitCheck && cloudDisk.usedSpace > (cloudDisk.sizeLimit * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Videos",
                where: [
                    ['status','!=','0'],
                    ['ke','=',groupKey],
                    ['details','LIKE',`%"type":"${storageType}"%`],
                ],
                orderBy: ['time','asc'],
                limit: 2
            },function(err,videos) {
                if(!videos)return console.log(err)
                var whereQuery = [
                    ['ke','=',groupKey],
                ]
                var didOne = false
                videos.forEach(function(video){
                    video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                    const queryGroup = {
                        mid: video.mid,
                        time: video.time,
                    }
                    if(whereGroup.length > 0)queryGroup.__separator = 'or'
                    whereGroup.push(queryGroup)
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount : -(video.size/1048576),
                        storageType : storageType
                    })
                    s.deleteVideoFromCloudExtensionsRunner(groupKey,storageType,video)
                })
                const whereGroupLength = whereGroup.length
                if(whereGroupLength > 0){
                    whereQuery[1] = whereGroup
                    s.knexQuery({
                        action: "delete",
                        table: "Cloud Videos",
                        where: whereQuery
                    },() => {
                        deleteCloudVideos(groupKey,storageType,storagePoint,callback)
                    })
                }else{
                    callback()
                }
            })
        }else{
            callback()
        }
    }
    const deleteCloudTimelapseFrames = function(groupKey,storageType,storagePoint,callback){
        const whereGroup = []
        var cloudDisk = s.group[groupKey].cloudDiskUse[storageType]
        //run purge command
        if(cloudDisk.usedSpaceTimelapseFrames > (cloudDisk.sizeLimit * (s.group[groupKey].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Timelapse Frames",
                where: [
                    ['ke','=',groupKey],
                    ['details','NOT LIKE',`%"archived":"1"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,frames) => {
                if(!frames)return console.log(err)
                var whereQuery = [
                    ['ke','=',groupKey],
                ]
                frames.forEach(function(frame){
                    frame.dir = s.getVideoDirectory(frame) + s.formattedTime(frame.time) + '.' + frame.ext
                    const queryGroup = {
                        mid: frame.mid,
                        time: frame.time,
                    }
                    if(whereGroup.length > 0)queryGroup.__separator = 'or'
                    whereGroup.push(queryGroup)
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount : -(frame.size/1048576),
                        storageType : storageType
                    })
                    // s.deleteVideoFromCloudExtensionsRunner(groupKey,storageType,frame)
                })
                const whereGroupLength = whereGroup.length
                if(whereGroupLength > 0){
                    whereQuery[1] = whereGroup
                    s.knexQuery({
                        action: "delete",
                        table: "Cloud Timelapse Frames",
                        where: whereQuery
                    },() => {
                        deleteCloudTimelapseFrames(groupKey,storageType,storagePoint,callback)
                    })
                }else{
                    callback()
                }
            })
        }else{
            callback()
        }
    }
    return {
        deleteSetOfVideos: deleteSetOfVideos,
        deleteSetOfTimelapseFrames: deleteSetOfTimelapseFrames,
        deleteSetOfFileBinFiles: deleteSetOfFileBinFiles,
        deleteAddStorageVideos: deleteAddStorageVideos,
        deleteMainVideos: deleteMainVideos,
        deleteTimelapseFrames: deleteTimelapseFrames,
        deleteFileBinFiles: deleteFileBinFiles,
        deleteCloudVideos: deleteCloudVideos,
        deleteCloudTimelapseFrames: deleteCloudTimelapseFrames,
    }
}
