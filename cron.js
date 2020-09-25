process.on('uncaughtException', function (err) {
    console.error('uncaughtException',err);
});
var fs = require('fs');
var path = require('path');
var knex = require('knex');
var moment = require('moment');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var config=require('./conf.json');

//set option defaults
s={
    utcOffset : moment().utcOffset()
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
if(!config.videosDir)config.videosDir=__dirname+'/videos/';
if(!config.binDir){config.binDir=__dirname+'/fileBin/'}
if(!config.addStorage){config.addStorage=[]}

// Database Connection
var databaseOptions = {
  client: config.databaseType,
  connection: config.db,
}
if(databaseOptions.client.indexOf('sqlite')>-1){
    databaseOptions.client = 'sqlite3';
    databaseOptions.useNullAsDefault = true;
}
if(databaseOptions.client === 'sqlite3' && databaseOptions.connection.filename === undefined){
    databaseOptions.connection.filename = __dirname+"/shinobi.sqlite"
}
s.databaseEngine = knex(databaseOptions)
s.dateSubtract = function(date, interval, units){
  var ret = date
  var checkRollover = function() { if(ret.getDate() != date.getDate()) ret.setDate(0);};
  switch(interval.toLowerCase()) {
    case 'year'   :  ret.setFullYear(ret.getFullYear() - units); checkRollover();  break;
    case 'quarter':  ret.setMonth(ret.getMonth() - 3*units); checkRollover();  break;
    case 'month'  :  ret.setMonth(ret.getMonth() - units); checkRollover();  break;
    case 'week'   :  ret.setDate(ret.getDate() - 7*units);  break;
    case 'day'    :  ret.setDate(ret.getDate() - units);  break;
    case 'hour'   :  ret.setTime(ret.getTime() - units*3600000);  break;
    case 'minute' :  ret.setTime(ret.getTime() - units*60000);  break;
    case 'second' :default:  ret.setTime(ret.getTime() - units*1000);  break;
  }
  return (new Date(ret))
}
s.sqlDate = function(value){
    var value = value.toLowerCase()
    var splitValue = value.split(' ')
    var amount = parseFloat(splitValue[0])
    var today = new Date()
    var query
    if(value.indexOf('min') > -1){
        query = s.dateSubtract(today,'minute',amount)
    }else if(value.indexOf('day') > -1){
        query = s.dateSubtract(today,'day',amount)
    }else if(value.indexOf('hour') > -1){
        query = s.dateSubtract(today,'hour',amount)
    }
    return query
}
s.mergeQueryValues = function(query,values){
    if(!values){values=[]}
    var valuesNotFunction = true;
    if(typeof values === 'function'){
        var values = [];
        valuesNotFunction = false;
    }
    if(values&&valuesNotFunction){
        var splitQuery = query.split('?')
        var newQuery = ''
        splitQuery.forEach(function(v,n){
            newQuery += v
            var value = values[n]
            if(value){
                if(isNaN(value) || value instanceof Date){
                    newQuery += "'"+value+"'"
                }else{
                    newQuery += value
                }
            }
        })
    }else{
        newQuery = query
    }
    return newQuery
}
s.stringToSqlTime = function(value){
    newValue = new Date(value.replace('T',' '))
    return newValue
}
s.sqlQuery = function(query,values,onMoveOn){
    if(!values){values=[]}
    if(typeof values === 'function'){
        var onMoveOn = values;
        var values = [];
    }
    if(!onMoveOn){onMoveOn=function(){}}
    var mergedQuery = s.mergeQueryValues(query,values)
    s.debugLog('s.sqlQuery QUERY',mergedQuery)
    return s.databaseEngine
    .raw(query,values)
    .asCallback(function(err,r){
        if(err){
            console.log('s.sqlQuery QUERY ERRORED',query)
            console.log('s.sqlQuery ERROR',err)
        }
        if(onMoveOn && typeof onMoveOn === 'function'){
            switch(databaseOptions.client){
                case'sqlite3':
                    if(!r)r=[]
                break;
                default:
                    if(r)r=r[0]
                break;
            }
            onMoveOn(err,r)
        }
    })
}
const cleanSqlWhereObject = (where) => {
    const newWhere = {}
    Object.keys(where).forEach((key) => {
        if(key !== '__separator'){
            const value = where[key]
            newWhere[key] = value
        }
    })
    return newWhere
}
const processSimpleWhereCondition = (dbQuery,where,didOne) => {
    var whereIsArray = where instanceof Array;
    if(where[0] === 'or' || where.__separator === 'or'){
        if(whereIsArray){
            where.shift()
            dbQuery.orWhere(...where)
        }else{
            where = cleanSqlWhereObject(where)
            dbQuery.orWhere(where)
        }
    }else if(!didOne){
        didOne = true
        whereIsArray ? dbQuery.where(...where) : dbQuery.where(where)
    }else{
        whereIsArray ? dbQuery.andWhere(...where) : dbQuery.andWhere(where)
    }
}
const processWhereCondition = (dbQuery,where,didOne) => {
    var whereIsArray = where instanceof Array;
    if(!where[0])return;
    if(where[0] && where[0] instanceof Array){
        dbQuery.where(function() {
            var _this = this
            var didOneInsideGroup = false
            where.forEach((whereInsideGroup) => {
                processWhereCondition(_this,whereInsideGroup,didOneInsideGroup)
            })
        })
    }else if(where[0] && where[0] instanceof Object){
        dbQuery.where(function() {
            var _this = this
            var didOneInsideGroup = false
            where.forEach((whereInsideGroup) => {
                processSimpleWhereCondition(_this,whereInsideGroup,didOneInsideGroup)
            })
        })
    }else{
        processSimpleWhereCondition(dbQuery,where,didOne)
    }
}
const knexError = (dbQuery,options,err) => {
    console.error('knexError----------------------------------- START')
    if(config.debugLogVerbose && config.debugLog === true){
        s.debugLog('s.knexQuery QUERY',JSON.stringify(options,null,3))
        s.debugLog('STACK TRACE, NOT AN ',new Error())
    }
    console.error(err)
    console.error(dbQuery.toString())
    console.error('knexError----------------------------------- END')
}
const knexQuery = (options,callback) => {
    try{
        if(!s.databaseEngine)return// console.log('Database Not Set');
        // options = {
        //     action: "",
        //     columns: "",
        //     table: ""
        // }
        var dbQuery
        switch(options.action){
            case'select':
                options.columns = options.columns.indexOf(',') === -1 ? [options.columns] : options.columns.split(',');
                dbQuery = s.databaseEngine.select(...options.columns).from(options.table)
            break;
            case'count':
                options.columns = options.columns.indexOf(',') === -1 ? [options.columns] : options.columns.split(',');
                dbQuery = s.databaseEngine(options.table)
                dbQuery.count(options.columns)
            break;
            case'update':
                dbQuery = s.databaseEngine(options.table).update(options.update)
            break;
            case'delete':
                dbQuery = s.databaseEngine(options.table)
            break;
            case'insert':
                dbQuery = s.databaseEngine(options.table).insert(options.insert)
            break;
        }
        if(options.where instanceof Array){
            var didOne = false;
            options.where.forEach((where) => {
                processWhereCondition(dbQuery,where,didOne)
            })
        }else if(options.where instanceof Object){
            dbQuery.where(options.where)
        }
        if(options.action === 'delete'){
            dbQuery.del()
        }
        if(options.orderBy){
            dbQuery.orderBy(...options.orderBy)
        }
        if(options.groupBy){
            dbQuery.groupBy(options.groupBy)
        }
        if(options.limit){
            if(`${options.limit}`.indexOf(',') === -1){
                dbQuery.limit(options.limit)
            }else{
                const limitParts = `${options.limit}`.split(',')
                dbQuery.limit(limitParts[0]).offset(limitParts[1])
            }
        }
        if(config.debugLog === true){
            console.log(dbQuery.toString())
        }
        if(callback || options.update || options.insert || options.action === 'delete'){
            dbQuery.asCallback(function(err,r) {
                if(err){
                    knexError(dbQuery,options,err)
                }
                if(callback)callback(err,r)
                if(config.debugLogVerbose && config.debugLog === true){
                    s.debugLog('s.knexQuery QUERY',JSON.stringify(options,null,3))
                    s.debugLog('s.knexQuery RESPONSE',JSON.stringify(r,null,3))
                    s.debugLog('STACK TRACE, NOT AN ',new Error())
                }
            })
        }
        return dbQuery
    }catch(err){
        if(callback)callback(err,[])
        knexError(dbQuery,options,err)
    }
}
s.debugLog = function(arg1,arg2){
    if(config.debugLog === true){
        if(!arg2)arg2 = ''
        console.log(arg1,arg2)
    }
}

//containers
var overlapLocks = {}
s.alreadyDeletedRowsWithNoVideosOnStart={};
//functions
s.checkCorrectPathEnding=function(x){
    var length=x.length
    if(x.charAt(length-1)!=='/'){
        x=x+'/'
    }
    return x.replace('__DIR__',__dirname)
}
s.dir={
    videos:s.checkCorrectPathEnding(config.videosDir),
    fileBin:s.checkCorrectPathEnding(config.binDir),
    addStorage:config.addStorage,
};
s.moment=function(e,x){
    if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
    return moment(e).format(x);
}
s.utcToLocal = function(time){
    return moment.utc(time).utcOffset(s.utcOffset).format()
}
s.localToUtc = function(time){
    return moment(time).utc()
}
s.nameToTime = function(x){x=x.replace('.webm','').replace('.mp4','').split('T'),x[1]=x[1].replace(/-/g,':');x=x.join(' ');return x;}
io = require('socket.io-client')('ws://'+config.ip+':'+config.port,{transports:['websocket']});//connect to master
s.cx = function(x){x.cronKey=config.cron.key;return io.emit('cron',x)}
//emulate master socket emitter
s.tx = function(x,y){s.cx({f:'s.tx',data:x,to:y})}
s.deleteVideo = function(x){s.cx({f:'s.deleteVideo',file:x})}
//Cron Job
s.cx({f:'init',time:moment()})
s.getVideoDirectory = function(e){
    if(e.mid&&!e.id){e.id=e.mid};
    if(e.details&&(e.details instanceof Object)===false){
        try{e.details=JSON.parse(e.details)}catch(err){}
    }
    if(e.details.dir&&e.details.dir!==''){
        return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
    }else{
        return s.dir.videos+e.ke+'/'+e.id+'/';
    }
}
s.getFileBinDirectory = function(e){
    if(e.mid&&!e.id){e.id=e.mid};
    return s.dir.fileBin+e.ke+'/'+e.id+'/';
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
            "p3":s.sqlDate(v.d.days+" DAY")
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
                            s.cx({f:'filterMatch',msg:r.length+' SQL rows match "'+m+'"',ke:v.ke,time:moment()})
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
                            s.cx({f:'filters',ff:'archive',videos:r,time:moment(),ke:v.ke,id:b.id});
                        }else if(b.delete==="1"){
                            s.cx({f:'filters',ff:'delete',videos:r,time:moment(),ke:v.ke,id:b.id});
                        }
                        if(b.email==="1"){
                            b.cx.ff='email';
                            b.cx.delete=b.delete;
                            b.cx.mail=v.mail;
                            b.cx.execute=b.execute;
                            b.cx.query=b.sql;
                            s.cx(b.cx);
                        }
                        if(b.execute&&b.execute!==""){
                            s.cx({f:'filters',ff:'execute',execute:b.execute,time:moment()});
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
            (config.cron.deleteNoVideoRecursion===false&&!s.alreadyDeletedRowsWithNoVideosOnStart[v.ke])
        )
    ){
        s.alreadyDeletedRowsWithNoVideosOnStart[v.ke]=true;
        knexQuery({
            action: "select",
            columns: "*",
            table: "Videos",
            where: [
                ['ke','=',v.ke],
                ['status','!=','0'],
                ['details','NOT LIKE','%"archived":"1"%'],
                ['time','<',s.sqlDate('10 MINUTE')],
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
                    var dir = s.getVideoDirectory(ev)
                    if(details.isUTC === true){
                        filename = s.localToUtc(ev.time).format('YYYY-MM-DDTHH-mm-ss')+'.'+ev.ext
                    }else{
                        filename = s.moment(ev.time)+'.'+ev.ext
                    }
                    fileExists = fs.existsSync(dir+filename)
                    if(fileExists !== true){
                        s.deleteVideo(ev)
                        s.tx({f:'video_delete',filename:filename+'.'+ev.ext,mid:ev.mid,ke:ev.ke,time:ev.time,end:s.moment(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+ev.ke);
                    }
                });
                if(videosToDelete.length>0 || config.debugLog === true){
                    s.cx({f:'deleteNoVideo',msg:videosToDelete.length+' SQL rows with no file deleted',ke:v.ke,time:moment()})
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
                ['time','<',s.sqlDate(v.d.log_days+' DAY')],
            ]
        },(err,rrr) => {
            callback()
            if(err)return console.error(err);
            if(rrr.affectedRows && rrr.affectedRows.length>0 || config.debugLog === true){
                s.cx({f:'deleteLogs',msg:(rrr.affectedRows || 0)+' SQL rows older than '+v.d.log_days+' days deleted',ke:v.ke,time:moment()})
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
                ['time','<',s.sqlDate(v.d.event_days+' DAY')],
            ]
        },(err,rrr) => {
            callback()
            if(err)return console.error(err);
            if(rrr.affectedRows && rrr.affectedRows.length > 0 || config.debugLog === true){
                s.cx({f:'deleteEvents',msg:(rrr.affectedRows || 0)+' SQL rows older than '+v.d.event_days+' days deleted',ke:v.ke,time:moment()})
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
                ['time','<',s.sqlDate(v.d.event_days+' DAY')],
            ]
        },(err,rrr) => {
            callback()
            if(err && err.code !== 'ER_NO_SUCH_TABLE')return console.error(err);
            if(rrr.affectedRows && rrr.affectedRows.length > 0 || config.debugLog === true){
                s.cx({f:'deleteEvents',msg:(rrr.affectedRows || 0)+' SQL rows older than '+v.d.event_days+' days deleted',ke:v.ke,time:moment()})
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
                ['time','<',s.sqlDate(v.d.fileBin_days+' DAY')],
            ]
        },(err,files) => {
            if(files&&files[0]){
                //delete the files
                files.forEach(function(file){
                    fs.unlink(s.getFileBinDirectory(file)+file.name,function(err){
//                        if(err)console.error(err)
                    })
                })
                //delete the database rows
                knexQuery({
                    action: "delete",
                    table: "Files",
                    where: [
                        ['ke','=',v.ke],
                        ['time','<',s.sqlDate(v.d.fileBin_days+' DAY')],
                    ]
                },(err,rrr) => {
                    callback()
                    if(err)return console.error(err);
                    if(rrr.affectedRows && rrr.affectedRows.length>0 || config.debugLog === true){
                        s.cx({f:'deleteFileBins',msg:(rrr.affectedRows || 0)+' files older than '+v.d.fileBin_days+' days deleted',ke:v.ke,time:moment()})
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
    if(!s.alreadyDeletedRowsWithNoVideosOnStart[v.ke]){
        s.alreadyDeletedRowsWithNoVideosOnStart[v.ke]=false;
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
                            "p3":s.sqlDate(b.details.max_keep_days+" DAY")
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
var theCronInterval = null
const setIntervalForCron = function(){
    clearCronInterval()
    theCronInterval = setInterval(doCronJobs,parseFloat(config.cron.interval)*60000*60)
}
const clearCronInterval = function(){
    clearInterval(theCronInterval)
}
const doCronJobs = function(){
    s.cx({f:'start',time:moment()})
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
setIntervalForCron()
doCronJobs()
//socket commander
io.on('f',function(d){
    switch(d.f){
        case'start':case'restart':
            setIntervalForCron()
        break;
        case'stop':
            clearCronInterval()
        break;
    }
})
console.log('Shinobi : cron.js started')
