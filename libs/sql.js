var fs = require('fs');
var async = require("async");
module.exports = function(s,config){
    s.onBeforeDatabaseLoadExtensions.forEach(function(extender){
        extender(config)
    })
    //sql/database connection with knex
    s.databaseOptions = {
      client: config.databaseType,
      connection: config.db,
    }
    if(s.databaseOptions.client.indexOf('sqlite')>-1){
        s.databaseOptions.client = 'sqlite3'
        s.databaseOptions.useNullAsDefault = true
        try{
            require('sqlite3')
        }catch(err){
            console.log('Installing SQlite3 Module...')
            require('child_process').execSync('npm install sqlite3 --unsafe-perm')
        }
    }
    if(s.databaseOptions.client === 'sqlite3' && s.databaseOptions.connection.filename === undefined){
        s.databaseOptions.connection.filename = s.mainDirectory+"/shinobi.sqlite"
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
    s.getUnixDate = function(value){
        newValue = new Date(value).valueOf()
        return newValue
    }
    s.stringToSqlTime = function(value){
        newValue = new Date(value.replace('T',' '))
        return newValue
    }
    var runQuery = async.queue(function(data, callback) {
        s.databaseEngine
        .raw(data.query,data.values)
        .asCallback(callback)
    }, 4);
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
            if(options.where){
                var didOne = false;
                options.where.forEach((where) => {
                    processWhereCondition(dbQuery,where,didOne)
                })
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
            if(callback || options.update || options.insert){
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
    const getDatabaseRows = function(options,callback){
        //current cant handle `end` time
       var whereQuery = [
           ['ke','=',options.groupKey],
       ]
       const monitorRestrictions = options.monitorRestrictions
       var frameLimit = parseInt(options.limit) || 500
       const endIsStartTo = options.endIsStartTo
       const chosenDate = options.date
       const startDate = options.startDate ? s.stringToSqlTime(options.startDate) : null
       const endDate = options.endDate ? s.stringToSqlTime(options.endDate) : null
       const startOperator = options.startOperator || '>='
       const endOperator = options.endOperator || '<='
       const rowType = options.rowType || 'rows'
       if(chosenDate){
           if(chosenDate.indexOf('-') === -1 && !isNaN(chosenDate)){
               chosenDate = parseInt(chosenDate)
           }
           var selectedDate = chosenDate
           if(typeof chosenDate === 'string' && chosenDate.indexOf('.') > -1){
               selectedDate = chosenDate.split('.')[0]
           }
           selectedDate = new Date(selectedDate)
           var utcSelectedDate = new Date(selectedDate.getTime() + selectedDate.getTimezoneOffset() * 60000)
           startDate = moment(utcSelectedDate).format('YYYY-MM-DD HH:mm:ss')
           var dayAfter = utcSelectedDate
           dayAfter.setDate(dayAfter.getDate() + 1)
           endDate = moment(dayAfter).format('YYYY-MM-DD HH:mm:ss')
       }
       if(startDate){
           if(endDate){
               whereQuery.push(['time',startOperator,startDate])
               whereQuery.push([endIsStartTo ? 'time' : 'end',endOperator,endDate])
           }else{
               whereQuery.push(['time',startOperator,startDate])
           }
       }
       if(monitorRestrictions && monitorRestrictions.length > 0){
           whereQuery.push(monitorRestrictions)
       }
       if(options.archived){
           whereQuery.push(['details','LIKE',`%"archived":"1"%`])
       }
       if(options.filename){
           whereQuery.push(['filename','=',options.filename])
           frameLimit = "1";
       }
       options.orderBy = options.orderBy ? options.orderBy : ['time','desc']
       if(options.count)options.groupBy = options.groupBy ? options.groupBy : options.orderBy[0]
       knexQuery({
           action: options.count ? "count" : "select",
           columns: options.columns || "*",
           table: options.table,
           where: whereQuery,
           orderBy: options.orderBy,
           groupBy: options.groupBy,
           limit: frameLimit || '500'
       },(err,r) => {
           if(err){
               callback({
                   ok: false,
                   total: 0,
                   limit: frameLimit,
                   [rowType]: []
               })
           }else{
               r.forEach(function(file){
                   file.details = s.parseJSON(file.details)
               })
               callback({
                   ok: true,
                   total: r.length,
                   limit: frameLimit,
                   [rowType]: r
               })
           }
       })
    }
    s.knexQuery = knexQuery
    s.getDatabaseRows = getDatabaseRows
    s.sqlQuery = function(query,values,onMoveOn,hideLog){
        if(!values){values=[]}
        if(typeof values === 'function'){
            var onMoveOn = values;
            var values = [];
        }
        if(!onMoveOn){onMoveOn=function(){}}
        // if(s.databaseOptions.client === 'pg'){
        //     query = query
        //         .replace(/ NOT LIKE /g," NOT ILIKE ")
        //         .replace(/ LIKE /g," ILIKE ")
        // }
        if(config.debugLog === true){
            var mergedQuery = s.mergeQueryValues(query,values)
            s.debugLog('s.sqlQuery QUERY',mergedQuery)
        }
        if(!s.databaseEngine || !s.databaseEngine.raw){
            s.connectDatabase()
        }
        return runQuery.push({
            query: query,
            values: values
        },function(err,r){
            if(err && !hideLog){
                console.log('s.sqlQuery QUERY ERRORED',query)
                console.log('s.sqlQuery ERROR',err)
            }
            if(onMoveOn && typeof onMoveOn === 'function'){
                switch(s.databaseOptions.client){
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
    s.connectDatabase = function(){
        s.databaseEngine = require('knex')(s.databaseOptions)
    }
    s.preQueries = function(){
        var knex = s.databaseEngine
        var mySQLtail = ''
        if(config.databaseType === 'mysql'){
            mySQLtail = ' ENGINE=InnoDB DEFAULT CHARSET=utf8'
            //add Presets table and modernize
            var createPresetsTableQuery = 'CREATE TABLE IF NOT EXISTS `Presets` (  `ke` varchar(50) DEFAULT NULL,  `name` text,  `details` text,  `type` varchar(50) DEFAULT NULL)'
            s.sqlQuery( createPresetsTableQuery + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
                if(config.databaseType === 'sqlite3'){
                    var aQuery = "ALTER TABLE Presets RENAME TO _Presets_old;"
                        aQuery += createPresetsTableQuery
                        aQuery += "INSERT INTO Presets (`ke`, `name`, `details`, `type`) SELECT `ke`, `name`, `details`, `type` FROM _Presets_old;COMMIT;DROP TABLE _Presets_old;"
                }else{
                    s.sqlQuery('ALTER TABLE `Presets` CHANGE COLUMN `type` `type` VARCHAR(50) NULL DEFAULT NULL AFTER `details`;',[],function(err){
                        if(err)console.error(err)
                    },true)
                }
            },true)
            //add Schedules table, will remove in future
            s.sqlQuery("CREATE TABLE IF NOT EXISTS `Schedules` (`ke` varchar(50) DEFAULT NULL,`name` text,`details` text,`start` varchar(10) DEFAULT NULL,`end` varchar(10) DEFAULT NULL,`enabled` int(1) NOT NULL DEFAULT '1')" + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
            },true)
            //add Timelapses and Timelapse Frames tables, will remove in future
            s.sqlQuery("CREATE TABLE IF NOT EXISTS `Timelapses` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`details` longtext,`date` date NOT NULL,`time` timestamp NOT NULL,`end` timestamp NOT NULL,`size` int(11)NOT NULL)" + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
            },true)
            s.sqlQuery("CREATE TABLE IF NOT EXISTS `Timelapse Frames` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`details` longtext,`filename` varchar(50) NOT NULL,`time` timestamp NULL DEFAULT NULL,`size` int(11) NOT NULL)" + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
            },true)
            //Add index to Videos table
            s.sqlQuery('CREATE INDEX `videos_index` ON Videos(`time`);',[],function(err){
                if(err && err.code !== 'ER_DUP_KEYNAME'){
                    console.error(err)
                }
            },true)
            //Add index to Events table
            s.sqlQuery('CREATE INDEX `events_index` ON Events(`ke`, `mid`, `time`);',[],function(err){
                if(err && err.code !== 'ER_DUP_KEYNAME'){
                    console.error(err)
                }
            },true)
            //Add index to Logs table
            s.sqlQuery('CREATE INDEX `logs_index` ON Logs(`ke`, `mid`, `time`);',[],function(err){
                if(err && err.code !== 'ER_DUP_KEYNAME'){
                    console.error(err)
                }
            },true)
            //Add index to Monitors table
            s.sqlQuery('CREATE INDEX `monitors_index` ON Monitors(`ke`, `mode`, `type`, `ext`);',[],function(err){
                if(err && err.code !== 'ER_DUP_KEYNAME'){
                    console.error(err)
                }
            },true)
            //Add index to Timelapse Frames table
            s.sqlQuery('CREATE INDEX `timelapseframes_index` ON `Timelapse Frames`(`ke`, `mid`, `time`);',[],function(err){
                if(err && err.code !== 'ER_DUP_KEYNAME'){
                    console.error(err)
                }
            },true)
            //add Cloud Videos table, will remove in future
            s.sqlQuery('CREATE TABLE IF NOT EXISTS `Cloud Videos` (`mid` varchar(50) NOT NULL,`ke` varchar(50) DEFAULT NULL,`href` text NOT NULL,`size` float DEFAULT NULL,`time` timestamp NULL DEFAULT NULL,`end` timestamp NULL DEFAULT NULL,`status` int(1) DEFAULT \'0\',`details` text)' + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
            },true)
            //add Events Counts table, will remove in future
            s.sqlQuery('CREATE TABLE IF NOT EXISTS `Events Counts` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`details` longtext NOT NULL,`time` timestamp NOT NULL DEFAULT current_timestamp(),`end` timestamp NOT NULL DEFAULT current_timestamp(),`count` int(10) NOT NULL DEFAULT 1,`tag` varchar(30) DEFAULT NULL)' + mySQLtail + ';',[],function(err){
                if(err && err.code !== 'ER_TABLE_EXISTS_ERROR'){
                    console.error(err)
                }
                s.sqlQuery('ALTER TABLE `Events Counts`	ADD COLUMN `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `details`;',[],function(err){
                    // console.error(err)
                },true)
            },true)
            //add Cloud Timelapse Frames table, will remove in future
            s.sqlQuery('CREATE TABLE IF NOT EXISTS `Cloud Timelapse Frames` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`href` text NOT NULL,`details` longtext,`filename` varchar(50) NOT NULL,`time` timestamp NULL DEFAULT NULL,`size` int(11) NOT NULL)' + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
            },true)
            //create Files table
            var createFilesTableQuery = "CREATE TABLE IF NOT EXISTS `Files` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`name` tinytext NOT NULL,`size` float NOT NULL DEFAULT '0',`details` text NOT NULL,`status` int(1) NOT NULL DEFAULT '0',`time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP)"
            s.sqlQuery(createFilesTableQuery + mySQLtail + ';',[],function(err){
                if(err)console.error(err)
                //add time column to Files table
                if(config.databaseType === 'sqlite3'){
                    var aQuery = "ALTER TABLE Files RENAME TO _Files_old;"
                        aQuery += createPresetsTableQuery
                        aQuery += "INSERT INTO Files (`ke`, `mid`, `name`, `details`, `size`, `status`, `time`) SELECT `ke`, `mid`, `name`, `details`, `size`, `status`, `time` FROM _Files_old;COMMIT;DROP TABLE _Files_old;"
                }else{
                    s.sqlQuery('ALTER TABLE `Files`	ADD COLUMN `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `status`;',[],function(err){
                        if(err && err.sqlMessage && err.sqlMessage.indexOf('Duplicate') === -1)console.error(err)
                    },true)
                }
            },true)
        }
        delete(s.preQueries)
    }
    s.sqlQueryBetweenTimesWithPermissions = (options,callback) => {
        // options = {
        //     table: 'Events Counts',
        //     user: user,
        //     monitorId: req.params.id,
        //     startTime: req.query.start,
        //     endTime: req.query.end,
        //     startTimeOperator: req.query.startOperator,
        //     endTimeOperator: req.query.endOperator,
        //     limit: req.query.limit,
        //     archived: req.query.archived,
        //     endIsStartTo: !!req.query.endIsStartTo,
        //     parseRowDetails: true,
        //     rowName: 'counts'
        // }
        const rowName = options.rowName || 'rows'
        const preliminaryValidationFailed = options.preliminaryValidationFailed || false
        if(preliminaryValidationFailed){
            if(options.noFormat){
                callback([]);
            }else{
                callback({
                    ok: true,
                    [rowName]: [],
                })
            }
            return
        }
        const user = options.user
        const groupKey = options.groupKey
        const monitorId = options.monitorId
        const archived = options.archived
        const theTableSelected = options.table
        const endIsStartTo = options.endIsStartTo
        const userDetails = user.details
        var endTime = options.endTime
        var startTimeOperator = options.startTimeOperator
        var endTimeOperator = options.endTimeOperator
        var startTime = options.startTime
        var limitString = `${options.limit}`
        const monitorRestrictions = s.getMonitorRestrictions(options.user.details,monitorId)
        getDatabaseRows({
            monitorRestrictions: monitorRestrictions,
            table: theTableSelected,
            groupKey: groupKey,
            startDate: startTime,
            endDate: endTime,
            startOperator: startTimeOperator,
            endOperator: endTimeOperator,
            limit: options.limit,
            archived: archived,
            rowType: rowName,
            endIsStartTo: endIsStartTo
        },(response) => {
            const limit = response.limit
            const r = response[rowName];
            if(!r){
                callback({
                    total: 0,
                    limit: response.limit,
                    skip: 0,
                    [rowName]: []
                });
                return
            }
            if(options.parseRowDetails){
                r.forEach((row) => {
                    row.details = JSON.parse(row.details)
                })
            }
            if(options.noCount){
                if(options.noFormat){
                    callback(r)
                }else{
                    callback({
                        ok: true,
                        limit: response.limit,
                        [rowName]: r,
                        endIsStartTo: endIsStartTo
                    })
                }
            }else{
                getDatabaseRows({
                    monitorRestrictions: monitorRestrictions,
                    columns: 'time',
                    count: true,
                    table: theTableSelected,
                    groupKey: groupKey,
                    startDate: startTime,
                    endDate: endTime,
                    startOperator: startTimeOperator,
                    endOperator: endTimeOperator,
                    archived: archived,
                    type: 'count',
                    endIsStartTo: endIsStartTo
                },(response) => {
                    console.log('count')
                    console.log(response)
                    const count = response.count
                    var skipOver = 0
                    if(limitString.indexOf(',') > -1){
                        skipOver = parseInt(limitString.split(',')[0])
                        limitString = parseInt(limitString.split(',')[1])
                    }else{
                        limitString = parseInt(limitString)
                    }
                    callback({
                        total: response['count(*)'],
                        limit: response.limit,
                        skip: skipOver,
                        [rowName]: r,
                        endIsStartTo: endIsStartTo
                    })
                })
            }
        })
    }
}
