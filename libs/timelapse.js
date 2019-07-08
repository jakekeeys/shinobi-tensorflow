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
            s.insertTimelapseFrameDatabaseRow(e,queryInfo,filePath)
        }
    }
    s.insertTimelapseFrameDatabaseRow = function(e,queryInfo,filePath){
        s.sqlQuery('INSERT INTO `Timelapse Frames` ('+Object.keys(queryInfo).join(',')+') VALUES (?,?,?,?,?,?)',Object.values(queryInfo))
        s.setDiskUsedForGroup(e,queryInfo.size / 1000000,'timelapeFrames')
        s.purgeDiskForGroup(e)
        s.onInsertTimelapseFrameExtensions.forEach(function(extender){
            extender(e,queryInfo,filePath)
        })
    }
    s.onDeleteTimelapseFrameFromCloudExtensions = {}
    s.onDeleteTimelapseFrameFromCloudExtensionsRunner = function(e,storageType,video){
        // e = user
        if(!storageType){
            var videoDetails = JSON.parse(r.details)
            videoDetails.type = videoDetails.type || 's3'
        }
        if(s.onDeleteTimelapseFrameFromCloudExtensions[storageType]){
            s.onDeleteTimelapseFrameFromCloudExtensions[storageType](e,video,function(){
                s.tx({
                    f: 'timelapse_frame_delete_cloud',
                    mid: e.mid,
                    ke: e.ke,
                    time: e.time,
                    end: e.end
                },'GRP_'+e.ke);
            })
        }
    }
    s.deleteTimelapseFrameFromCloud = function(e){
        // e = video object
        s.checkDetails(e)
        var frameSelector = [e.id,e.ke,new Date(e.time)]
        s.sqlQuery('SELECT * FROM `Cloud Timelapse Frames` WHERE `mid`=? AND `ke`=? AND `time`=?',frameSelector,function(err,r){
            if(r&&r[0]){
                r = r[0]
                s.sqlQuery('DELETE FROM `Cloud Timelapse Frames` WHERE `mid`=? AND `ke`=? AND `time`=?',frameSelector,function(){
                    s.onDeleteTimelapseFrameFromCloudExtensionsRunner(e,r)
                })
            }else{
//                    console.log('Delete Failed',e)
//                    console.error(err)
            }
        })
    }
}
