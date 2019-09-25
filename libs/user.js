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
                        var videosToDelete = []
                        var queryValues = [e.ke]
                        var completedCheck = 0
                        if(videos){
                            videos.forEach(function(video){
                                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                                videosToDelete.push('(mid=? AND `time`=?)')
                                queryValues.push(video.mid)
                                queryValues.push(video.time)
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
                                        if(videosToDelete.length === completedCheck){
                                            videosToDelete = videosToDelete.join(' OR ')
                                            s.sqlQuery('DELETE FROM Videos WHERE ke =? AND ('+videosToDelete+')',queryValues,function(){
                                                reRunCheck()
                                            })
                                        }
                                    })
                                })
                                if(storageIndex){
                                    s.setDiskUsedForGroupAddStorage(e,{
                                        size: -(video.size/1000000),
                                        storageIndex: storageIndex
                                    })
                                }else{
                                    s.setDiskUsedForGroup(e,-(video.size/1000000))
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
                        if(videosToDelete.length === 0){
                            if(callback)callback()
                        }
                    }
                    var deleteSetOfTimelapseFrames = function(err,frames,storageIndex,callback){
                        var framesToDelete = []
                        var queryValues = [e.ke]
                        var completedCheck = 0
                        if(frames){
                            frames.forEach(function(frame){
                                var selectedDate = frame.filename.split('T')[0]
                                var dir = s.getTimelapseFrameDirectory(frame)
                                var fileLocationMid = `${dir}` + frame.filename
                                framesToDelete.push('(mid=? AND `time`=?)')
                                queryValues.push(frame.mid)
                                queryValues.push(frame.time)
                                fs.unlink(fileLocationMid,function(err){
                                    ++completedCheck
                                    if(err){
                                        fs.stat(fileLocationMid,function(err){
                                            if(!err){
                                                s.file('delete',fileLocationMid)
                                            }
                                        })
                                    }
                                    if(framesToDelete.length === completedCheck){
                                        framesToDelete = framesToDelete.join(' OR ')
                                        s.sqlQuery('DELETE FROM `Timelapse Frames` WHERE ke =? AND ('+framesToDelete+')',queryValues,function(){
                                            reRunCheck()
                                        })
                                    }
                                })
                                if(storageIndex){
                                    s.setDiskUsedForGroupAddStorage(e,{
                                        size: -(frame.size/1000000),
                                        storageIndex: storageIndex
                                    },'timelapeFrames')
                                }else{
                                    s.setDiskUsedForGroup(e,-(frame.size/1000000),'timelapeFrames')
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
                        if(framesToDelete.length === 0){
                            if(callback)callback()
                        }
                    }
                    var deleteSetOfFileBinFiles = function(err,files,storageIndex,callback){
                        var filesToDelete = []
                        var queryValues = [e.ke]
                        var completedCheck = 0
                        if(files){
                            files.forEach(function(file){
                                var dir = s.getFileBinDirectory(file)
                                var fileLocationMid = `${dir}` + file.name
                                filesToDelete.push('(mid=? AND `name`=?)')
                                queryValues.push(file.mid)
                                queryValues.push(file.name)
                                fs.unlink(fileLocationMid,function(err){
                                    ++completedCheck
                                    if(err){
                                        fs.stat(fileLocationMid,function(err){
                                            if(!err){
                                                s.file('delete',fileLocationMid)
                                            }
                                        })
                                    }
                                    if(filesToDelete.length === completedCheck){
                                        filesToDelete = filesToDelete.join(' OR ')
                                        s.sqlQuery('DELETE FROM `Files` WHERE ke =? AND ('+filesToDelete+')',queryValues,function(){
                                            reRunCheck()
                                        })
                                    }
                                })
                                if(storageIndex){
                                    s.setDiskUsedForGroupAddStorage(e,{
                                        size: -(file.size/1000000),
                                        storageIndex: storageIndex
                                    },'fileBin')
                                }else{
                                    s.setDiskUsedForGroup(e,-(file.size/1000000),'fileBin')
                                }
                            })
                        }else{
                            console.log(err)
                        }
                        if(framesToDelete.length === 0){
                            if(callback)callback()
                        }
                    }
                    var deleteMainVideos = function(callback){
                        reRunCheck = function(){
                            return deleteMainVideos(callback)
                        }
                        //run purge command
                        if(s.group[e.ke].usedSpaceVideos > (s.group[e.ke].sizeLimit * (s.group[e.ke].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)){
                                s.sqlQuery('SELECT * FROM Videos WHERE status != 0 AND details NOT LIKE \'%"archived":"1"%\' AND ke=? AND details NOT LIKE \'%"dir"%\' ORDER BY `time` ASC LIMIT 3',[e.ke],function(err,rows){
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
                                    s.sqlQuery('SELECT * FROM Videos WHERE status != 0 AND details NOT LIKE \'%"archived":"1"%\' AND ke=? AND details LIKE ? ORDER BY `time` ASC LIMIT 3',[e.ke,`%"dir":"${storage.value}"%`],function(err,rows){
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
                                s.sqlQuery('SELECT * FROM `Timelapse Frames` WHERE ke=? AND details NOT LIKE \'%"archived":"1"%\' ORDER BY `time` ASC LIMIT 3',[e.ke],function(err,frames){
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
                                    s.sqlQuery('SELECT * FROM `Files` WHERE ke=? ORDER BY `time` ASC LIMIT 1',[e.ke],function(err,frames){
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
        if((e.details&&e.details.sqllog==='1')||e.mid.indexOf('$')>-1){
            s.sqlQuery('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)',[e.ke,e.mid,s.s(x)]);
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
        s.group[e.ke].usedSpace = s.group[e.ke].usedSpace || ((e.size || 0) / 1000000)
        //emit the changes to connected users
        s.sendDiskUsedAmountToClients(e)
    }
    s.loadGroupApps = function(e){
        // e = user
        if(!s.group[e.ke].init){
            s.group[e.ke].init={};
        }
        s.sqlQuery('SELECT * FROM Users WHERE ke=? AND details NOT LIKE ?',[e.ke,'%"sub"%'],function(ar,r){
            if(r && r[0]){
                r = r[0];
                ar = JSON.parse(r.details);
                //load extenders
                s.loadGroupAppExtensions.forEach(function(extender){
                    extender(r,ar)
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
                                        s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE status != 0 AND ke=? AND details LIKE \'%"type":"'+storageType+'"%\' ORDER BY `time` ASC LIMIT 2',[e.ke],function(err,videos){
                                            var videosToDelete = []
                                            var queryValues = [e.ke]
                                            if(!videos)return console.log(err)
                                            videos.forEach(function(video){
                                                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                                                videosToDelete.push('(mid=? AND `time`=?)')
                                                queryValues.push(video.mid)
                                                queryValues.push(video.time)
                                                s.setCloudDiskUsedForGroup(e,{
                                                    amount : -(video.size/1000000),
                                                    storageType : storageType
                                                })
                                                s.deleteVideoFromCloudExtensionsRunner(e,storageType,video)
                                            })
                                            if(videosToDelete.length > 0){
                                                videosToDelete = videosToDelete.join(' OR ')
                                                s.sqlQuery('DELETE FROM `Cloud Videos` WHERE ke =? AND ('+videosToDelete+')',queryValues,function(){
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
                                    s.sqlQuery('SELECT * FROM `Cloud Timelapse Frames` WHERE ke=? AND details NOT LIKE \'%"archived":"1"%\' ORDER BY `time` ASC LIMIT 3',[e.ke],function(err,frames){
                                        var framesToDelete = []
                                        var queryValues = [e.ke]
                                        if(!frames)return console.log(err)
                                        frames.forEach(function(frame){
                                            frame.dir = s.getVideoDirectory(frame) + s.formattedTime(frame.time) + '.' + frame.ext
                                            framesToDelete.push('(mid=? AND `time`=?)')
                                            queryValues.push(frame.mid)
                                            queryValues.push(frame.time)
                                            s.setCloudDiskUsedForGroup(e,{
                                                amount : -(frame.size/1000000),
                                                storageType : storageType
                                            })
                                            s.deleteVideoFromCloudExtensionsRunner(e,storageType,frame)
                                        })
                                        s.sqlQuery('DELETE FROM `Cloud Timelapse Frames` WHERE ke =? AND ('+framesToDelete+')',queryValues,function(){
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
                Object.keys(ar).forEach(function(v){
                    s.group[e.ke].init[v] = ar[v]
                })
            }
        })
    }
    s.accountSettingsEdit = function(d){
        s.sqlQuery('SELECT details FROM Users WHERE ke=? AND uid=?',[d.ke,d.uid],function(err,r){
            if(r&&r[0]){
                r=r[0];
                d.d=JSON.parse(r.details);
                if(!d.d.sub || d.d.user_change !== "0"){
                    if(d.cnid){
                        if(d.d.get_server_log==='1'){
                            s.clientSocketConnection[d.cnid].join('GRPLOG_'+d.ke)
                        }else{
                            s.clientSocketConnection[d.cnid].leave('GRPLOG_'+d.ke)
                        }
                    }
                    ///unchangeable from client side, so reset them in case they did.
                    d.form.details=JSON.parse(d.form.details)
                    s.beforeAccountSaveExtensions.forEach(function(extender){
                        extender(d)
                    })
                    //admin permissions
                    d.form.details.permissions=d.d.permissions
                    d.form.details.edit_size=d.d.edit_size
                    d.form.details.edit_days=d.d.edit_days
                    d.form.details.use_admin=d.d.use_admin
                    d.form.details.use_ldap=d.d.use_ldap
                    d.form.details.landing_page=d.d.landing_page
                    //check
                    if(d.d.edit_days == "0"){
                        d.form.details.days = d.d.days;
                    }
                    if(d.d.edit_size == "0"){
                        d.form.details.size = d.d.size;
                    }
                    if(d.d.sub){
                        d.form.details.sub=d.d.sub;
                        if(d.d.monitors){d.form.details.monitors=d.d.monitors;}
                        if(d.d.allmonitors){d.form.details.allmonitors=d.d.allmonitors;}
                        if(d.d.monitor_create){d.form.details.monitor_create=d.d.monitor_create;}
                        if(d.d.video_delete){d.form.details.video_delete=d.d.video_delete;}
                        if(d.d.video_view){d.form.details.video_view=d.d.video_view;}
                        if(d.d.monitor_edit){d.form.details.monitor_edit=d.d.monitor_edit;}
                        if(d.d.size){d.form.details.size=d.d.size;}
                        if(d.d.days){d.form.details.days=d.d.days;}
                        delete(d.form.details.mon_groups)
                    }
                    var newSize = parseFloat(d.form.details.size) || 10000
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
                        var detailContainer = d.form.details || s.group[r.ke].init
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
                    d.form.details = JSON.stringify(d.form.details)
                    ///
                    d.set=[],d.ar=[];
                    if(d.form.pass&&d.form.pass!==''){d.form.pass=s.createHash(d.form.pass);}else{delete(d.form.pass)};
                    delete(d.form.password_again);
                    d.for=Object.keys(d.form);
                    d.for.forEach(function(v){
                        d.set.push(v+'=?'),d.ar.push(d.form[v]);
                    });
                    d.ar.push(d.ke),d.ar.push(d.uid);
                    s.sqlQuery('UPDATE Users SET '+d.set.join(',')+' WHERE ke=? AND uid=?',d.ar,function(err,r){
                        if(!d.d.sub){
                            var user = Object.assign(d.form,{ke : d.ke})
                            var userDetails = JSON.parse(d.form.details)
                            s.group[d.ke].sizeLimit = parseFloat(newSize)
                            s.onAccountSaveExtensions.forEach(function(extender){
                                extender(s.group[d.ke],userDetails,user)
                            })
                            s.unloadGroupAppExtensions.forEach(function(extender){
                                extender(user)
                            })
                            s.loadGroupApps(d)
                        }
                        if(d.cnid)s.tx({f:'user_settings_change',uid:d.uid,ke:d.ke,form:d.form},d.cnid)
                    })
                }
            }
        })
    }
    s.findPreset = function(presetQueryVals,callback){
        //presetQueryVals = [ke, type, name]
        s.sqlQuery("SELECT * FROM Presets WHERE ke=? AND type=? AND name=? LIMIT 1",presetQueryVals,function(err,presets){
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
