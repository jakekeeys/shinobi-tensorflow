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
            var didOne = false
            videos.forEach(function(video){
                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                if(didOne){
                    whereGroup.push(['or','mid','=',video.mid])
                }else{
                    didOne = true
                    whereGroup.push(['mid','=',video.mid])
                }
                whereGroup.push(['time','=',video.time])
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
                        const whereGroupLength = whereGroup.length / 2
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
            var didOne = false
            frames.forEach(function(frame){
                var selectedDate = frame.filename.split('T')[0]
                var dir = s.getTimelapseFrameDirectory(frame)
                var fileLocationMid = `${dir}` + frame.filename
                if(didOne){
                    whereGroup.push(
                        ['or','mid','=',frame.mid],
                        ['time','=',frame.time]
                    )
                }else{
                    didOne = true
                    whereGroup.push(
                        ['mid','=',frame.mid],
                        ['time','=',frame.time]
                    )
                }
                fs.unlink(fileLocationMid,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(fileLocationMid,function(err){
                            if(!err){
                                s.file('delete',fileLocationMid)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length / 2
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
        const frames = options.frames
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
                if(whereGroup.length !== 0){
                    whereGroup.push(
                        ['or','mid','=',file.mid],
                        ['name','=',file.name]
                    )
                }else{
                    whereGroup.push(
                        ['mid','=',file.mid],
                        ['name','=',file.name]
                    )
                }
                fs.unlink(fileLocationMid,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(fileLocationMid,function(err){
                            if(!err){
                                s.file('delete',fileLocationMid)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length / 2
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
                },(err,frames) => {
                    deleteSetOfFileBinFiles({
                        groupKey: groupKey,
                        err: err,
                        frames: frames,
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
    return {
        deleteSetOfVideos: deleteSetOfVideos,
        deleteSetOfTimelapseFrames: deleteSetOfTimelapseFrames,
        deleteSetOfFileBinFiles: deleteSetOfFileBinFiles,
        deleteAddStorageVideos: deleteAddStorageVideos,
        deleteMainVideos: deleteMainVideos,
        deleteTimelapseFrames: deleteTimelapseFrames,
        deleteFileBinFiles: deleteFileBinFiles,
    }
}
