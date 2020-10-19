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
const checkFilterRules = function(v,callback){
    //filters
    if(!v.d.filters||v.d.filters==''){
        v.d.filters={};
    }
    //delete old videos with filter
    if(config.cron.deleteOld === true){
        var where = [{
            "p1":"end",
            "p2":"<=",
            "p3": sqlDate(v.d.days+" DAY")
        }]
        //exclude monitors with their own max days
        v.monitorsWithMaxKeepDays.forEach(function(mid){
            where.push({
                "p1":"mid",
                "p2":"!=",
                "p3":mid,
            })
        })
        v.d.filters.deleteOldVideosByCron={
            "id":"deleteOldVideosByCron",
            "name":"deleteOldVideosByCron",
            "sort_by":"time",
            "sort_by_direction":"ASC",
            "limit":"",
            "enabled":"1",
            "archive":"0",
            "email":"0",
            "delete":"1",
            "execute":"",
            "where":where
        };
    }
    s.debugLog('Filters')
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
                callback()
            }
        })
    }else{
        //no filters
        callback()
    }
}
//database rows with no videos in the filesystem
const deleteRowsWithNoVideo = function(v,callback){
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
                    if(details.isUTC === true){
                        filename = localToUtc(ev.time).format('YYYY-MM-DDTHH-mm-ss')+'.'+ev.ext
                    }else{
                        filename = formattedTime(ev.time)+'.'+ev.ext
                    }
                    fileExists = fs.existsSync(dir+filename)
                    if(fileExists !== true){
                        deleteVideo(ev)
                        sendToWebSocket({f:'video_delete',filename:filename+'.'+ev.ext,mid:ev.mid,ke:ev.ke,time:ev.time,end: formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+ev.ke);
                    }
                });
                if(videosToDelete.length>0 || config.debugLog === true){
                    postMessage({f:'deleteNoVideo',msg:videosToDelete.length+' SQL rows with no file deleted',ke:v.ke,time:moment()})
                }
            }
            setTimeout(function(){
                callback()
            },3000)
        })
    }else{
        callback()
    }
}
//info about what the application is doing
const deleteOldLogs = function(v,callback){
    if(!v.d.log_days||v.d.log_days==''){v.d.log_days=10}else{v.d.log_days=parseFloat(v.d.log_days)};
    if(config.cron.deleteLogs===true&&v.d.log_days!==0){
        knexQuery({
            action: "delete",
            table: "Logs",
            where: [
                ['ke','=',v.ke],
                ['time','<', sqlDate(v.d.log_days+' DAY')],
            ]
        },(err,rrr) => {
            callback()
            if(err)return console.error(err);
            if(rrr.affectedRows && rrr.affectedRows.length>0 || config.debugLog === true){
                postMessage({f:'deleteLogs',msg:(rrr.affectedRows || 0)+' SQL rows older than '+v.d.log_days+' days deleted',ke:v.ke,time:moment()})
            }
        })
    }else{
        callback()
    }
}
//events - motion, object, etc. detections
const deleteOldEvents = function(v,callback){
    if(!v.d.event_days||v.d.event_days==''){v.d.event_days=10}else{v.d.event_days=parseFloat(v.d.event_days)};
    if(config.cron.deleteEvents===true&&v.d.event_days!==0){
        knexQuery({
            action: "delete",
            table: "Events",
            where: [
                ['ke','=',v.ke],
                ['time','<', sqlDate(v.d.event_days+' DAY')],
            ]
        },(err,rrr) => {
            callback()
            if(err)return console.error(err);
            if(rrr.affectedRows && rrr.affectedRows.length > 0 || config.debugLog === true){
                postMessage({f:'deleteEvents',msg:(rrr.affectedRows || 0)+' SQL rows older than '+v.d.event_days+' days deleted',ke:v.ke,time:moment()})
            }
        })
    }else{
        callback()
    }
}
//event counts
const deleteOldEventCounts = function(v,callback){
    if(!v.d.event_days||v.d.event_days==''){v.d.event_days=10}else{v.d.event_days=parseFloat(v.d.event_days)};
    if(config.cron.deleteEvents===true&&v.d.event_days!==0){
        knexQuery({
            action: "delete",
            table: "Events Counts",
            where: [
                ['ke','=',v.ke],
                ['time','<', sqlDate(v.d.event_days+' DAY')],
            ]
        },(err,rrr) => {
            callback()
            if(err && err.code !== 'ER_NO_SUCH_TABLE')return console.error(err);
            if(rrr.affectedRows && rrr.affectedRows.length > 0 || config.debugLog === true){
                postMessage({f:'deleteEvents',msg:(rrr.affectedRows || 0)+' SQL rows older than '+v.d.event_days+' days deleted',ke:v.ke,time:moment()})
            }
        })
    }else{
        callback()
    }
}
//check for temporary files (special archive)
const deleteOldFileBins = function(v,callback){
    if(!v.d.fileBin_days||v.d.fileBin_days==''){v.d.fileBin_days=10}else{v.d.fileBin_days=parseFloat(v.d.fileBin_days)};
    if(config.cron.deleteFileBins===true&&v.d.fileBin_days!==0){
        var fileBinQuery = " FROM Files WHERE ke=? AND `time` < ?";
        knexQuery({
            action: "select",
            columns: "*",
            table: "Files",
            where: [
                ['ke','=',v.ke],
                ['time','<', sqlDate(v.d.fileBin_days+' DAY')],
            ]
        },(err,files) => {
            if(files&&files[0]){
                //delete the files
                files.forEach(function(file){
                    fs.unlink(getFileBinDirectory(file) + file.name,function(err){
//                        if(err)console.error(err)
                    })
                })
                //delete the database rows
                knexQuery({
                    action: "delete",
                    table: "Files",
                    where: [
                        ['ke','=',v.ke],
                        ['time','<', sqlDate(v.d.fileBin_days+' DAY')],
                    ]
                },(err,rrr) => {
                    callback()
                    if(err)return console.error(err);
                    if(rrr.affectedRows && rrr.affectedRows.length>0 || config.debugLog === true){
                        postMessage({f:'deleteFileBins',msg:(rrr.affectedRows || 0)+' files older than '+v.d.fileBin_days+' days deleted',ke:v.ke,time:moment()})
                    }
                })
            }else{
                callback()
            }
        })
    }else{
        callback()
    }
}
//check for files with no database row
const checkForOrphanedFiles = function(v,callback){
    if(config.cron.deleteOrphans === true){
        console.log('"config.cron.deleteOrphans" has been removed. It has been replace by a one-time-run at startup with "config.insertOrphans". As the variable name suggests, instead of deleting, it will insert videos found without a database row.')
        console.log('By default "config.orphanedVideoCheckMax" will only check up to 20 video. You can raise this value to any number you choose but be careful as it will check that number of videos on every start.')
    }
    callback()
}
//user processing function
const processUser = function(number,rows){
    var v = rows[number];
    if(!v){
        //no user object given
        return
    }
    s.debugLog(v)
    if(!alreadyDeletedRowsWithNoVideosOnStart[v.ke]){
        alreadyDeletedRowsWithNoVideosOnStart[v.ke]=false;
    }
    if(!overlapLocks[v.ke]){
        // set overlap lock
        overlapLocks[v.ke] = true
        //set permissions
        v.d=JSON.parse(v.details);
        //size
        if(!v.d.size||v.d.size==''){v.d.size=10000}else{v.d.size=parseFloat(v.d.size)};
        //days to keep videos
        if(!v.d.days||v.d.days==''){v.d.days=5}else{v.d.days=parseFloat(v.d.days)};
        knexQuery({
            action: "select",
            columns: "*",
            table: "Monitors",
            where: [
                ['ke','=',v.ke],
            ]
        },(err,rr) => {
            if(!v.d.filters||v.d.filters==''){
                v.d.filters={};
            }
            v.monitorsWithMaxKeepDays = []
            rr.forEach(function(b,m){
                b.details=JSON.parse(b.details);
                if(b.details.max_keep_days&&b.details.max_keep_days!==''){
                    v.monitorsWithMaxKeepDays.push(b.mid)
                    v.d.filters['deleteOldVideosByCron'+b.mid]={
                        "id":'deleteOldVideosByCron'+b.mid,
                        "name":'deleteOldVideosByCron'+b.mid,
                        "sort_by":"time",
                        "sort_by_direction":"ASC",
                        "limit":"",
                        "enabled":"1",
                        "archive":"0",
                        "email":"0",
                        "delete":"1",
                        "execute":"",
                        "where":[{
                            "p1":"mid",
                            "p2":"=",
                            "p3":b.mid
                        },{
                            "p1":"end",
                            "p2":"<",
                            "p3": sqlDate(b.details.max_keep_days+" DAY")
                        }]
                    };
                }
            })
            deleteOldLogs(v,function(){
                s.debugLog('--- deleteOldLogs Complete')
                deleteOldFileBins(v,function(){
                    s.debugLog('--- deleteOldFileBins Complete')
                    deleteOldEvents(v,function(){
                        s.debugLog('--- deleteOldEvents Complete')
                        deleteOldEventCounts(v,function(){
                            s.debugLog('--- deleteOldEventCounts Complete')
                            checkFilterRules(v,function(){
                                s.debugLog('--- checkFilterRules Complete')
                                deleteRowsWithNoVideo(v,function(){
                                    s.debugLog('--- deleteRowsWithNoVideo Complete')
                                    checkForOrphanedFiles(v,function(){
                                        //done user, unlock current, and do next
                                        overlapLocks[v.ke]=false;
                                        processUser(number+1,rows)
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }else{
        processUser(number+1,rows)
    }
}
//recursive function
const setIntervalForCron = function(){
    clearCronInterval()
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
    },(err,rows) => {
        if(err){
            console.error(err)
        }
        if(rows&&rows[0]){
            processUser(0,rows)
        }
    })
}
initiateDatabaseEngine()
const io = connectToMainProcess()
setIntervalForCron()
doCronJobs()
console.log('Shinobi : cron.js started')
