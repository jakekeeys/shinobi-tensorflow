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
}
