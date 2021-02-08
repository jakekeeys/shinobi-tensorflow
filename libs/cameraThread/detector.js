var fs = require('fs')
var P2P = require('pipe2pam')
var PamDiff = require('pam-diff')
module.exports = function(jsonData,pamDiffResponder){
    var noiseFilterArray = {};
    const groupKey = jsonData.rawMonitorConfig.ke
    const monitorId = jsonData.rawMonitorConfig.mid
    const triggerTimer = {}
    var pamDiff
    var p2p
    var writeToStderr = function(text){
      try{
        stdioWriters[2].write(Buffer.from(`${text}`, 'utf8' ))
          // stdioWriters[2].write(Buffer.from(`${new Error('writeToStderr').stack}`, 'utf8' ))
      }catch(err){
        fs.appendFileSync('/home/Shinobi/test.log',text + '\n','utf8')
      }
    }
    if(typeof pamDiffResponder === 'function'){
      var sendDetectedData = function(detectorObject){
        pamDiffResponder(detectorObject)
      }
    }else{
      var sendDetectedData = function(detectorObject){
        pamDiffResponder.write(Buffer.from(JSON.stringify(detectorObject)))
      }
    }
    createPamDiffEngine = function(){
        var width,
            height,
            globalSensitivity,
            globalColorThreshold,
            fullFrame = false
        if(jsonData.rawMonitorConfig.details.detector_scale_x===''||jsonData.rawMonitorConfig.details.detector_scale_y===''){
            width = jsonData.rawMonitorConfig.details.detector_scale_x;
            height = jsonData.rawMonitorConfig.details.detector_scale_y;
        }
        else{
            width = jsonData.rawMonitorConfig.width
            height = jsonData.rawMonitorConfig.height
        }
        if(jsonData.rawMonitorConfig.details.detector_sensitivity===''){
            globalSensitivity = 10
        }else{
            globalSensitivity = parseInt(jsonData.rawMonitorConfig.details.detector_sensitivity)
        }
        if(jsonData.rawMonitorConfig.details.detector_color_threshold===''){
            globalColorThreshold = 9
        }else{
            globalColorThreshold = parseInt(jsonData.rawMonitorConfig.details.detector_color_threshold)
        }

        globalThreshold = parseInt(jsonData.rawMonitorConfig.details.detector_threshold) || 0
        const regionsAreMasks = jsonData.rawMonitorConfig.details.detector_frame !== '1' && jsonData.rawMonitorConfig.details.inverse_trigger === '1';
        var regionJson
        try{
            regionJson = JSON.parse(jsonData.rawMonitorConfig.details.cords)
        }catch(err){
            regionJson = jsonData.rawMonitorConfig.details.cords
        }

        if(Object.keys(regionJson).length === 0 || jsonData.rawMonitorConfig.details.detector_frame === '1'){
            fullFrame = {
                name:'FULL_FRAME',
                sensitivity: globalSensitivity,
                color_threshold: globalColorThreshold,
                points:[
                    [0,0],
                    [0,height],
                    [width,height],
                    [width,0]
                ]
            }
        }

        const mask = {
            max_sensitivity : globalSensitivity,
            threshold : globalThreshold,
        }
        var regions = createPamDiffRegionArray(regionJson,globalColorThreshold,globalSensitivity,fullFrame)
        var pamDiffOptions = {
            mask: regionsAreMasks,
            grayscale: 'luminosity',
            regions : regions.forPam,
            percent : globalSensitivity,
            difference : globalColorThreshold,

        }
        if(jsonData.rawMonitorConfig.details.detector_show_matrix==='1'){
            pamDiffOptions.response = 'bounds'
        }
        pamDiff = new PamDiff(pamDiffOptions)
        p2p = new P2P()
        var regionArray = Object.values(regionJson)
        if(jsonData.globalInfo.config.detectorMergePamRegionTriggers === true){
            // merge pam triggers for performance boost
            var buildTriggerEvent = function(trigger){
                var detectorObject = {
                    f:'trigger',
                    id:monitorId,
                    ke:groupKey,
                    name:trigger.name,
                    details:{
                        plug:'built-in',
                        name:trigger.name,
                        reason:'motion',
                        confidence:trigger.percent
                    },
                    plates:[],
                    imgHeight:jsonData.rawMonitorConfig.details.detector_scale_y,
                    imgWidth:jsonData.rawMonitorConfig.details.detector_scale_x
                }
                if(trigger.merged){
                    if(trigger.matrices)detectorObject.details.matrices = trigger.matrices
                    var filteredCount = 0
                    var filteredCountSuccess = 0
                    trigger.merged.forEach(function(triggerPiece){
                        var region = regionsAreMasks ? mask : regionArray.find(x => x.name == triggerPiece.name)
                        checkMaximumSensitivity(region, detectorObject, function(err1) {
                            checkTriggerThreshold(region, detectorObject, function(err2) {
                                ++filteredCount
                                if(!err1 && !err2)++filteredCountSuccess
                                if(filteredCount === trigger.merged.length && filteredCountSuccess > 0){
                                    detectorObject.doObjectDetection = (jsonData.globalInfo.isAtleatOneDetectorPluginConnected && jsonData.rawMonitorConfig.details.detector_use_detect_object === '1')
                                    sendDetectedData(detectorObject)
                                }
                            })
                        })
                    })
                }else{
                    if(trigger.matrix)detectorObject.details.matrices = [trigger.matrix]
                    var region = regionsAreMasks ? mask : regionArray.find(x => x.name == detectorObject.name)
                    checkMaximumSensitivity(region, detectorObject, function(err1) {
                        checkTriggerThreshold(region, detectorObject, function(err2) {
                            if(!err1 && !err2){
                                detectorObject.doObjectDetection = (jsonData.globalInfo.isAtleatOneDetectorPluginConnected && jsonData.rawMonitorConfig.details.detector_use_detect_object === '1')
                                sendDetectedData(detectorObject)
                            }
                        })
                    })
                }
            }
            if(jsonData.rawMonitorConfig.details.detector_noise_filter==='1'){
                Object.keys(regions.notForPam).forEach(function(name){
                    if(!noiseFilterArray[name])noiseFilterArray[name]=[];
                })
                pamDiff.on('diff', (data) => {
                    var filteredCount = 0
                    var filteredCountSuccess = 0
                    data.trigger.forEach(function(trigger){
                        filterTheNoise(noiseFilterArray,regions,trigger,function(err){
                            ++filteredCount
                            if(!err)++filteredCountSuccess
                            if(filteredCount === data.trigger.length && filteredCountSuccess > 0){
                                buildTriggerEvent(mergePamTriggers(data))
                            }
                        })
                    })
                })
            }else{
                pamDiff.on('diff', (data) => {
                    buildTriggerEvent(mergePamTriggers(data))
                })
            }
        }else{
            //config.detectorMergePamRegionTriggers NOT true
            //original behaviour, all regions have their own event.
            var buildTriggerEvent = function(trigger){
                var detectorObject = {
                    f:'trigger',
                    id: monitorId,
                    ke: groupKey,
                    name:trigger.name,
                    details:{
                        plug:'built-in',
                        name:trigger.name,
                        reason:'motion',
                        confidence:trigger.percent
                    },
                    plates:[],
                    imgHeight:jsonData.rawMonitorConfig.details.detector_scale_y,
                    imgWidth:jsonData.rawMonitorConfig.details.detector_scale_x
                }
                if(trigger.matrix)detectorObject.details.matrices = [trigger.matrix]
                var region = regionsAreMasks ? mask : Object.values(regionJson).find(x => x.name == detectorObject.name)
                checkMaximumSensitivity(region, detectorObject, function(err1) {
                    checkTriggerThreshold(region, detectorObject, function(err2) {
                        if(!err1 && ! err2){
                            detectorObject.doObjectDetection = (jsonData.globalInfo.isAtleatOneDetectorPluginConnected && jsonData.rawMonitorConfig.details.detector_use_detect_object === '1')
                            sendDetectedData(detectorObject)
                        }
                    })
                })
            }
            if(jsonData.rawMonitorConfig.details.detector_noise_filter==='1'){
                Object.keys(regions.notForPam).forEach(function(name){
                    if(!noiseFilterArray[name])noiseFilterArray[name]=[];
                })
                pamDiff.on('diff', (data) => {
                    data.trigger.forEach(function(trigger){
                        filterTheNoise(noiseFilterArray,regions,trigger,function(){
                            createMatrixFromPamTrigger(trigger)
                            buildTriggerEvent(trigger)
                        })
                    })
                })
            }else{
                pamDiff.on('diff', (data) => {
                    data.trigger.forEach(function(trigger){
                        createMatrixFromPamTrigger(trigger)
                        buildTriggerEvent(trigger)
                    })
                })
            }
        }
    }

    createPamDiffRegionArray = function(regions,globalColorThreshold,globalSensitivity,fullFrame){
        var pamDiffCompliantArray = [],
            arrayForOtherStuff = [],
            json
        try{
            json = JSON.parse(regions)
        }catch(err){
            json = regions
        }
        if(fullFrame){
            json[fullFrame.name]=fullFrame;
        }
        Object.values(json).forEach(function(region){
            if(!region)return false;
            region.polygon = [];
            region.points.forEach(function(points){
                var x = parseFloat(points[0]);
                var y = parseFloat(points[1]);
                if(x < 0)x = 0;
                if(y < 0)y = 0;
                region.polygon.push({
                    x: x,
                    y: y
                })
            })
            if(region.sensitivity===''){
                region.sensitivity = globalSensitivity
            }else{
                region.sensitivity = parseInt(region.sensitivity)
            }
            if(region.color_threshold===''){
                region.color_threshold = globalColorThreshold
            }else{
                region.color_threshold = parseInt(region.color_threshold)
            }
            pamDiffCompliantArray.push({name: region.name, difference: region.color_threshold, percent: region.sensitivity, polygon:region.polygon})
            arrayForOtherStuff[region.name] = region;
        })
        if(pamDiffCompliantArray.length===0){pamDiffCompliantArray = null}
        return {forPam:pamDiffCompliantArray,notForPam:arrayForOtherStuff};
    }

    filterTheNoise = function(noiseFilterArray,regions,trigger,callback){
        if(noiseFilterArray[trigger.name].length > 2){
            var thePreviousTriggerPercent = noiseFilterArray[trigger.name][noiseFilterArray[trigger.name].length - 1];
            var triggerDifference = trigger.percent - thePreviousTriggerPercent;
            var noiseRange = jsonData.rawMonitorConfig.details.detector_noise_filter_range
            if(!noiseRange || noiseRange === ''){
                noiseRange = 6
            }
            noiseRange = parseFloat(noiseRange)
            if(((trigger.percent - thePreviousTriggerPercent) < noiseRange)||(thePreviousTriggerPercent - trigger.percent) > -noiseRange){
                noiseFilterArray[trigger.name].push(trigger.percent);
            }
        }else{
            noiseFilterArray[trigger.name].push(trigger.percent);
        }
        if(noiseFilterArray[trigger.name].length > 10){
            noiseFilterArray[trigger.name] = noiseFilterArray[trigger.name].splice(1,10)
        }
        var theNoise = 0;
        noiseFilterArray[trigger.name].forEach(function(v,n){
            theNoise += v;
        })
        theNoise = theNoise / noiseFilterArray[trigger.name].length;
        var triggerPercentWithoutNoise = trigger.percent - theNoise;
        if(triggerPercentWithoutNoise > regions.notForPam[trigger.name].sensitivity){
            callback(null,trigger)
        }else{
            callback(true)
        }
    }

    checkMaximumSensitivity = function(region, detectorObject, callback) {
        var logName = detectorObject.id + ':' + detectorObject.name
        var globalMaxSensitivity = parseInt(jsonData.rawMonitorConfig.details.detector_max_sensitivity) || undefined
        var maxSensitivity = parseInt(region.max_sensitivity) || globalMaxSensitivity
        if (maxSensitivity === undefined || detectorObject.details.confidence <= maxSensitivity) {
            callback(null)
        } else {
            callback(true)
            if (triggerTimer[detectorObject.name] !== undefined) {
                clearTimeout(triggerTimer[detectorObject.name].timeout)
                triggerTimer[detectorObject.name] = undefined
            }
        }
    }

    checkTriggerThreshold = function(region, detectorObject, callback){
        var threshold = parseInt(region.threshold) || globalThreshold
        if (threshold <= 1) {
            callback(null)
        } else {
            if (triggerTimer[detectorObject.name] === undefined) {
                triggerTimer[detectorObject.name] = {
                    count : threshold,
                    timeout : null
                }
            }
            if (--triggerTimer[detectorObject.name].count == 0) {
                callback(null)
                clearTimeout(triggerTimer[detectorObject.name].timeout)
                triggerTimer[detectorObject.name] = undefined
            } else {
                callback(true)
                var fps = parseFloat(jsonData.rawMonitorConfig.details.detector_fps) || 2
                if (triggerTimer[detectorObject.name].timeout !== null)
                    clearTimeout(triggerTimer[detectorObject.name].timeout)
                triggerTimer[detectorObject.name].timeout = setTimeout(function() {
                    triggerTimer[detectorObject.name] = undefined
                }, ((threshold+0.5) * 1000) / fps)
            }
        }
    }
    mergePamTriggers = function(data){
        if(data.trigger.length > 1){
            var n = 0
            var sum = 0
            var name = []
            var matrices = []
            data.trigger.forEach(function(trigger){
                name.push(trigger.name + ' ('+trigger.percent+'%)')
                ++n
                sum += trigger.percent
                createMatrixFromPamTrigger(trigger)
                if(trigger.matrix)matrices.push(trigger.matrix)
            })
            var average = sum / n
            name = name.join(', ')
            if(matrices.length === 0)matrices = null
            var trigger = {
                name: name,
                percent: parseInt(average),
                matrices: matrices,
                merged: data.trigger
            }
        }else{
            var trigger = data.trigger[0]
            createMatrixFromPamTrigger(trigger)
            trigger.matrices = [trigger.matrix]
        }
        return trigger
    }
    createMatrixFromPamTrigger = function(trigger){
        if(
            trigger.minX &&
            trigger.maxX &&
            trigger.minY &&
            trigger.maxY
        ){
            var coordinates = [
                {"x" : trigger.minX, "y" : trigger.minY},
                {"x" : trigger.maxX, "y" : trigger.minY},
                {"x" : trigger.maxX, "y" : trigger.maxY}
            ]
            var width = Math.sqrt( Math.pow(coordinates[1].x - coordinates[0].x, 2) + Math.pow(coordinates[1].y - coordinates[0].y, 2));
            var height = Math.sqrt( Math.pow(coordinates[2].x - coordinates[1].x, 2) + Math.pow(coordinates[2].y - coordinates[1].y, 2))
            trigger.matrix = {
                x: coordinates[0].x,
                y: coordinates[0].y,
                width: width,
                height: height,
                tag: trigger.name
            }
        }
        return trigger
    }

    return function(cameraProcess,fallback){
        if(jsonData.rawMonitorConfig.details.detector_pam === '1'){
          createPamDiffEngine()
          cameraProcess.stdio[3].pipe(p2p).pipe(pamDiff)
        }
    };
}
