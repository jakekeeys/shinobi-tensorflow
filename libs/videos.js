var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config,lang){
    /**
     * Gets the video directory of the supplied video or monitor database row.
     * @constructor
     * @param {object} e - Monitor object or Video object. Object is a database row.
     */
    s.getVideoDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid};
        s.checkDetails(e)
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
        }else{
            return s.dir.videos+e.ke+'/'+e.id+'/';
        }
    }
    /**
     * Creates available API based URLs for streaming
     * @constructor
     * @param {object} videos - Array of video objects
     * @param {object} options - Contains middle parameter of URL and auth key
     * @param [options.auth] {string} - API Key
     * @param [options.videoParam] {string} - currently only `videos` and `cloudVideos` available.
     */
    s.buildVideoLinks = function(videos,options){
        videos.forEach(function(v){
            var details = s.parseJSON(v.details)
            var queryString = []
            if(details.isUTC === true){
                queryString.push('isUTC=true')
            }else{
                v.time = s.utcToLocal(v.time)
                v.end = s.utcToLocal(v.end)
            }
            if(queryString.length > 0){
                queryString = '?'+queryString.join('&')
            }else{
                queryString = ''
            }
            if(details.type === 'googd'){
                v.ext = v.ext ? v.ext : 'mp4'
                v.href = undefined
            }else if(!v.ext && v.href){
                v.ext = v.href.split('.')
                v.ext = v.ext[v.ext.length - 1]
            }
            v.filename = s.formattedTime(v.time)+'.'+v.ext;
            if(!options.videoParam)options.videoParam = 'videos'
            var href = s.checkCorrectPathEnding(config.webPaths.apiPrefix) + options.auth+'/'+options.videoParam+'/'+v.ke+'/'+v.mid+'/'+v.filename;
            v.actionUrl = href
            v.links = {
                deleteVideo : href+'/delete' + queryString,
                changeToUnread : href+'/status/1' + queryString,
                changeToRead : href+'/status/2' + queryString
            }
            if(!v.href || options.hideRemote === true)v.href = href + queryString
            v.details = details
        })
    }
    s.insertDatabaseRow = function(e,k,callback){
        s.checkDetails(e)
        //save database row
        if(!k.details)k.details = {}
        if(e.details && e.details.dir && e.details.dir !== ''){
            k.details.dir = e.details.dir
        }
        if(config.useUTC === true)k.details.isUTC = config.useUTC;
        s.knexQuery({
            action: "insert",
            table: "Videos",
            insert: {
                ke: e.ke,
                mid: e.mid,
                time: k.startTime,
                ext: e.ext,
                status: 1,
                details: s.s(k.details),
                size: k.filesize,
                end: k.endTime,
            }
        },(err) => {
            if(callback)callback(err)
            fs.chmod(k.dir+k.file,0o777,function(err){

            })
        })
    }
    //on video completion
    s.insertCompletedVideo = function(e,k,callback){
        //e = monitor object
        //k = video insertion object
        s.checkDetails(e)
        if(!k)k={};
        e.dir = s.getVideoDirectory(e)
        k.dir = e.dir.toString()
        if(s.group[e.ke].activeMonitors[e.id].childNode){
            s.cx({
                f: 'insertCompleted',
                d: s.group[e.ke].rawMonitorConfigurations[e.id],
                k: k
            },s.group[e.ke].activeMonitors[e.id].childNodeId);
        }else{
            //get file directory
            k.fileExists = fs.existsSync(k.dir+k.file)
            if(k.fileExists!==true){
                k.dir = s.dir.videos+'/'+e.ke+'/'+e.id+'/'
                k.fileExists = fs.existsSync(k.dir+k.file)
                if(k.fileExists !== true){
                    s.dir.addStorage.forEach(function(v){
                        if(k.fileExists !== true){
                            k.dir = s.checkCorrectPathEnding(v.path)+e.ke+'/'+e.id+'/'
                            k.fileExists = fs.existsSync(k.dir+k.file)
                        }
                    })
                }
            }
            if(k.fileExists===true){
                //close video row
                k.details = k.details && k.details instanceof Object ? k.details : {}
                k.stat = fs.statSync(k.dir+k.file)
                k.filesize = k.stat.size
                k.filesizeMB = parseFloat((k.filesize/1048576).toFixed(2))

                k.startTime = new Date(s.nameToTime(k.file))
                k.endTime = new Date(k.endTime || k.stat.mtime)
                if(config.useUTC === true){
                    fs.rename(k.dir+k.file, k.dir+s.formattedTime(k.startTime)+'.'+e.ext, (err) => {
                        if (err) return console.error(err);
                    });
                    k.filename = s.formattedTime(k.startTime)+'.'+e.ext
                }else{
                    k.filename = k.file
                }
                if(!e.ext){e.ext = k.filename.split('.')[1]}
                //send event for completed recording
                const response = {
                    mid: e.mid,
                    ke: e.ke,
                    filename: k.filename,
                    d: s.cleanMonitorObject(s.group[e.ke].rawMonitorConfigurations[e.id]),
                    filesize: k.filesize,
                    time: s.timeObject(k.startTime).format('YYYY-MM-DD HH:mm:ss'),
                    end: s.timeObject(k.endTime).format('YYYY-MM-DD HH:mm:ss')
                }
                if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
                    fs.createReadStream(k.dir+k.filename,{ highWaterMark: 500 })
                    .on('data',function(data){
                        s.cx(Object.assign(response,{
                            f:'created_file_chunk',
                            chunk: data,
                        }))
                    })
                    .on('close',function(){
                        clearTimeout(s.group[e.ke].activeMonitors[e.id].recordingChecker)
                        clearTimeout(s.group[e.ke].activeMonitors[e.id].streamChecker)
                        s.cx(Object.assign(response,{
                            f:'created_file',
                        }))
                    })
                }else{
                    var href = '/videos/'+e.ke+'/'+e.mid+'/'+k.filename
                    if(config.useUTC === true)href += '?isUTC=true';
                    const monitorEventsCounted = s.group[e.ke].activeMonitors[e.mid].detector_motion_count
                    s.txWithSubPermissions({
                        f: 'video_build_success',
                        hrefNoAuth: href,
                        filename: k.filename,
                        mid: e.mid,
                        ke: e.ke,
                        time: k.startTime,
                        size: k.filesize,
                        end: k.endTime,
                        events: monitorEventsCounted && monitorEventsCounted.length > 0 ? monitorEventsCounted : null
                    },'GRP_'+e.ke,'video_view')
                    //purge over max
                    s.purgeDiskForGroup(e.ke)
                    //send new diskUsage values
                    var storageIndex = s.getVideoStorageIndex(e)
                    if(storageIndex){
                        s.setDiskUsedForGroupAddStorage(e.ke,{
                            size: k.filesizeMB,
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(e.ke,k.filesizeMB)
                    }
                    s.onBeforeInsertCompletedVideoExtensions.forEach(function(extender){
                        extender(e,k)
                    })
                    s.insertDatabaseRow(e,k,callback)
                    s.insertCompletedVideoExtensions.forEach(function(extender){
                        extender(e,k,response)
                    })
                }
            }
        }
        s.group[e.ke].activeMonitors[e.mid].detector_motion_count = []
    }
    s.deleteVideo = function(e){
        //e = video object
        s.checkDetails(e)
        e.dir = s.getVideoDirectory(e)
        if(!e.filename && e.time){
            e.filename = s.formattedTime(e.time)
        }
        var filename,
            time
        if(e.filename.indexOf('.')>-1){
            filename = e.filename
        }else{
            filename = e.filename+'.'+e.ext
        }
        if(e.filename && !e.time){
            time = s.nameToTime(filename)
        }else{
            time = e.time
        }
        time = new Date(time)
        const whereQuery = {
            ke: e.ke,
            mid: e.id,
            time: time,
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Videos",
            where: whereQuery
        },(err,r) => {
            if(r && r[0]){
                r = r[0]
                fs.chmod(e.dir+filename,0o777,function(err){
                    s.tx({
                        f: 'video_delete',
                        filename: filename,
                        mid: e.id,
                        ke: e.ke,
                        time: s.nameToTime(filename),
                        end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                    },'GRP_'+e.ke);
                    var storageIndex = s.getVideoStorageIndex(e)
                    if(storageIndex){
                        s.setDiskUsedForGroupAddStorage(e.ke,{
                            size: -(r.size / 1048576),
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(e.ke,-(r.size / 1048576))
                    }
                    s.knexQuery({
                        action: "delete",
                        table: "Videos",
                        where: whereQuery
                    },(err) => {
                        if(err){
                            s.systemLog(lang['File Delete Error'] + ' : '+e.ke+' : '+' : '+e.id,err)
                        }
                    })
                    fs.unlink(e.dir+filename,function(err){
                        fs.stat(e.dir+filename,function(err){
                            if(!err){
                                s.file('delete',e.dir+filename)
                            }
                        })
                    })
                })
            }else{
                console.log(lang['Database row does not exist'],whereQuery)
            }
        })
    }
    s.deleteListOfVideos = function(videos){
        var deleteSetOfVideos = function(videos){
            const whereQuery = []
            var didOne = false;
            videos.forEach(function(video){
                s.checkDetails(video)
                //e = video object
                video.dir = s.getVideoDirectory(video)
                if(!video.filename && video.time){
                    video.filename = s.formattedTime(video.time)
                }
                var filename,
                    time
                if(video.filename.indexOf('.')>-1){
                    filename = video.filename
                }else{
                    filename = video.filename+'.'+video.ext
                }
                if(video.filename && !video.time){
                    time = s.nameToTime(filename)
                }else{
                    time = video.time
                }
                time = new Date(time)
                fs.chmod(video.dir + filename,0o777,function(err){
                    s.tx({
                        f: 'video_delete',
                        filename: filename,
                        mid: video.mid,
                        ke: video.ke,
                        time: s.nameToTime(filename),
                        end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                    },'GRP_'+video.ke);
                    var storageIndex = s.getVideoStorageIndex(video)
                    if(storageIndex){
                        s.setDiskUsedForGroupAddStorage(video.ke,{
                            size: -(video.size / 1048576),
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(video.ke,-(video.size / 1048576))
                    }
                    fs.unlink(video.dir + filename,function(err){
                        fs.stat(video.dir + filename,function(err){
                            if(!err){
                                s.file('delete',video.dir + filename)
                            }
                        })
                    })
                })
                const queryGroup = {
                    ke: video.ke,
                    mid: video.mid,
                    time: time,
                }
                if(whereQuery.length > 0)queryGroup.__separator = 'or'
                whereQuery.push(queryGroup)
            })
            s.knexQuery({
                action: "delete",
                table: "Videos",
                where: whereQuery
            },(err) => {
                if(err){
                    s.systemLog(lang['List of Videos Delete Error'],err)
                }
            })
        }
        videos.chunk(100).forEach(function(videosChunk){
            deleteSetOfVideos(videosChunk)
        })
    }
    s.deleteVideoFromCloudExtensions = {}
    s.deleteVideoFromCloudExtensionsRunner = function(e,storageType,video){
        // e = user
        if(!storageType){
            var videoDetails = JSON.parse(video.details)
            videoDetails.type = videoDetails.type || 's3'
        }
        if(s.deleteVideoFromCloudExtensions[storageType]){
            s.deleteVideoFromCloudExtensions[storageType](e,video,function(){
                s.tx({
                    f: 'video_delete_cloud',
                    mid: e.mid,
                    ke: e.ke,
                    time: e.time,
                    end: e.end
                },'GRP_'+e.ke);
            })
        }
    }
    s.deleteVideoFromCloud = function(e){
        // e = video object
        s.checkDetails(e)
        const whereQuery = {
            ke: e.ke,
            mid: e.mid,
            time: new Date(e.time),
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Cloud Videos",
            where: whereQuery
        },(err,r) => {
            if(r&&r[0]){
                r = r[0]
                var details = s.parseJSON(r.details) || {}
                s.knexQuery({
                    action: "delete",
                    table: "Cloud Videos",
                    where: whereQuery
                },(err) => {
                    s.deleteVideoFromCloudExtensionsRunner(e,details.type || 's3',r)
                })
            }else{
//                    console.log('Delete Failed',e)
//                    console.error(err)
            }
        })
    }
    s.orphanedVideoCheck = function(monitor,checkMax,callback,forceCheck){
        var finish = function(orphanedFilesCount){
            if(callback)callback(orphanedFilesCount)
        }
        if(forceCheck === true || config.insertOrphans === true){
            if(!checkMax){
                checkMax = config.orphanedVideoCheckMax || 2
            }

            var videosDirectory = s.getVideoDirectory(monitor)// + s.formattedTime(video.time) + '.' + video.ext
            fs.readdir(videosDirectory,function(err,files){
                if(files && files.length > 0){
                    var fiveRecentFiles = files.slice(files.length - checkMax,files.length)
                    var completedFile = 0
                    var orphanedFilesCount = 0
                    var fileComplete = function(){
                        ++completedFile
                        if(fiveRecentFiles.length === completedFile){
                            finish(orphanedFilesCount)
                        }
                    }
                    fiveRecentFiles.forEach(function(filename){
                        if(/T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]./.test(filename)){
                            fs.stat(videosDirectory + filename,(err,stats) => {
                                if(!err && stats.size > 10){
                                    s.knexQuery({
                                        action: "select",
                                        columns: "*",
                                        table: "Videos",
                                        where: [
                                            ['ke','=',monitor.ke],
                                            ['mid','=',monitor.mid],
                                            ['time','=',s.nameToTime(filename)],
                                        ],
                                        limit: 1
                                    },(err,rows) => {
                                        if(!err && (!rows || !rows[0])){
                                            ++orphanedFilesCount
                                            var video = rows[0]
                                            s.insertCompletedVideo(monitor,{
                                                file : filename
                                            },() => {
                                                fileComplete()
                                            })
                                        }else{
                                            fileComplete()
                                        }
                                    })
                                }
                            })
                        }
                    })
                }else{
                    finish()
                }
            })
        }else{
            finish()
        }
    }
    s.streamMp4FileOverHttp = function(filePath,req,res,pureStream){
        var ext = filePath.split('.')
        ext = ext[ext.length - 1]
        var total = fs.statSync(filePath).size;
        if (req.headers['range'] && !pureStream) {
            try{
                var range = req.headers.range;
                var parts = range.replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];
                var start = parseInt(partialstart, 10);
                var end = partialend ? parseInt(partialend, 10) : total-1;
                var chunksize = (end-start)+1;
                var file = fs.createReadStream(filePath, {start: start, end: end});
                req.headerWrite={ 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/'+ext }
                req.writeCode=206
            }catch(err){
                req.headerWrite={ 'Content-Length': total, 'Content-Type': 'video/'+ext};
                var file = fs.createReadStream(filePath)
                req.writeCode=200
            }
        } else {
            req.headerWrite={ 'Content-Length': total, 'Content-Type': 'video/'+ext};
            var file = fs.createReadStream(filePath)
            req.writeCode=200
        }
        if(req.query.downloadName){
            req.headerWrite['content-disposition']='attachment; filename="'+req.query.downloadName+'"';
        }
        res.writeHead(req.writeCode,req.headerWrite);
        file.on('close',function(){
            res.end()
        })
        file.pipe(res)
        return file
    }
    s.createVideoFromTimelapse = function(timelapseFrames,framesPerSecond,callback){
        framesPerSecond = parseInt(framesPerSecond)
        if(!framesPerSecond || isNaN(framesPerSecond))framesPerSecond = 2
        var frames = timelapseFrames.reverse()
        var ke = frames[0].ke
        var mid = frames[0].mid
        var finalFileName = frames[0].filename.split('.')[0] + '_' + frames[frames.length - 1].filename.split('.')[0] + `-${framesPerSecond}fps`
        var concatFiles = []
        var createLocation
        frames.forEach(function(frame,frameNumber){
            var selectedDate = frame.filename.split('T')[0]
            var fileLocationMid = `${frame.ke}/${frame.mid}_timelapse/${selectedDate}/`
            frame.details = s.parseJSON(frame.details)
            var fileLocation
            if(frame.details.dir){
                fileLocation = `${s.checkCorrectPathEnding(frame.details.dir)}`
            }else{
                fileLocation = `${s.dir.videos}`
            }
            fileLocation = `${fileLocation}${fileLocationMid}${frame.filename}`
            concatFiles.push(fileLocation)
            if(frameNumber === 0){
                createLocation = fileLocationMid
            }
        })
        if(concatFiles.length > framesPerSecond){
            var commandTempLocation = `${s.dir.streams}${ke}/${mid}/mergeJpegs_${finalFileName}.sh`
            var finalMp4OutputLocation = `${s.dir.fileBin}${ke}/${mid}/${finalFileName}.mp4`
            if(!s.group[ke].activeMonitors[mid].buildingTimelapseVideo){
                if(!fs.existsSync(finalMp4OutputLocation)){
                    var currentFile = 0
                    var completionTimeout
                    var commandString = `ffmpeg -y -f image2pipe -vcodec mjpeg -r ${framesPerSecond} -analyzeduration 10 -i - -q:v 1 -c:v libx264 -r ${framesPerSecond} "${finalMp4OutputLocation}"`
                    fs.writeFileSync(commandTempLocation,commandString)
                    var videoBuildProcess = spawn('sh',[commandTempLocation])
                    videoBuildProcess.stderr.on('data',function(data){
                        // console.log(data.toString())
                        clearTimeout(completionTimeout)
                        completionTimeout = setTimeout(function(){
                            if(currentFile === concatFiles.length - 1){
                                videoBuildProcess.kill('SIGTERM')
                            }
                        },4000)
                    })
                    videoBuildProcess.on('exit',function(data){
                        var timeNow = new Date()
                        var fileStats = fs.statSync(finalMp4OutputLocation)
                        var details = {}
                        s.knexQuery({
                            action: "insert",
                            table: "Files",
                            insert: {
                                ke: ke,
                                mid: mid,
                                details: s.s(details),
                                name: finalFileName + '.mp4',
                                size: fileStats.size,
                                time: timeNow,
                            }
                        })
                        s.setDiskUsedForGroup(ke,fileStats.size / 1048576,'fileBin')
                        fs.unlink(commandTempLocation,function(){

                        })
                        s.purgeDiskForGroup(ke)
                        setTimeout(() => {
                            delete(s.group[ke].activeMonitors[mid].buildingTimelapseVideo)
                        },5000)
                    })
                    var readFile = function(){
                        var filePath = concatFiles[currentFile]
                        // console.log(filePath,currentFile,'/',concatFiles.length - 1)
                        fs.readFile(filePath,function(err,buffer){
                            if(!err)videoBuildProcess.stdin.write(buffer)
                            if(currentFile === concatFiles.length - 1){
                                //is last

                            }else{
                                setTimeout(function(){
                                    ++currentFile
                                    readFile()
                                },1/framesPerSecond)
                            }
                        })
                    }
                    readFile()
                    s.group[ke].activeMonitors[mid].buildingTimelapseVideo = videoBuildProcess
                    callback({
                        ok: true,
                        fileExists: false,
                        fileLocation: finalMp4OutputLocation,
                        msg: lang['Started Building']
                    })
                }else{
                    callback({
                        ok: false,
                        fileExists: true,
                        filename: finalFileName + '.mp4',
                        fileLocation: finalMp4OutputLocation,
                        msg: lang['Already exists']
                    })
                }
            }else{
                callback({
                    ok: false,
                    fileExists: false,
                    fileLocation: finalMp4OutputLocation,
                    msg: lang.Building
                })
            }
        }else{
            callback({
                ok: false,
                fileExists: false,
                msg: lang.notEnoughFramesText1
            })
        }
    }
    s.getVideoStorageIndex = function(video){
        var details = s.parseJSON(video.details) || {}
        var storageId = details.storageId
        if(s.group[video.ke] && s.group[video.ke].activeMonitors[video.id] && s.group[video.ke].activeMonitors[video.id].addStorageId)storageId = s.group[video.ke].activeMonitors[video.id].addStorageId
        if(storageId){
            return s.group[video.ke].addStorageUse[storageId]
        }
        return null
    }
}
