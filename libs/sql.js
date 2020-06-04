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
        }
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
        //add Cloud Videos table, will remove in future
        s.sqlQuery('CREATE TABLE IF NOT EXISTS `Cloud Videos` (`mid` varchar(50) NOT NULL,`ke` varchar(50) DEFAULT NULL,`href` text NOT NULL,`size` float DEFAULT NULL,`time` timestamp NULL DEFAULT NULL,`end` timestamp NULL DEFAULT NULL,`status` int(1) DEFAULT \'0\',`details` text)' + mySQLtail + ';',[],function(err){
            if(err)console.error(err)
        },true)
        //add Events Counts table, will remove in future
        s.sqlQuery('CREATE TABLE IF NOT EXISTS `Events Counts` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`details` longtext NOT NULL,`time` timestamp NOT NULL DEFAULT current_timestamp(),`end` timestamp NOT NULL DEFAULT current_timestamp(),`count` int(10) NOT NULL DEFAULT 1,`tag` varchar(30) DEFAULT NULL)' + mySQLtail + ';',[],function(err){
            if(err && err.code !== 'ER_TABLE_EXISTS_ERROR')console.error(err)
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
        const user = options.user
        const groupKey = options.groupKey
        const monitorId = options.monitorId
        const limit = options.limit
        const archived = options.archived
        const theTableSelected = options.table
        const endIsStartTo = options.endIsStartTo
        const userDetails = user.details
        const rowName = options.rowName || 'rows'
        const preliminaryValidationFailed = options.preliminaryValidationFailed || false
        var endTime = options.endTime
        var startTimeOperator = options.startTimeOperator
        var endTimeOperator = options.endTimeOperator
        var startTime = options.startTime
        if(preliminaryValidationFailed){
            callback([]);
            return
        }
        var queryString = 'SELECT * FROM `' + theTableSelected + '` WHERE ke=?'
        var queryValues = [groupKey]
        var queryStringCount = 'SELECT COUNT(*) FROM `' + theTableSelected + '` WHERE ke=?'
        var queryCountValues = [groupKey]
        if(archived === '1'){
            queryString += ` AND details LIKE '%"archived":"1"'`
            queryStringCount += ` AND details LIKE '%"archived":"1"'`
        }
        if(!monitorId){
            if(
                userDetails.sub &&
                userDetails.monitors &&
                userDetails.allmonitors !== '1'
            ){
                try{
                    userDetails.monitors = JSON.parse(userDetails.monitors)
                }catch(er){}
                var queryWheres = []
                userDetails.monitors.forEach(function(v,n){
                    queryWheres.push('mid=?')
                    queryValues.push(v)
                })
                queryString += ' AND ('+queryWheres.join(' OR ')+')'
                queryStringCount += ' AND ('+queryWheres.join(' OR ')+')'
            }
        }else{
            if(
                !userDetails.sub ||
                userDetails.allmonitors !== '0' ||
                userDetails.monitors.indexOf(monitorId) >- 1
            ){
                queryString += ' and mid=?'
                queryValues.push(monitorId)
                queryStringCount += ' and mid=?'
                queryCountValues.push(monitorId)
            }else{
                res.end('[]');
                return;
            }
        }
        if(startTime || endTime){
            if(startTime && startTime !== ''){
                startTime = s.stringToSqlTime(startTime)
            }
            if(endTime && endTime !== ''){
                endTime = s.stringToSqlTime(endTime)
            }
            if(!startTimeOperator || startTimeOperator==''){
                startTimeOperator = startTimeOperator || '>='
            }
            if(!endTimeOperator || endTimeOperator==''){
                endTimeOperator = endTimeOperator || '<='
            }
            var theEndParameter = '`end`'
            if(endIsStartTo){
                theEndParameter = '`time`'
            }
            switch(true){
                case(startTime && startTime !== '' && endTime && endTime !== ''):
                    queryString += ' AND `time` '+startTimeOperator+' ? AND '+theEndParameter+' '+endTimeOperator+' ?';
                    queryStringCount += ' AND `time` '+startTimeOperator+' ? AND '+theEndParameter+' '+endTimeOperator+' ?';
                    queryValues.push(startTime)
                    queryValues.push(endTime)
                    queryCountValues.push(startTime)
                    queryCountValues.push(endTime)
                break;
                case(startTime && startTime !== ''):
                    queryString += ' AND `time` '+startTimeOperator+' ?';
                    queryStringCount += ' AND `time` '+startTimeOperator+' ?';
                    queryValues.push(startTime)
                    queryCountValues.push(startTime)
                break;
                case(endTime && endTime !== ''):
                    queryString += ' AND '+theEndParameter+' '+endTimeOperator+' ?';
                    queryStringCount += ' AND '+theEndParameter+' '+endTimeOperator+' ?';
                    queryValues.push(endTime)
                    queryCountValues.push(endTime)
                break;
            }
        }
        queryString += ' ORDER BY `time` DESC';
        var rowLimit = limit || '100'
        if(rowLimit !== '0'){
            queryString += ' LIMIT ' + rowLimit
        }
        s.sqlQuery(queryString,queryValues,function(err,r){
            if(!r){
                callback({
                    total: 0,
                    limit: rowLimit,
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
                        [rowName]: r,
                        endIsStartTo: endIsStartTo
                    })
                }
            }else{
                s.sqlQuery(queryStringCount,queryCountValues,function(err,count){
                    var skipOver = 0
                    if(rowLimit.indexOf(',') > -1){
                        skipOver = parseInt(rowLimit.split(',')[0])
                        rowLimit = parseInt(rowLimit.split(',')[1])
                    }else{
                        rowLimit = parseInt(rowLimit)
                    }
                    callback({
                        total: count[0]['COUNT(*)'],
                        limit: rowLimit,
                        skip: skipOver,
                        [rowName]: r,
                        endIsStartTo: endIsStartTo
                    })
                })
            }
        })
    }
}
