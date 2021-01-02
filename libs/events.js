var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config,lang){
    const {
        splitForFFPMEG
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const {
        moveCameraPtzToMatrix
    } = require('./control/ptz.js')(s,config,lang)
    const {
        countObjects,
        isAtleastOneMatrixInRegion,
        scanMatricesforCollisions,
        getLargestMatrix,
        addToEventCounter,
        hasMatrices,
        checkEventFilters,
        checkMotionLock,
        runMultiTrigger,
        checkForObjectsInRegions,
        runEventExecutions,
    } = require('./events/utils.js')(s,config,lang)

    s.addEventDetailsToString = function(eventData,string,addOps){
        //d = event data
        if(!addOps)addOps = {}
        var newString = string + ''
        var d = Object.assign(eventData,addOps)
        var detailString = s.stringJSON(d.details)
        newString = newString
            .replace(/{{TIME}}/g,d.currentTimestamp)
            .replace(/{{REGION_NAME}}/g,d.details.name)
            .replace(/{{SNAP_PATH}}/g,s.dir.streams+d.ke+'/'+d.id+'/s.jpg')
            .replace(/{{MONITOR_ID}}/g,d.id)
            .replace(/{{MONITOR_NAME}}/g,s.group[d.ke].rawMonitorConfigurations[d.id].name)
            .replace(/{{GROUP_KEY}}/g,d.ke)
            .replace(/{{DETAILS}}/g,detailString)
        if(d.details.confidence){
            newString = newString
            .replace(/{{CONFIDENCE}}/g,d.details.confidence)
        }
        if(newString.includes("REASON")) {
          if(d.details.reason) {
            newString = newString
            .replace(/{{REASON}}/g, d.details.reason)
          }
        }
        return newString
    }
    s.filterEvents = function(x,d){
        switch(x){
            case'archive':
                d.videos.forEach(function(v,n){
                    s.video('archive',v)
                })
            break;
            case'delete':
                s.deleteListOfVideos(d.videos)
            break;
            case'execute':
                exec(d.execute,{detached: true})
            break;
        }
        s.onEventTriggerBeforeFilterExtensions.forEach(function(extender){
            extender(x,d)
        })
    }
    s.triggerEvent = async (d,forceSave) => {
        var didCountingAlready = false
        const filter = {
            halt : false,
            addToMotionCounter : true,
            useLock : true,
            save : true,
            webhook : true,
            command : true,
            record : true,
            indifference : false,
            countObjects : true
        }
        if(!s.group[d.ke] || !s.group[d.ke].activeMonitors[d.id]){
            return s.systemLog(lang['No Monitor Found, Ignoring Request'])
        }
        const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
        if(!monitorConfig){
            return s.systemLog(lang['No Monitor Found, Ignoring Request'])
        }
        const monitorDetails = monitorConfig.details
        s.onEventTriggerBeforeFilterExtensions.forEach(function(extender){
            extender(d,filter)
        })
        const passedEventFilters = checkEventFilters(d,monitorDetails,filter)
        if(!passedEventFilters)return
        const eventDetails = d.details
        const detailString = JSON.stringify(eventDetails)
        const eventTime = new Date()
        if(
            filter.addToMotionCounter &&
            filter.record &&
            (
                monitorConfig.mode === 'record' ||
                monitorConfig.mode === 'start' &&
                (
                    (
                        monitorDetails.detector_record_method === 'sip' &&
                        monitorDetails.detector_trigger === '1'
                    ) ||
                    (
                        monitorDetails.detector_record_method === 'del' &&
                        monitorDetails.detector_delete_motionless_videos === '1'
                    )
                )
            )
        ){
            addToEventCounter(d)
        }
        if(
            filter.countObjects &&
            monitorDetails.detector_obj_count === '1' &&
            monitorDetails.detector_obj_count_in_region !== '1'
        ){
            didCountingAlready = true
            countObjects(d)
        }
        if(monitorDetails.detector_ptz_follow === '1'){
            moveCameraPtzToMatrix(d,monitorDetails.detector_ptz_follow_target)
        }
        if(filter.useLock){
            const passedMotionLock = checkMotionLock(d,monitorDetails)
            if(!passedMotionLock)return
        }
        const passedObjectInRegionCheck = checkForObjectsInRegions(monitorConfig,filter,d,didCountingAlready)
        if(!passedObjectInRegionCheck)return

        //
        if(d.doObjectDetection === true){
            s.ocvTx({
                f : 'frame',
                mon : s.group[d.ke].rawMonitorConfigurations[d.id].details,
                ke : d.ke,
                id : d.id,
                time : s.formattedTime(),
                frame : s.group[d.ke].activeMonitors[d.id].lastJpegDetectorFrame
            })
        }
        //
        if(
            monitorDetails.detector_use_motion === '0' ||
            d.doObjectDetection !== true
        ){
            runEventExecutions(eventTime,monitorConfig,eventDetails,forceSave,filter,d)
        }
        //show client machines the event
        s.tx({
            f: 'detector_trigger',
            id: d.id,
            ke: d.ke,
            details: eventDetails,
            doObjectDetection: d.doObjectDetection
        },`DETECTOR_${monitorConfig.ke}${monitorConfig.mid}`);
    }
    s.createEventBasedRecording = function(d,fileTime){
        if(!fileTime)fileTime = s.formattedTime()
        const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
        const monitorDetails = s.group[d.ke].activeMonitors[d.id].details
        if(monitorDetails.detector !== '1'){
            return
        }
        var detector_timeout
        if(!monitorDetails.detector_timeout||monitorDetails.detector_timeout===''){
            detector_timeout = 10
        }else{
            detector_timeout = parseFloat(monitorDetails.detector_timeout)
        }
        if(monitorDetails.watchdog_reset === '1' || !s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout){
            clearTimeout(s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout)
            s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout = setTimeout(function(){
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.allowEnd = true
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process.stdin.setEncoding('utf8')
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process.stdin.write('q')
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process.kill('SIGINT')
                delete(s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout)
            },detector_timeout * 1000 * 60)
        }
        if(!s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process){
            s.group[d.ke].activeMonitors[d.id].eventBasedRecording.allowEnd = false;
            const runRecord = function(){
                var filename = fileTime+'.mp4'
                s.userLog(d,{type:lang["Traditional Recording"],msg:lang["Started"]})
                //-t 00:'+s.timeObject(new Date(detector_timeout * 1000 * 60)).format('mm:ss')+'
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process = spawn(config.ffmpegDir,splitForFFPMEG(('-loglevel warning -analyzeduration 1000000 -probesize 1000000 -re -i "'+s.dir.streams+d.ke+'/'+d.id+'/detectorStream.m3u8" -c:v copy -strftime 1 "'+s.getVideoDirectory(monitorConfig) + filename + '"')))
                var ffmpegError='';
                var error
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process.stderr.on('data',function(data){
                    s.userLog(d,{type:lang["Traditional Recording"],msg:data.toString()})
                })
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process.on('close',function(){
                    if(!s.group[d.ke].activeMonitors[d.id].eventBasedRecording.allowEnd){
                        s.userLog(d,{type:lang["Traditional Recording"],msg:lang["Detector Recording Process Exited Prematurely. Restarting."]})
                        runRecord()
                        return
                    }
                    s.insertCompletedVideo(monitorConfig,{
                        file : filename,
                    })
                    s.userLog(d,{type:lang["Traditional Recording"],msg:lang["Detector Recording Complete"]})
                    s.userLog(d,{type:lang["Traditional Recording"],msg:lang["Clear Recorder Process"]})
                    delete(s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process)
                    clearTimeout(s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout)
                    delete(s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout)
                    clearTimeout(s.group[d.ke].activeMonitors[d.id].recordingChecker)
                })
            }
            runRecord()
        }
    }
    s.closeEventBasedRecording = function(e){
        if(s.group[e.ke].activeMonitors[e.id].eventBasedRecording.process){
            clearTimeout(s.group[e.ke].activeMonitors[e.id].eventBasedRecording.timeout)
            s.group[e.ke].activeMonitors[e.id].eventBasedRecording.allowEnd = true;
            s.group[e.ke].activeMonitors[e.id].eventBasedRecording.process.kill('SIGTERM');
        }
        // var stackedProcesses = s.group[e.ke].activeMonitors[e.id].eventBasedRecording.stackable
        // Object.keys(stackedProcesses).forEach(function(key){
        //     var item = stackedProcesses[key]
        //     clearTimeout(item.timeout)
        //     item.allowEnd = true;
        //     item.process.kill('SIGTERM');
        // })
    }
}
