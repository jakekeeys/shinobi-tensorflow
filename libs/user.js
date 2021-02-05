var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var async = require("async");
module.exports = function(s,config,lang){
    const {
        deleteSetOfVideos,
        deleteSetOfTimelapseFrames,
        deleteSetOfFileBinFiles,
        deleteAddStorageVideos,
        deleteMainVideos,
        deleteTimelapseFrames,
        deleteFileBinFiles,
        deleteCloudVideos,
        deleteCloudTimelapseFrames,
    } = require("./user/utils.js")(s,config,lang);
    let purgeDiskGroup = () => {}
    const runQuery = async.queue(function(groupKey, callback) {
        purgeDiskGroup(groupKey,callback)
    }, 1);
    if(config.cron.deleteOverMax === true){
        purgeDiskGroup = (groupKey,callback) => {
            if(s.group[groupKey]){
                if(s.group[groupKey].sizePurging !== true){
                    s.group[groupKey].sizePurging = true
                    s.debugLog(`${groupKey} deleteMainVideos`)
                    deleteMainVideos(groupKey,() => {
                        s.debugLog(`${groupKey} deleteTimelapseFrames`)
                        deleteTimelapseFrames(groupKey,() => {
                            s.debugLog(`${groupKey} deleteFileBinFiles`)
                            deleteFileBinFiles(groupKey,() => {
                                s.debugLog(`${groupKey} deleteAddStorageVideos`)
                                deleteAddStorageVideos(groupKey,() => {
                                    s.group[groupKey].sizePurging = false
                                    s.sendDiskUsedAmountToClients(groupKey)
                                    callback();
                                })
                            })
                        })
                    })
                }else{
                    s.sendDiskUsedAmountToClients(groupKey)
                }
            }
        }
    }
    s.purgeDiskForGroup = (groupKey) => {
        return runQuery.push(groupKey,function(){
            //...
        })
    }
    s.setDiskUsedForGroup = function(groupKey,bytes,storagePoint){
        //`bytes` will be used as the value to add or substract
        if(s.group[groupKey] && s.group[groupKey].diskUsedEmitter){
            s.group[groupKey].diskUsedEmitter.emit('set',bytes,storagePoint)
        }
    }
    s.setDiskUsedForGroupAddStorage = function(groupKey,data,storagePoint){
        if(s.group[groupKey] && s.group[groupKey].diskUsedEmitter){
            s.group[groupKey].diskUsedEmitter.emit('setAddStorage',data,storagePoint)
        }
    }
    s.purgeCloudDiskForGroup = function(e,storageType,storagePoint){
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('purgeCloud',storageType,storagePoint)
        }
    }
    s.setCloudDiskUsedForGroup = function(groupKey,usage,storagePoint){
        //`usage` will be used as the value to add or substract
        if(s.group[groupKey].diskUsedEmitter){
            s.group[groupKey].diskUsedEmitter.emit('setCloud',usage,storagePoint)
        }
    }
    s.sendDiskUsedAmountToClients = function(groupKey){
        //send the amount used disk space to connected users
        if(s.group[groupKey]&&s.group[groupKey].init){
            s.tx({
                f: 'diskUsed',
                size: s.group[groupKey].usedSpace,
                usedSpace: s.group[groupKey].usedSpace,
                usedSpaceVideos: s.group[groupKey].usedSpaceVideos,
                usedSpaceFilebin: s.group[groupKey].usedSpaceFilebin,
                usedSpaceTimelapseFrames: s.group[groupKey].usedSpaceTimelapseFrames,
                limit: s.group[groupKey].sizeLimit,
                addStorage: s.group[groupKey].addStorageUse
            },'GRP_'+groupKey);
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
        s.sendDiskUsedAmountToClients(e.ke)
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
                    if(config.cron.deleteOverMax === true){
                        s.group[e.ke].diskUsedEmitter.on('purgeCloud',function(storageType,storagePoint){
                            deleteCloudVideos(e.ke,storageType,storagePoint,function(){
                                deleteCloudTimelapseFrames(e.ke,storageType,storagePoint,function(){

                                })
                            })
                        })
                    }
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
                        s.sendDiskUsedAmountToClients(e.ke)
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
                        s.sendDiskUsedAmountToClients(e.ke)
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
                    updateQuery.details = formDetails
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
