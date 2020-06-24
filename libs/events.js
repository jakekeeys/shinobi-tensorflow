var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var request = require('request');
// Matrix In Region Libs >
var SAT = require('sat')
var V = SAT.Vector;
var P = SAT.Polygon;
var B = SAT.Box;
// Matrix In Region Libs />
module.exports = function(s,config,lang){
    const ptz = require('./control/ptz.js')(s,config,lang)
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
    const nonEmpty = (element) => element.length !== 0;
    const moveLock = {}
    const getLargestMatrix = (matrices) => {
        var largestMatrix = {width: 0, height: 0}
        matrices.forEach((matrix) => {
            if(matrix.width > largestMatrix.width && matrix.height > largestMatrix.height)largestMatrix = matrix
        })
        return largestMatrix.x ? largestMatrix : null
    }
    const moveCameraPtzToMatrix = function(event,trackingTarget){
        if(moveLock[event.ke + event.id])return;
        clearTimeout(moveLock[event.ke + event.id])
        moveLock[event.ke + event.id] = setTimeout(() => {
            delete(moveLock[event.ke + event.id])
        },1000)
        const imgHeight = event.details.imgHeight
        const imgWidth = event.details.imgWidth
        const thresholdX = imgWidth * 0.125
        const thresholdY = imgHeight * 0.125
        const imageCenterX = imgWidth / 2
        const imageCenterY = imgHeight / 2
        const matrices = event.details.matrices
        const largestMatrix = getLargestMatrix(matrices.filter(matrix => matrix.tag === (trackingTarget || 'person')))
        // console.log(matrices.find(matrix => matrix.tag === 'person'))
        if(!largestMatrix)return;
        const matrixCenterX = largestMatrix.x + (largestMatrix.width / 2)
        const matrixCenterY = largestMatrix.y + (largestMatrix.height / 2)
        const rawDistanceX = (matrixCenterX - imageCenterX)
        const rawDistanceY = (matrixCenterY - imageCenterY)
        const distanceX = imgWidth / rawDistanceX
        const distanceY = imgHeight / rawDistanceY
        const axisX = rawDistanceX > thresholdX || rawDistanceX < -thresholdX ? distanceX : 0
        const axisY = largestMatrix.y < 30 && largestMatrix.height > imgHeight * 0.8 ? 0.5 : rawDistanceY > thresholdY || rawDistanceY < -thresholdY ? -distanceY : 0
        if(axisX !== 0 || axisY !== 0){
            ptz.control({
                axis: [
                    {direction: 'x', amount: axisX === 0 ? 0 : axisX > 0 ? 0.01 : -0.01},
                    {direction: 'y', amount: axisY === 0 ? 0 : axisY > 0 ? 0.01 : -0.01},
                    {direction: 'z', amount: 0},
                ],
                // axis: [{direction: 'x', amount: 1.0}],
                id: event.id,
                ke: event.ke
            },(msg) => {
                s.userLog(event,msg)
                // console.log(msg)
            })
        }
    }
    s.addEventDetailsToString = function(eventData,string,addOps){
        //d = event data
        if(!addOps)addOps = {}
        var newString = string + ''
        var d = Object.assign(eventData,addOps)
        var detailString = s.stringJSON(d.details)
        newString = newString
            .replace(/{{TIME}}/g,d.currentTimestamp)
            .replace(/{{REGION_NAME}}/g,d.details.name)
            .replace(/{{SNAP_PATH}}/g,s.dir.streams+'/'+d.ke+'/'+d.id+'/s.jpg')
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
    s.triggerEvent = function(d,forceSave){
        var didCountingAlready = false
        var filter = {
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
        s.onEventTriggerBeforeFilterExtensions.forEach(function(extender){
            extender(d,filter)
        })
        if(!s.group[d.ke]||!s.group[d.ke].activeMonitors[d.id]){
            return s.systemLog(lang['No Monitor Found, Ignoring Request'])
        }
        d.mon=s.group[d.ke].rawMonitorConfigurations[d.id];
        var currentConfig = s.group[d.ke].rawMonitorConfigurations[d.id].details
        var hasMatrices = (d.details.matrices && d.details.matrices.length > 0)
        var allMatrices = d.details.matrices
        var matchedMatrices = []
        //read filters
        if(
            currentConfig.use_detector_filters === '1' &&
            ((currentConfig.use_detector_filters_object === '1' && d.details.matrices) ||
            currentConfig.use_detector_filters_object !== '1')
        ){
            var parseValue = function(key,val){
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
            var defaultDrop = true; // forces unmatched events to be dropped
            var testMatrices = [...allMatrices] // default
            var filters = currentConfig.detector_filters
            var hasFilters = (filters.length > 0)
            Object.keys(filters).forEach(function(key){
                var conditionChain = {}
                testMatrices = [...allMatrices] // for new filter reset the matrices to be tested against
                var dFilter = filters[key]
                dFilter.where.forEach(function(condition,place){
                    conditionChain[place] = {ok:false,next:condition.p4,matrixCount:0}
                    if(testMatrices)conditionChain[place].matrixCount = testMatrices.length
                    var modifyFilters = function(toCheck,matrixPosition){
                        var param = toCheck[condition.p1]
                        var pass = function(){
                            conditionChain[place].ok = true
                        }
                        var fail = function(){
                            if (matrixPosition !== undefined) delete(testMatrices[matrixPosition])
                        }
                        switch(condition.p2){
                            case'indexOf':
                                if(param.indexOf(condition.p3) > -1){
                                    pass()
                                } else {
                                    fail()
                                }
                            break;
                            case'!indexOf':
                                if(param.indexOf(condition.p3) === -1){
                                    pass()
                                } else {
                                    fail()
                                }
                            break;
                            default:
                                if(eval('param '+condition.p2+' "'+condition.p3.replace(/"/g,'\\"')+'"')){
                                    pass()
                                } else {
                                    fail()
                                }
                            break;
                        }
                    }
                    if (testMatrices.some(nonEmpty)){
                        switch(condition.p1){
                            case'tag':
                            case'x':
                            case'y':
                            case'height':
                            case'width':
                            case'confidence':
                                if(testMatrices){
                                    testMatrices.forEach(function(matrix,position){
                                        if (matrix) modifyFilters(matrix,position)
                                    })
                                }
                            break;
                            case'name':
                                if (testMatrices){
                                    var regions = s.group[d.ke].activeMonitors[d.id].parsedObjects.cords
                                    regions.forEach(function(region,position){
                                        switch(condition.p2){
                                            case'indexOf':
                                                if(region.name.indexOf(condition.p3) > -1){
                                                    testMatrices = testMatrices.concat(scanMatricesforCollisions(region,testMatrices));
						    if(testMatrices.some(nonEmpty)) conditionChain[place].ok = true; // default is false
                                                }
                                            break;
                                            case'!indexOf':
                                                if(region.name.indexOf(condition.p3) === -1){
                                                    testMatrices = testMatrices.concat(scanMatricesforCollisions(region,testMatrices));
						    if(testMatrices.some(nonEmpty)) conditionChain[place].ok = true; // default is false
                                                }
                                            break;
                                            case'===':
                                                if(region.name === condition.p3){
                                                    testMatrices = scanMatricesforCollisions(region,testMatrices);
						    if(testMatrices.some(nonEmpty)) conditionChain[place].ok = true; // default is false
                                                }
                                            break;
                                            case'!==':
                                                if(region.name !== condition.p3){
                                                    testMatrices = testMatrices.concat(scanMatricesforCollisions(region,testMatrices));
						    if(testMatrices.some(nonEmpty)) conditionChain[place].ok = true; // default is false
                                                }
                                            break;
                                            default:
                                                //s.systemLog(lang['Numeric criteria unsupported for Region tests, Ignoring Conditional'])
                                                s.systemLog('Numeric criteria unsupported for Region tests, Ignoring Conditional')
                                            break;
                                        }
                                    });
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
                    }
                    if (condition.p4 === '||' || dFilter.where.length-1 === place){
                        if (testMatrices.length > 0) matchedMatrices = matchedMatrices.concat(testMatrices)
                        testMatrices = [...allMatrices] // reset matrices for next group of conditions
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
			defaultDrop = false;
                    }else{
                        filter.halt = true
                    }
                }
            })
            if(filter.halt === true){
                return
            }else if(hasMatrices){
                // remove empty elements
                matchedMatrices = matchedMatrices.filter(value => Object.keys(value).length !== 0)
                // remove duplicate matches
                matchedMatrices = matchedMatrices.filter((matrix, index, self) =>
                    index === self.findIndex((t) => (
                        t.x === matrix.x && t.y === matrix.y && t.tag === matrix.tag && t.confidence === matrix.confidence
                    ))
                )
                d.details.matrices = matchedMatrices
            }
            // -- delayed decision here --
            if (defaultDrop && hasFilters) {
                return;
            }
        }
        var eventTime = new Date()
        if(filter.countObjects && currentConfig.detector_obj_count === '1' && currentConfig.detector_obj_count_in_region !== '1'){
            didCountingAlready = true
            countObjects(d)
        }
        if(currentConfig.detector_ptz_follow === '1'){
            moveCameraPtzToMatrix(d,currentConfig.detector_ptz_follow_target)
        }
        if(filter.useLock){
            if(s.group[d.ke].activeMonitors[d.id].motion_lock){
                return
            }
            var detector_lock_timeout
            if(!currentConfig.detector_lock_timeout||currentConfig.detector_lock_timeout===''){
                detector_lock_timeout = 2000
            }
            detector_lock_timeout = parseFloat(currentConfig.detector_lock_timeout);
            if(!s.group[d.ke].activeMonitors[d.id].detector_lock_timeout){
                s.group[d.ke].activeMonitors[d.id].detector_lock_timeout=setTimeout(function(){
                    clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_lock_timeout)
                    delete(s.group[d.ke].activeMonitors[d.id].detector_lock_timeout)
                },detector_lock_timeout)
            }else{
                return
            }
        }
        // check if object should be in region
        if(hasMatrices && currentConfig.detector_obj_region === '1'){
            var regions = s.group[d.ke].activeMonitors[d.id].parsedObjects.cords
            testMatrices = d.details.matrices // matrices that made it passed filters
            matchedMatrices = []
            regions.forEach(function(region,position){
                matchedMatrices = matchedMatrices.concat(scanMatricesforCollisions(region,testMatrices));
            })
            if (matchedMatrices.length > 2){
                // remove duplicate matches
                matchedMatrices = matchedMatrices.filter((matrix, index, self) =>
                    index === self.findIndex((t) => (
                        t.x === matrix.x && t.y === matrix.y && t.tag === matrix.tag && t.confidence === matrix.confidence
                    ))
                )
            }
            d.details.matrices = matchedMatrices // pass matrices that are within a region
            if(d.details.matrices && d.details.matrices.length > 0){
                s.debugLog('Matrix in region!')
                if(filter.countObjects && currentConfig.detector_obj_count === '1' && currentConfig.detector_obj_count_in_region === '1' && !didCountingAlready){
                    countObjects(d)
                }
            }else{
                return
            }
        }
        // check modified indifference
        if(filter.indifference !== false && d.details.confidence < parseFloat(filter.indifference)){
            // fails indifference check for modified indifference
            return
        }
        //motion counter
        if(filter.addToMotionCounter && filter.record){
            s.group[d.ke].activeMonitors[d.id].detector_motion_count.push(d)
        }
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
        }else{
            if(currentConfig.det_multi_trig === '1'){
                s.getCamerasForMultiTrigger(d.mon).forEach(function(monitor){
                    if(monitor.mid !== d.id){
                        s.triggerEvent({
                            id: monitor.mid,
                            ke: monitor.ke,
                            details: {
                                confidence: 100,
                                name: "multiTrigger",
                                plug: d.details.plug,
                                reason: d.details.reason
                            }
                        })
                    }
                })
            }
            //save this detection result in SQL, only coords. not image.
            if(forceSave || (filter.save && currentConfig.detector_save === '1')){
                var detailString = JSON.stringify(d.details);
                s.sqlQuery('INSERT INTO Events (ke,mid,details,time) VALUES (?,?,?,?)',[d.ke,d.id,detailString,eventTime])
            }
            if(currentConfig.detector === '1' && currentConfig.detector_notrigger === '1'){
                s.setNoEventsDetector(s.group[d.ke].rawMonitorConfigurations[d.id])
            }
            var detector_timeout
            if(!currentConfig.detector_timeout||currentConfig.detector_timeout===''){
                detector_timeout = 10
            }else{
                detector_timeout = parseFloat(currentConfig.detector_timeout)
            }
            if(filter.record && d.mon.mode=='start'&&currentConfig.detector_trigger==='1'&&currentConfig.detector_record_method==='sip'){
                s.createEventBasedRecording(d,moment(eventTime).subtract(5,'seconds').format('YYYY-MM-DDTHH-mm-ss'))
            }else if(filter.record && d.mon.mode!=='stop'&&currentConfig.detector_trigger=='1'&&currentConfig.detector_record_method==='hot'){
                if(!d.auth){
                    d.auth=s.gid();
                }
                if(!s.group[d.ke].users[d.auth]){
                    s.group[d.ke].users[d.auth]={system:1,details:{},lang:lang}
                }
                d.urlQuery = []
                d.url = 'http://'+config.ip+':'+config.port+'/'+d.auth+'/monitor/'+d.ke+'/'+d.id+'/record/'+detector_timeout+'/min';
                if(currentConfig.watchdog_reset!=='0'){
                    d.urlQuery.push('reset=1')
                }
                if(currentConfig.detector_trigger_record_fps&&currentConfig.detector_trigger_record_fps!==''&&currentConfig.detector_trigger_record_fps!=='0'){
                    d.urlQuery.push('fps='+currentConfig.detector_trigger_record_fps)
                }
                if(d.urlQuery.length>0){
                    d.url+='?'+d.urlQuery.join('&')
                }
                request({url:d.url,method:'GET'},function(err,data){
                    if(err){
                        //could not start hotswap
                    }else{
                        delete(s.group[d.ke].users[d.auth])
                        d.cx.f='detector_record_engaged';
                        d.cx.msg = JSON.parse(data.body)
                        s.tx(d.cx,'GRP_'+d.ke);
                    }
                })
            }
            d.currentTime = new Date()
            d.currentTimestamp = s.timeObject(d.currentTime).format()
            d.screenshotName = 'Motion_'+(d.mon.name.replace(/[^\w\s]/gi,''))+'_'+d.id+'_'+d.ke+'_'+s.formattedTime()
            d.screenshotBuffer = null

            s.onEventTriggerExtensions.forEach(function(extender){
                extender(d,filter)
            })

            if(filter.webhook && currentConfig.detector_webhook === '1'){
                var detector_webhook_url = s.addEventDetailsToString(d,currentConfig.detector_webhook_url)
                var webhookMethod = currentConfig.detector_webhook_method
                if(!webhookMethod || webhookMethod === '')webhookMethod = 'GET'
                request(detector_webhook_url,{method: webhookMethod,encoding:null},function(err,data){
                    if(err){
                        s.userLog(d,{type:lang["Event Webhook Error"],msg:{error:err,data:data}})
                    }
                })
            }

            if(filter.command && currentConfig.detector_command_enable === '1' && !s.group[d.ke].activeMonitors[d.id].detector_command){
                s.group[d.ke].activeMonitors[d.id].detector_command = s.createTimeout('detector_command',s.group[d.ke].activeMonitors[d.id],currentConfig.detector_command_timeout,10)
                var detector_command = s.addEventDetailsToString(d,currentConfig.detector_command)
                if(detector_command === '')return
                exec(detector_command,{detached: true},function(err){
                    if(err)s.debugLog(err)
                })
            }
        }
        //show client machines the event
        d.cx={f:'detector_trigger',id:d.id,ke:d.ke,details:d.details,doObjectDetection:d.doObjectDetection};
        s.tx(d.cx,'DETECTOR_'+d.ke+d.id);
    }
    s.createEventBasedRecording = function(d,fileTime){
        if(!fileTime)fileTime = s.formattedTime()
        d.mon = s.group[d.ke].rawMonitorConfigurations[d.id]
        var currentConfig = s.group[d.ke].activeMonitors[d.id].details
        if(currentConfig.detector !== '1'){
            return
        }
        var detector_timeout
        if(!currentConfig.detector_timeout||currentConfig.detector_timeout===''){
            detector_timeout = 10
        }else{
            detector_timeout = parseFloat(currentConfig.detector_timeout)
        }
        if(currentConfig.watchdog_reset === '1' || !s.group[d.ke].activeMonitors[d.id].eventBasedRecording.timeout){
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
            var runRecord = function(){
                var filename = fileTime+'.mp4'
                s.userLog(d,{type:lang["Traditional Recording"],msg:lang["Started"]})
                //-t 00:'+s.timeObject(new Date(detector_timeout * 1000 * 60)).format('mm:ss')+'
                s.group[d.ke].activeMonitors[d.id].eventBasedRecording.process = spawn(config.ffmpegDir,s.splitForFFPMEG(('-loglevel warning -analyzeduration 1000000 -probesize 1000000 -re -i "'+s.dir.streams+'/'+d.ke+'/'+d.id+'/detectorStream.m3u8" -c:v copy -strftime 1 "'+s.getVideoDirectory(d.mon) + filename + '"')))
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
                    s.insertCompletedVideo(d.mon,{
                        file : filename,
                        events: s.group[d.ke].activeMonitors[d.id].detector_motion_count
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
