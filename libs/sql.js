var fs = require('fs');
module.exports = function(s,config){
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
    const {
        knexQuery,
        knexQueryPromise,
        knexError,
        cleanSqlWhereObject,
        processSimpleWhereCondition,
        processWhereCondition,
        mergeQueryValues,
        getDatabaseRows,
        sqlQuery,
        connectDatabase,
        sqlQueryBetweenTimesWithPermissions,
    } = require('./database/utils.js')(s,config)
    s.onBeforeDatabaseLoadExtensions.forEach(function(extender){
        extender(config)
    })
    s.knexQuery = knexQuery
    s.knexQueryPromise = knexQueryPromise
    s.getDatabaseRows = getDatabaseRows
    s.sqlQuery = sqlQuery
    s.connectDatabase = connectDatabase
    s.sqlQueryBetweenTimesWithPermissions = sqlQueryBetweenTimesWithPermissions
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
}
