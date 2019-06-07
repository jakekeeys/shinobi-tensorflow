var fs = require('fs')
var express = require('express')
module.exports = function(s,config,lang,app,io){
    s.getTimelapseFrameDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid}
        s.checkDetails(e)
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'_timelapse/'
        }else{
            return s.dir.videos+e.ke+'/'+e.id+'_timelapse/';
        }
    }
    s.createTimelapseFrameAndInsert = function(e,location,filename){
        //e = monitor object
        //location = file location
        var filePath = location + filename
        var fileStats = fs.statSync(filePath)
        var details = {}
        if(e.details && e.details.dir && e.details.dir !== ''){
            details.dir = e.details.dir
        }
        var timeNow = new Date()
        var queryInfo = {
            ke: e.ke,
            mid: e.id,
            details: s.s(details),
            filename: filename,
            size: fileStats.size,
            time: timeNow
        }
        if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
            var currentDate = s.formattedTime(queryInfo.time,'YYYY-MM-DD')
            s.cx({
                f: 'open_timelapse_file_transfer',
                ke: e.ke,
                mid: e.id,
                d: s.group[e.ke].mon_conf[e.id],
                filename: filename,
                currentDate: currentDate,
                queryInfo: queryInfo
            })
            var formattedTime = s.timeObject(timeNow).format()
            fs.createReadStream(filePath,{ highWaterMark: 500 })
            .on('data',function(data){
                s.cx({
                    f: 'created_timelapse_file_chunk',
                    ke: e.ke,
                    mid: e.id,
                    time: formattedTime,
                    filesize: e.filesize,
                    chunk: data,
                    d: s.group[e.ke].mon_conf[e.id],
                    filename: filename,
                    currentDate: currentDate,
                    queryInfo: queryInfo
                })
            })
            .on('close',function(){
                s.cx({
                    f: 'created_timelapse_file',
                    ke: e.ke,
                    mid: e.id,
                    time: formattedTime,
                    filesize: e.filesize,
                    d: s.group[e.ke].mon_conf[e.id],
                    filename: filename,
                    currentDate: currentDate,
                    queryInfo: queryInfo
                })
            })
        }else{
            s.insertTimelapseFrameDatabaseRow(e,queryInfo)
        }
    }
    s.insertTimelapseFrameDatabaseRow = function(e,queryInfo){
        s.sqlQuery('INSERT INTO `Timelapse Frames` ('+Object.keys(queryInfo).join(',')+') VALUES (?,?,?,?,?,?)',Object.values(queryInfo))
        s.setDiskUsedForGroup(e,queryInfo.size / 1000000,'timelapeFrames')
        s.purgeDiskForGroup(e)
        s.onInsertTimelapseFrameExtensions.forEach(function(extender){
            extender(e,queryInfo)
        })
    }
}
