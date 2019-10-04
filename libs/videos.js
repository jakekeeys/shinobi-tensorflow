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
            if(!v.ext && v.href){
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
        var save = [
            e.mid,
            e.ke,
            k.startTime,
            e.ext,
            1,
            s.s(k.details),
            k.filesize,
            k.endTime,
        ]
        s.sqlQuery('INSERT INTO Videos (mid,ke,time,ext,status,details,size,end) VALUES (?,?,?,?,?,?,?,?)',save,function(err){
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
            s.cx({f:'insertCompleted',d:s.group[e.ke].rawMonitorConfigurations[e.id],k:k},s.group[e.ke].activeMonitors[e.id].childNodeId);
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
                k.details = {}
                k.stat = fs.statSync(k.dir+k.file)
                k.filesize = k.stat.size
                k.filesizeMB = parseFloat((k.filesize/1000000).toFixed(2))

                k.startTime = new Date(s.nameToTime(k.file))
                k.endTime = new Date(k.stat.mtime)
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
                if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
                    fs.createReadStream(k.dir+k.filename,{ highWaterMark: 500 })
                    .on('data',function(data){
                        s.cx({
                            f:'created_file_chunk',
                            mid:e.mid,
                            ke:e.ke,
                            chunk:data,
                            filename:k.filename,
                            d:s.cleanMonitorObject(e),
                            filesize:e.filesize,
                            time:s.timeObject(k.startTime).format(),
                            end:s.timeObject(k.endTime).format()
                        })
                    })
                    .on('close',function(){
                        clearTimeout(s.group[e.ke].activeMonitors[e.id].recordingChecker)
                        clearTimeout(s.group[e.ke].activeMonitors[e.id].streamChecker)
                        s.cx({
                            f:'created_file',
                            mid:e.id,
                            ke:e.ke,
                            filename:k.filename,
                            d:s.cleanMonitorObject(e),
                            filesize:k.filesize,
                            time:s.timeObject(k.startTime).format(),
                            end:s.timeObject(k.endTime).format()
                        })
                    })
                }else{
                    var href = '/videos/'+e.ke+'/'+e.mid+'/'+k.filename
                    if(config.useUTC === true)href += '?isUTC=true';
                    s.txWithSubPermissions({
                        f:'video_build_success',
                        hrefNoAuth:href,
                        filename:k.filename,
                        mid:e.mid,
                        ke:e.ke,
                        time:k.startTime,
                        size:k.filesize,
                        end:k.endTime
                    },'GRP_'+e.ke,'video_view')
                    //purge over max
                    s.purgeDiskForGroup(e)
                    //send new diskUsage values
                    var storageIndex = s.getVideoStorageIndex(e)
                    if(storageIndex){
                        s.setDiskUsedForGroupAddStorage(e,{
                            size: k.filesizeMB,
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(e,k.filesizeMB)
                    }
                    s.onBeforeInsertCompletedVideoExtensions.forEach(function(extender){
                        extender(e,k)
                    })
                    s.insertDatabaseRow(e,k,callback)
                    s.insertCompletedVideoExtensions.forEach(function(extender){
                        extender(e,k)
                    })
                }
            }
        }
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
        var queryValues = [e.id,e.ke,time];
        s.sqlQuery('SELECT * FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?',queryValues,function(err,r){
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
                        s.setDiskUsedForGroupAddStorage(e,{
                            size: -(r.size / 1000000),
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(e,-(r.size / 1000000))
                    }
                    s.sqlQuery('DELETE FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?',queryValues,function(err){
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
                console.log(new Error())
                console.log(lang['Database row does not exist'],queryValues)
            }
        })
    }
    s.deleteListOfVideos = function(videos){
        var deleteSetOfVideos = function(videos){
            var query = 'DELETE FROM Videos WHERE '
            var videoQuery = []
            var queryValues = []
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
                fs.chmod(video.dir+filename,0o777,function(err){
                    s.tx({
                        f: 'video_delete',
                        filename: filename,
                        mid: video.id,
                        ke: video.ke,
                        time: s.nameToTime(filename),
                        end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                    },'GRP_'+video.ke);
                    var storageIndex = s.getVideoStorageIndex(video)
                    if(storageIndex){
                        s.setDiskUsedForGroupAddStorage(video,{
                            size: -(video.size / 1000000),
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(video,-(video.size / 1000000))
                    }
                    fs.unlink(video.dir+filename,function(err){
                        fs.stat(video.dir+filename,function(err){
                            if(!err){
                                s.file('delete',video.dir+filename)
                            }
                        })
                    })
                })
                videoQuery.push('(`mid`=? AND `ke`=? AND `time`=?)')
                queryValues = queryValues.concat([video.id,video.ke,time])
            })
            query += videoQuery.join(' OR ')
            s.sqlQuery(query,queryValues,function(err){
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
            var videoDetails = JSON.parse(r.details)
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
        var videoSelector = [e.id,e.ke,new Date(e.time)]
        s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE `mid`=? AND `ke`=? AND `time`=?',videoSelector,function(err,r){
            if(r&&r[0]){
                r = r[0]
                s.sqlQuery('DELETE FROM `Cloud Videos` WHERE `mid`=? AND `ke`=? AND `time`=?',videoSelector,function(){
                    s.deleteVideoFromCloudExtensionsRunner(e,r)
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
                            var queryValues = [
                                monitor.ke,
                                monitor.mid,
                                s.nameToTime(filename)
                            ]
                            s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND mid=? AND time=? LIMIT 1',queryValues,function(err,rows){
                                if(!err && (!rows || !rows[0])){
                                    ++orphanedFilesCount
                                    var video = rows[0]
                                    s.insertCompletedVideo(monitor,{
                                        file : filename
                                    },function(){
                                        fileComplete()
                                    })
                                }else{
                                    fileComplete()
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
    s.streamMp4FileOverHttp = function(filePath,req,res){
        var ext = filePath.split('.')
        ext = ext[ext.length - 1]
        var total = fs.statSync(filePath).size;
        if (req.headers['range']) {
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
        if(concatFiles.length > 30){
            var commandTempLocation = `${s.dir.streams}${ke}/${mid}/mergeJpegs_${finalFileName}.sh`
            var finalMp4OutputLocation = `${s.dir.fileBin}${ke}/${mid}/${finalFileName}.mp4`
            if(!s.group[ke].activeMonitors[mid].buildingTimelapseVideo){
                if(!fs.existsSync(finalMp4OutputLocation)){
                    var currentFile = 0
                    var completionTimeout
                    var commandString = `ffmpeg -y -pattern_type glob -f image2pipe -vcodec mjpeg -r ${framesPerSecond} -analyzeduration 10 -i - -q:v 1 -c:v libx264 -r ${framesPerSecond} "${finalMp4OutputLocation}"`
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
                        s.sqlQuery('INSERT INTO `Files` (ke,mid,details,name,size,time) VALUES (?,?,?,?,?,?)',[ke,mid,s.s(details),finalFileName + '.mp4',fileStats.size,timeNow])
                        s.setDiskUsedForGroup({ke: ke},fileStats.size / 1000000,'fileBin')
                        fs.unlink(commandTempLocation,function(){

                        })
                        delete(s.group[ke].activeMonitors[mid].buildingTimelapseVideo)
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
