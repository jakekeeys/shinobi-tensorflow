const moment = require('moment');
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const request = require('request');
// Matrix In Region Libs >
const SAT = require('sat')
const V = SAT.Vector;
const P = SAT.Polygon;
const B = SAT.Box;
// Matrix In Region Libs />
module.exports = (s,config,lang,app,io) => {
    const countObjects = async (event) => {
        const matrices = event.details.matrices
        const eventsCounted = s.group[event.ke].activeMonitors[event.id].eventsCounted || {}
        if(matrices){
            matrices.forEach((matrix)=>{
                const id = matrix.tag
                if(!eventsCounted[id])eventsCounted[id] = {times: [], count: {}, tag: matrix.tag}
                if(!isNaN(matrix.id))eventsCounted[id].count[matrix.id] = 1
                eventsCounted[id].times.push(new Date().getTime())
            })
        }
        return eventsCounted
    }
    const isAtleastOneMatrixInRegion = function(regions,matrices,callback){
        var regionPolys = []
        var matrixPoints = []
        regions.forEach(function(region,n){
            var polyPoints = []
            region.points.forEach(function(point){
                polyPoints.push(new V(parseInt(point[0]),parseInt(point[1])))
            })
            regionPolys[n] = new P(new V(0,0), polyPoints)
        })
        var collisions = []
        var foundInRegion = false
        matrices.forEach(function(matrix){
            var matrixPoly = new B(new V(matrix.x, matrix.y), matrix.width, matrix.height).toPolygon()
            regionPolys.forEach(function(region,n){
                var response = new SAT.Response()
                var collided = SAT.testPolygonPolygon(matrixPoly, region, response)
                if(collided === true){
                    collisions.push({
                        matrix: matrix,
                        region: regions[n]
                    })
                    foundInRegion = true
                }
            })
        })
        if(callback)callback(foundInRegion,collisions)
        return foundInRegion
    }
    const scanMatricesforCollisions = function(region,matrices){
        var matrixPoints = []
        var collisions = []
        if (!region || !matrices){
            if(callback)callback(collisions)
            return collisions
        }
        var polyPoints = []
        region.points.forEach(function(point){
            polyPoints.push(new V(parseInt(point[0]),parseInt(point[1])))
        })
        var regionPoly = new P(new V(0,0), polyPoints)
        matrices.forEach(function(matrix){
            if (matrix){
                var matrixPoly = new B(new V(matrix.x, matrix.y), matrix.width, matrix.height).toPolygon()
                var response = new SAT.Response()
                var collided = SAT.testPolygonPolygon(matrixPoly, regionPoly, response)
                if(collided === true){
                    collisions.push(matrix)
                }
            }
        })
        return collisions
    }
    const getLargestMatrix = (matrices) => {
        var largestMatrix = {width: 0, height: 0}
        matrices.forEach((matrix) => {
            if(matrix.width > largestMatrix.width && matrix.height > largestMatrix.height)largestMatrix = matrix
        })
        return largestMatrix.x ? largestMatrix : null
    }
    const addToEventCounter = (eventData) => {
        const eventsCounted = s.group[eventData.ke].activeMonitors[eventData.id].detector_motion_count
        s.debugLog(`addToEventCounter`,eventData,eventsCounted.length)
        eventsCounted.push(eventData)
    }
    const clearEventCounter = (groupKey,monitorId) => {
        s.group[eventData.ke].activeMonitors[eventData.id].detector_motion_count = []
    }
    const getEventsCounted = (groupKey,monitorId) => {
        return s.group[eventData.ke].activeMonitors[eventData.id].detector_motion_count.length
    }
    const hasMatrices = (monitorDetails) => {
        return (monitorDetails.matrices && monitorDetails.matrices.length > 0)
    }
    const checkEventFilters = (d,monitorDetails,filter) => {
        if(
            monitorDetails.use_detector_filters === '1' &&
            ((monitorDetails.use_detector_filters_object === '1' && d.details.matrices) ||
            monitorDetails.use_detector_filters_object !== '1')
        ){
            const parseValue = function(key,val){
                var newVal
                switch(val){
                    case'':
                        newVal = filter[key]
                    break;
                    case'0':
                        newVal = false
                    break;
                    case'1':
                        newVal = true
                    break;
                    default:
                        newVal = val
                    break;
                }
                return newVal
            }
            const filters = monitorDetails.detector_filters
            Object.keys(filters).forEach(function(key){
                var conditionChain = {}
                var dFilter = filters[key]
                dFilter.where.forEach(function(condition,place){
                    conditionChain[place] = {ok:false,next:condition.p4,matrixCount:0}
                    if(d.details.matrices)conditionChain[place].matrixCount = d.details.matrices.length
                    var modifyFilters = function(toCheck,matrixPosition){
                        var param = toCheck[condition.p1]
                        var pass = function(){
                            if(matrixPosition && dFilter.actions.halt === '1'){
                                delete(d.details.matrices[matrixPosition])
                            }else{
                                conditionChain[place].ok = true
                            }
                        }
                        switch(condition.p2){
                            case'indexOf':
                                if(param.indexOf(condition.p3) > -1){
                                    pass()
                                }
                            break;
                            case'!indexOf':
                                if(param.indexOf(condition.p3) === -1){
                                    pass()
                                }
                            break;
                            default:
                                if(eval('param '+condition.p2+' "'+condition.p3.replace(/"/g,'\\"')+'"')){
                                    pass()
                                }
                            break;
                        }
                    }
                    switch(condition.p1){
                        case'tag':
                        case'x':
                        case'y':
                        case'height':
                        case'width':
                        case'confidence':
                            if(d.details.matrices){
                                d.details.matrices.forEach(function(matrix,position){
                                    modifyFilters(matrix,position)
                                })
                            }
                        break;
                        case'time':
                            var timeNow = new Date()
                            var timeCondition = new Date()
                            var doAtTime = condition.p3.split(':')
                            var atHour = parseInt(doAtTime[0]) - 1
                            var atHourNow = timeNow.getHours()
                            var atMinuteNow = timeNow.getMinutes()
                            var atSecondNow = timeNow.getSeconds()
                            if(atHour){
                                var atMinute = parseInt(doAtTime[1]) - 1 || timeNow.getMinutes()
                                var atSecond = parseInt(doAtTime[2]) - 1 || timeNow.getSeconds()
                                var nowAddedInSeconds = atHourNow * 60 * 60 + atMinuteNow * 60 + atSecondNow
                                var conditionAddedInSeconds = atHour * 60 * 60 + atMinute * 60 + atSecond
                                if(eval('nowAddedInSeconds '+condition.p2+' conditionAddedInSeconds')){
                                    conditionChain[place].ok = true
                                }
                            }
                        break;
                        default:
                            modifyFilters(d.details)
                        break;
                    }
                })
                var conditionArray = Object.values(conditionChain)
                var validationString = ''
                conditionArray.forEach(function(condition,number){
                    validationString += condition.ok+' '
                    if(conditionArray.length-1 !== number){
                        validationString += condition.next+' '
                    }
                })
                if(eval(validationString)){
                    if(dFilter.actions.halt !== '1'){
                        delete(dFilter.actions.halt)
                        Object.keys(dFilter.actions).forEach(function(key){
                            var value = dFilter.actions[key]
                            filter[key] = parseValue(key,value)
                        })
                    }else{
                        filter.halt = true
                    }
                }
            })
            if(d.details.matrices && d.details.matrices.length === 0 || filter.halt === true){
                return false
            }else if(hasMatrices(monitorDetails)){
                var reviewedMatrix = []
                d.details.matrices.forEach(function(matrix){
                    if(matrix)reviewedMatrix.push(matrix)
                })
                d.details.matrices = reviewedMatrix
            }
        }
        // check modified indifference
        if(
            filter.indifference !== false &&
            eventDetails.confidence < parseFloat(filter.indifference)
        ){
            // fails indifference check for modified indifference
            return
        }
        return true
    }
    const checkMotionLock = (eventData,monitorDetails) => {
        if(s.group[eventData.ke].activeMonitors[eventData.id].motion_lock){
            return false
        }
        var detector_lock_timeout
        if(!monitorDetails.detector_lock_timeout||monitorDetails.detector_lock_timeout===''){
            detector_lock_timeout = 2000
        }
        detector_lock_timeout = parseFloat(monitorDetails.detector_lock_timeout);
        if(!s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout){
            s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout=setTimeout(function(){
                clearTimeout(s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout)
                delete(s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout)
            },detector_lock_timeout)
        }else{
            return false
        }
        return true
    }
    const runMultiTrigger = (monitorConfig,eventDetails) => {
        s.getCamerasForMultiTrigger(monitorConfig).forEach(function(monitor){
            if(monitor.mid !== d.id){
                s.triggerEvent({
                    id: monitor.mid,
                    ke: monitor.ke,
                    details: {
                        confidence: 100,
                        name: "multiTrigger",
                        plug: eventDetails.plug,
                        reason: eventDetails.reason
                    }
                })
            }
        })
    }
    const runEventExecutions = async (eventTime,monitorConfig,eventDetails,forceSave,filter,d) => {
        const monitorDetails = monitorConfig.details
        if(monitorDetails.det_multi_trig === '1'){
            runMultiTrigger(monitorConfig,eventDetails)
        }
        //save this detection result in SQL, only coords. not image.
        if(forceSave || (filter.save && monitorDetails.detector_save === '1')){
            s.knexQuery({
                action: "insert",
                table: "Events",
                insert: {
                    ke: d.ke,
                    mid: d.id,
                    details: detailString,
                    time: eventTime,
                }
            })
        }
        if(monitorDetails.detector === '1' && monitorDetails.detector_notrigger === '1'){
            s.setNoEventsDetector(monitorConfig)
        }
        var detector_timeout
        if(!monitorDetails.detector_timeout||monitorDetails.detector_timeout===''){
            detector_timeout = 10
        }else{
            detector_timeout = parseFloat(monitorDetails.detector_timeout)
        }
        if(
            filter.record &&
            monitorConfig.mode === 'start' &&
            monitorDetails.detector_trigger === '1' &&
            (monitorDetails.detector_record_method === 'sip' || monitorDetails.detector_record_method === 'hot')
        ){
            s.createEventBasedRecording(d,moment(eventTime).subtract(5,'seconds').format('YYYY-MM-DDTHH-mm-ss'))
        }
        d.currentTime = eventTime
        d.currentTimestamp = s.timeObject(d.currentTime).format()
        d.screenshotName =  eventDetails.reason + '_'+(monitorConfig.name.replace(/[^\w\s]/gi,''))+'_'+d.id+'_'+d.ke+'_'+s.formattedTime()
        d.screenshotBuffer = null

        if(filter.webhook && monitorDetails.detector_webhook === '1' && !s.group[d.ke].activeMonitors[d.id].detector_webhook){
            s.group[d.ke].activeMonitors[d.id].detector_webhook = s.createTimeout('detector_webhook',s.group[d.ke].activeMonitors[d.id],monitorDetails.detector_webhook_timeout,10)
            var detector_webhook_url = s.addEventDetailsToString(d,monitorDetails.detector_webhook_url)
            var webhookMethod = monitorDetails.detector_webhook_method
            if(!webhookMethod || webhookMethod === '')webhookMethod = 'GET'
            request(detector_webhook_url,{method: webhookMethod,encoding:null},function(err,data){
                if(err){
                    s.userLog(d,{type:lang["Event Webhook Error"],msg:{error:err,data:data}})
                }
            })
        }

        if(filter.command && monitorDetails.detector_command_enable === '1' && !s.group[d.ke].activeMonitors[d.id].detector_command){
            s.group[d.ke].activeMonitors[d.id].detector_command = s.createTimeout('detector_command',s.group[d.ke].activeMonitors[d.id],monitorDetails.detector_command_timeout,10)
            var detector_command = s.addEventDetailsToString(d,monitorDetails.detector_command)
            if(detector_command === '')return
            exec(detector_command,{detached: true},function(err){
                if(err)s.debugLog(err)
            })
        }

        for (var i = 0; i < s.onEventTriggerExtensions.length; i++) {
            const extender = s.onEventTriggerExtensions[i]
            await extender(d,filter)
        }
    }
    const checkForObjectsInRegions = (monitorConfig,filter,d,didCountingAlready) => {
        const monitorDetails = monitorConfig.details
        if(hasMatrices(monitorDetails) && monitorDetails.detector_obj_region === '1'){
            var regions = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].parsedObjects.cords
            var isMatrixInRegions = isAtleastOneMatrixInRegion(regions,eventDetails.matrices)
            if(isMatrixInRegions){
                s.debugLog('Matrix in region!')
                if(filter.countObjects && monitorDetails.detector_obj_count === '1' && monitorDetails.detector_obj_count_in_region === '1' && !didCountingAlready){
                    countObjects(d)
                }
            }else{
                return false
            }
        }
        return true
    }
    return {
        countObjects: countObjects,
        isAtleastOneMatrixInRegion: isAtleastOneMatrixInRegion,
        scanMatricesforCollisions: scanMatricesforCollisions,
        getLargestMatrix: getLargestMatrix,
        addToEventCounter: addToEventCounter,
        clearEventCounter: clearEventCounter,
        getEventsCounted: getEventsCounted,
        hasMatrices: hasMatrices,
        checkEventFilters: checkEventFilters,
        checkMotionLock: checkMotionLock,
        runMultiTrigger: runMultiTrigger,
        checkForObjectsInRegions: checkForObjectsInRegions,
        runEventExecutions: runEventExecutions,
    }
}
