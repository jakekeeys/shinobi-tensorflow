process.on('uncaughtException', function (err) {
    console.error('uncaughtException',err);
});
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const config = require(process.cwd() + '/conf.json')

//set option defaults
s = {
    mainDirectory: process.cwd(),
    utcOffset: moment().utcOffset()
};
if(config.cron===undefined)config.cron={};
if(config.cron.deleteOld===undefined)config.cron.deleteOld=true;
if(config.cron.deleteOrphans===undefined)config.cron.deleteOrphans=false;
if(config.cron.deleteNoVideo===undefined)config.cron.deleteNoVideo=true;
if(config.cron.deleteNoVideoRecursion===undefined)config.cron.deleteNoVideoRecursion=false;
if(config.cron.deleteOverMax===undefined)config.cron.deleteOverMax=true;
if(config.cron.deleteLogs===undefined)config.cron.deleteLogs=true;
if(config.cron.deleteEvents===undefined)config.cron.deleteEvents=true;
if(config.cron.deleteFileBins===undefined)config.cron.deleteFileBins=true;
if(config.cron.interval===undefined)config.cron.interval=1;
if(config.databaseType===undefined){config.databaseType='mysql'}
if(config.databaseLogs===undefined){config.databaseLogs=false}
if(config.useUTC===undefined){config.useUTC=false}
if(config.debugLog===undefined){config.debugLog=false}

if(!config.ip||config.ip===''||config.ip.indexOf('0.0.0.0')>-1)config.ip='localhost';
if(!config.videosDir)config.videosDir = s.mainDirectory + '/videos/';
if(!config.binDir){config.binDir = s.mainDirectory + '/fileBin/'}

const {
    checkCorrectPathEnding,
    generateRandomId,
    formattedTime,
    localToUtc,
} = require('./libs/basic/utils.js')(s.mainDirectory)
const {
    sqlDate,
    knexQuery,
    knexQueryPromise,
    initiateDatabaseEngine
} = require('./libs/sql/utils.js')(s,config)
var theCronInterval = null
const overlapLocks = {}
const alreadyDeletedRowsWithNoVideosOnStart = {}
const videoDirectory = checkCorrectPathEnding(config.videosDir)
const fileBinDirectory = checkCorrectPathEnding(config.binDir)
s.debugLog = function(arg1,arg2){
    if(config.debugLog === true){
        if(!arg2)arg2 = ''
        console.log(arg1,arg2)
    }
}
const connectToMainProcess = () => {
    const io = require('socket.io-client')('ws://'+config.ip+':'+config.port,{
        transports:['websocket']
    });
    io.on('connect',function(d){
        postMessage({
            f: 'init',
            time: moment()
        })
    })
    io.on('f',function(d){
        //command from main process
        switch(d.f){
            case'start':case'restart':
                setIntervalForCron()
            break;
            case'stop':
                clearCronInterval()
            break;
        }
    })
    return io
}
const postMessage = (x) => {
    x.cronKey = config.cron.key;
    return io.emit('cron',x)
}
const sendToWebSocket = (x,y) => {
    //emulate master socket emitter
    postMessage({f:'s.tx',data:x,to:y})
}
const deleteVideo = (x) => {
    postMessage({f:'s.deleteVideo',file:x})
}
const deleteFileBinEntry = (x) => {
    postMessage({f:'s.deleteFileBinEntry',file:x})
}
const setDiskUsedForGroup = (groupKey,size,target) => {
    postMessage({f:'s.setDiskUsedForGroup', ke: groupKey, size: size, target: target})
}
const getVideoDirectory = function(e){
    if(e.mid&&!e.id){e.id=e.mid};
    if(e.details&&(e.details instanceof Object)===false){
        try{e.details=JSON.parse(e.details)}catch(err){}
    }
    if(e.details.dir&&e.details.dir!==''){
        return checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
    }else{
        return videoDirectory + e.ke + '/' + e.id + '/'
    }
}
const getFileBinDirectory = function(e){
    if(e.mid && !e.id){e.id = e.mid}
    return fileBinDirectory + e.ke + '/' + e.id + '/'
}
//filters set by the user in their dashboard
//deleting old videos is part of the filter - config.cron.deleteOld
const checkFilterRules = function(v){
    return new Promise((resolve,reject) => {
        //filters
        v.d.filters = v.d.filters ? v.d.filters : {}
        s.debugLog('Checking Basic Filters...')
        var keys = Object.keys(v.d.filters)
        if(keys.length>0){
            keys.forEach(function(m,current){
                // b = filter
                var b = v.d.filters[m];
                s.debugLog(b)
                if(b.enabled==="1"){
                    const whereQuery = [
                        ['ke','=',v.ke],
                        ['status','!=',"0"],
                        ['details','NOT LIKE','%"archived":"1"%'],
                    ]
                    b.where.forEach(function(condition){
                        if(condition.p1 === 'ke'){condition.p3 = v.ke}
                        whereQuery.push([condition.p1,condition.p2 || '=',condition.p3])
                    })
                    knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Videos",
                        where: whereQuery,
                        orderBy: [b.sort_by,b.sort_by_direction.toLowerCase()],
                        limit: b.limit
                    },(err,r) => {
                         if(r && r[0]){
                            if(r.length > 0 || config.debugLog === true){
                                postMessage({f:'filterMatch',msg:r.length+' SQL rows match "'+m+'"',ke:v.ke,time:moment()})
                            }
                            b.cx={
                                f:'filters',
                                name:b.name,
                                videos:r,
                                time:moment(),
                                ke:v.ke,
                                id:b.id
                            };
                            if(b.archive==="1"){
                                postMessage({f:'filters',ff:'archive',videos:r,time:moment(),ke:v.ke,id:b.id});
                            }else if(b.delete==="1"){
                                postMessage({f:'filters',ff:'delete',videos:r,time:moment(),ke:v.ke,id:b.id});
                            }
                            if(b.email==="1"){
                                b.cx.ff='email';
                                b.cx.delete=b.delete;
                                b.cx.mail=v.mail;
                                b.cx.execute=b.execute;
                                b.cx.query=b.sql;
                                postMessage(b.cx);
                            }
                            if(b.execute&&b.execute!==""){
                                postMessage({f:'filters',ff:'execute',execute:b.execute,time:moment()});
                            }
                        }
                    })

                }
                if(current===keys.length-1){
                    //last filter
                    resolve()
                }
            })
        }else{
            //no filters
            resolve()
        }
    })
}
const deleteVideosByDays = async (v,days,addedQueries) => {
    const whereQuery = [
        ['ke','=',v.ke],
        ['time','<', sqlDate(days+' DAY')],
        addedQueries
    ]
    const selectResponse = await knexQueryPromise({
        action: "select",
        columns: "*",
        table: "Videos",
        where: whereQuery
    })
    const videoRows = selectResponse.rows
    let affectedRows = 0
    if(videoRows.length > 0){
        let clearSize = 0;
        var i;
        for (i = 0; i < videoRows.length; i++) {
            const row = videoRows[i];
            const dir = getVideoDirectory(row)
            const filename = formattedTime(row.time) + '.' + row.ext
            try{
                await fs.promises.unlink(dir + filename)
                row.size += clearSize
                sendToWebSocket({
                    f: 'video_delete',
                    filename: filename + '.' + row.ext,
                    mid: row.mid,
                    ke: row.ke,
                    time: row.time,
                    end: formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                },'GRP_' + row.ke)
            }catch(err){
                console.log('Video Delete Error',row)
                console.log(err)
            }
        }
        const deleteResponse = await knexQueryPromise({
            action: "delete",
            table: "Videos",
            where: whereQuery
        })
        affectedRows = deleteResponse.rows || 0
        setDiskUsedForGroup(v.ke,-clearSize)
    }
    return {
        ok: true,
        affectedRows: affectedRows,
    }
}
const deleteOldVideos = async (v) => {
    // v = group, admin user
    if(config.cron.deleteOld === true){
        const daysOldForDeletion = v.d.days && !isNaN(v.d.days) ? parseFloat(v.d.days) : 5
        const monitorsIgnored = []
        const monitorsResponse = await knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Monitors",
            where: [
                ['ke','=',v.ke],
            ]
        })
        const monitorRows = monitorsResponse.rows
        var i;
        for (i = 0; i < monitorRows.length; i++) {
            const monitor = monitorRows[i]
            const monitorId = monitor.mid
            const details = JSON.parse(monitor.details);
            const monitorsMaxDaysToKeep = !isNaN(details.max_keep_days) ? parseFloat(details.max_keep_days) : null
            if(monitorsMaxDaysToKeep){
                const { affectedRows } = await deleteVideosByDays(v,monitorsMaxDaysToKeep,['mid','=',monitorId])
                const hasDeletedRows = affectedRows && affectedRows.length > 0;
                if(hasDeletedRows || config.debugLog === true){
                    postMessage({
                        f: 'deleteOldVideosByMonitorId',
                        msg: `${affectedRows} SQL rows older than ${monitorsMaxDaysToKeep} days deleted`,
                        ke: v.ke,
                        mid: monitorId,
                        time: moment(),
                    })
                }
                monitorsIgnored.push(['mid','!=',monitorId])
            }
        }
        const { affectedRows } = await deleteVideosByDays(v,daysOldForDeletion,monitorsIgnored)
        const hasDeletedRows = affectedRows && affectedRows.length > 0;
        if(hasDeletedRows || config.debugLog === true){
            postMessage({
                f: 'deleteOldVideos',
                msg: `${affectedRows} SQL rows older than ${daysOldForDeletion} days deleted`,
                ke: v.ke,
                time: moment(),
            })
        }
    }
}
//database rows with no videos in the filesystem
const deleteRowsWithNoVideo = function(v){
    return new Promise((resolve,reject) => {
        if(
            config.cron.deleteNoVideo===true&&(
                config.cron.deleteNoVideoRecursion===true||
                (config.cron.deleteNoVideoRecursion===false&&!alreadyDeletedRowsWithNoVideosOnStart[v.ke])
            )
        ){
            alreadyDeletedRowsWithNoVideosOnStart[v.ke]=true;
            knexQuery({
                action: "select",
                columns: "*",
                table: "Videos",
                where: [
                    ['ke','=',v.ke],
                    ['status','!=','0'],
                    ['details','NOT LIKE','%"archived":"1"%'],
                    ['time','<', sqlDate('10 MINUTE')],
                ]
            },(err,evs) => {
                if(evs && evs[0]){
                    const videosToDelete = [];
                    evs.forEach(function(ev){
                        var filename
                        var details
                        try{
                            details = JSON.parse(ev.details)
                        }catch(err){
                            if(details instanceof Object){
                                details = ev.details
                            }else{
                                details = {}
                            }
                        }
                        var dir = getVideoDirectory(ev)
                        filename = formattedTime(ev.time)+'.'+ev.ext
                        fileExists = fs.existsSync(dir+filename)
                        if(fileExists !== true){
                            deleteVideo(ev)
                            sendToWebSocket({f:'video_delete',filename:filename+'.'+ev.ext,mid:ev.mid,ke:ev.ke,time:ev.time,end: formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+ev.ke);
                        }
                    });
                    if(videosToDelete.length > 0 || config.debugLog === true){
                        postMessage({f:'deleteNoVideo',msg:videosToDelete.length+' SQL rows with no file deleted',ke:v.ke,time:moment()})
                    }
                }
                setTimeout(function(){
                    resolve()
                },3000)
            })
        }else{
            resolve()
        }
    })
}
//info about what the application is doing
const deleteOldLogs = function(v){
    return new Promise((resolve,reject) => {
        const daysOldForDeletion = v.d.log_days && !isNaN(v.d.log_days) ? parseFloat(v.d.log_days) : 10
        if(config.cron.deleteLogs === true && daysOldForDeletion !== 0){
            knexQuery({
                action: "delete",
                table: "Logs",
                where: [
                    ['ke','=',v.ke],
                    ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                ]
            },(err,rrr) => {
                resolve()
                if(err)return console.error(err);
                if(rrr && rrr > 0 || config.debugLog === true){
                    postMessage({f:'deleteLogs',msg: rrr + ' SQL rows older than ' + daysOldForDeletion + ' days deleted',ke:v.ke,time:moment()})
                }
            })
        }else{
            resolve()
        }
    })
}
//events - motion, object, etc. detections
const deleteOldEvents = function(v){
    return new Promise((resolve,reject) => {
        const daysOldForDeletion = v.d.event_days && !isNaN(v.d.event_days) ? parseFloat(v.d.event_days) : 10
        if(config.cron.deleteEvents === true && daysOldForDeletion !== 0){
            knexQuery({
                action: "delete",
                table: "Events",
                where: [
                    ['ke','=',v.ke],
                    ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                ]
            },(err,rrr) => {
                resolve()
                if(err)return console.error(err);
                if(rrr && rrr > 0 || config.debugLog === true){
                    postMessage({f:'deleteEvents',msg:rrr + ' SQL rows older than ' + daysOldForDeletion + ' days deleted',ke:v.ke,time:moment()})
                }
            })
        }else{
            resolve()
        }
    })
}
//event counts
const deleteOldEventCounts = function(v){
    return new Promise((resolve,reject) => {
        const daysOldForDeletion = v.d.event_days && !isNaN(v.d.event_days) ? parseFloat(v.d.event_days) : 10
        if(config.cron.deleteEvents === true && daysOldForDeletion !== 0){
            knexQuery({
                action: "delete",
                table: "Events Counts",
                where: [
                    ['ke','=',v.ke],
                    ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                ]
            },(err,rrr) => {
                resolve()
                if(err && err.code !== 'ER_NO_SUCH_TABLE')return console.error(err);
                if(rrr && rrr > 0 || config.debugLog === true){
                    postMessage({f:'deleteEvents',msg:rrr + ' SQL rows older than ' + daysOldForDeletion + ' days deleted',ke:v.ke,time:moment()})
                }
            })
        }else{
            resolve()
        }
    })
}
//check for temporary files (special archive)
const deleteOldFileBins = function(v){
    return new Promise((resolve,reject) => {
        const daysOldForDeletion = v.d.fileBin_days && !isNaN(v.d.fileBin_days) ? parseFloat(v.d.fileBin_days) : 10
        if(config.cron.deleteFileBins === true && daysOldForDeletion !== 0){
            var fileBinQuery = " FROM Files WHERE ke=? AND `time` < ?";
            knexQuery({
                action: "select",
                columns: "*",
                table: "Files",
                where: [
                    ['ke','=',v.ke],
                    ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                ]
            },(err,files) => {
                if(files && files[0]){
                    //delete the files
                    files.forEach(function(file){
                        deleteFileBinEntry(file)
                    })
                    if(config.debugLog === true){
                        postMessage({
                            f: 'deleteFileBins',
                            msg: files.length + ' files older than ' + daysOldForDeletion + ' days deleted',
                            ke: v.ke,
                            time: moment()
                        })
                    }
                }
                resolve()
            })
        }else{
            resolve()
        }
    })
}
//user processing function
const processUser = async (v) => {
    if(!v){
        //no user object given, end of group list
        return
    }
    s.debugLog(`Group Key : ${v.ke}`)
    s.debugLog(`Owner : ${v.mail}`)
    if(!overlapLocks[v.ke]){
        s.debugLog(`Checking...`)
        overlapLocks[v.ke] = true
        v.d = JSON.parse(v.details);
        try{
            await deleteOldVideos(v)
            s.debugLog('--- deleteOldVideos Complete')
            await deleteOldLogs(v)
            s.debugLog('--- deleteOldLogs Complete')
            await deleteOldFileBins(v)
            s.debugLog('--- deleteOldFileBins Complete')
            await deleteOldEvents(v)
            s.debugLog('--- deleteOldEvents Complete')
            await deleteOldEventCounts(v)
            s.debugLog('--- deleteOldEventCounts Complete')
            await checkFilterRules(v)
            s.debugLog('--- checkFilterRules Complete')
            await deleteRowsWithNoVideo(v)
            s.debugLog('--- deleteRowsWithNoVideo Complete')
        }catch(err){
            console.log(`Failed to Complete User : ${v.mail}`)
            console.log(err)
        }
        //done user, unlock current, and do next
        overlapLocks[v.ke] = false;
        s.debugLog(`Complete Checking... ${v.mail}`)
    }else{
        s.debugLog(`Locked, Skipped...`)
    }
}
//recursive function
const setIntervalForCron = function(){
    clearCronInterval()
    // theCronInterval = setInterval(doCronJobs,1000 * 10)
    theCronInterval = setInterval(doCronJobs,parseFloat(config.cron.interval)*60000*60)
}
const clearCronInterval = function(){
    clearInterval(theCronInterval)
}
const doCronJobs = function(){
    postMessage({
        f: 'start',
        time: moment()
    })
    knexQuery({
        action: "select",
        columns: "ke,uid,details,mail",
        table: "Users",
        where: [
            ['details','NOT LIKE','%"sub"%'],
        ]
    }, async (err,rows) => {
        if(err){
            console.error(err)
        }
        if(rows.length > 0){
            var i;
            for (i = 0; i < rows.length; i++) {
                await processUser(rows[i])
            }
        }
    })
}
initiateDatabaseEngine()
const io = connectToMainProcess()
setIntervalForCron()
doCronJobs()
console.log('Shinobi : cron.js started')
