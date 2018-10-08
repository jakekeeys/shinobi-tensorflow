var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config,lang){
    s.getVideoDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid};
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
        }else{
            return s.dir.videos+e.ke+'/'+e.id+'/';
        }
    }
    s.buildVideoLinks = function(videos,options){
        videos.forEach(function(v){
            var details = JSON.parse(v.details)
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
            var href = '/'+options.auth+'/'+options.videoParam+'/'+v.ke+'/'+v.mid+'/'+v.filename;
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
    //extender for "s.insertCompletedVideo"
    s.insertCompletedVideoExtensions = []
    s.insertCompletedVideoExtender = function(callback){
        s.insertCompletedVideoExtensions.push(callback)
    }
    //on video completion
    s.insertCompletedVideo = function(e,k,callback){
        //e = video object
        //k = temporary values
        if(!e.id && e.mid)e.id = e.mid
        if(!k)k={};
        e.dir = s.getVideoDirectory(e)
        k.dir = e.dir.toString()
        if(s.group[e.ke].mon[e.id].childNode){
            s.cx({f:'insertCompleted',d:s.group[e.ke].mon_conf[e.id],k:k},s.group[e.ke].mon[e.id].childNodeId);
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
                    fs.createReadStream(k.dir+k.filename)
                    .on('data',function(data){
                        s.cx({
                            f:'created_file_chunk',
                            mid:e.id,
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
                        clearTimeout(s.group[e.ke].mon[e.id].recordingChecker)
                        clearTimeout(s.group[e.ke].mon[e.id].streamChecker)
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
                }
                s.insertCompletedVideoExtensions.forEach(function(extender){
                    extender(e,k)
                })
                k.details = {}
                if(e.details&&e.details.dir&&e.details.dir!==''){
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
                //purge over max
                s.purgeDiskForGroup(e)
                //send new diskUsage values
                s.setDiskUsedForGroup(e,k.filesizeMB)
            }
        }
    }
    s.deleteVideo = function(e){
        //e = video object
        e.dir = s.getVideoDirectory(e)
        if(!e.id && e.mid)e.id = e.mid
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
                    var deleteRow = function(){
                        s.tx({
                            f: 'video_delete',
                            filename: filename,
                            mid: e.id,
                            ke: e.ke,
                            time: s.nameToTime(filename),
                            end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                        },'GRP_'+e.ke);
                        s.setDiskUsedForGroup(e,-(r.size / 1000000))
                        s.sqlQuery('DELETE FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?',queryValues,function(err){
                            if(err){
                                s.systemLog(lang['File Delete Error'] + ' : '+e.ke+' : '+' : '+e.id,err)
                            }
                        })
                    }
                    fs.unlink(e.dir+filename,function(err){
                        if(err){
                            s.systemLog(lang['File Delete Error'] + ' : '+e.ke+' : '+' : '+e.id,err)
                        }else{
                            deleteRow()
                        }
                    })
                })
            }else{
                console.log(lang['Database row does not exist'],queryValues)
            }
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
        //e = video object
        if(!e.id && e.mid)e.id = e.mid
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
}
