const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const treekill = require('tree-kill');
module.exports = (s,config,lang) => {
    const {
        mergeDeep,
        validateIntValue,
    } = require('../common.js')
    const getPossibleWarnings = require('./possibleWarnings.js')
    const activeProbes = {}
    const runFFprobe = (url,auth,callback,forceOverlap) => {
        var endData = {ok: false, result: {}}
        if(!url){
            endData.error = 'Missing URL'
            callback(endData)
            return
        }
        if(!forceOverlap && activeProbes[auth]){
            endData.error = 'Account is already probing'
            callback(endData)
            return
        }
        activeProbes[auth] = 1
        var stderr = ''
        var stdout = ''
        const probeCommand = splitForFFPMEG(`-analyzeduration 100000 probesize 100000 -v quiet -print_format json -show_format -show_streams -i "${url}"`)
        var processTimeout = null
        var ffprobeLocation = config.ffmpegDir.split('/')
        ffprobeLocation[ffprobeLocation.length - 1] = 'ffprobe'
        ffprobeLocation = ffprobeLocation.join('/')
        const probeProcess = spawn(ffprobeLocation, probeCommand)
        const finishReponse = () => {
            delete(activeProbes[auth])
            if(!stdout){
                endData.error = stderr
            }else{
                endData.ok = true
                endData.result = s.parseJSON(stdout)
            }
            endData.probe = probeCommand
            callback(endData)
        }
        probeProcess.stderr.on('data',function(data){
            stderr += data.toString()
        })
        probeProcess.stdout.on('data',function(data){
            stdout += data.toString()
        })
        probeProcess.on('close',function(){
            clearTimeout(processTimeout)
            finishReponse()
        })
        processTimeout = setTimeout(() => {
            treekill(probeProcess.pid)
            finishReponse()
        },4000)
    }
    const probeMonitor = (monitor,timeoutAmount,forceOverlap) => {
        return new Promise((resolve,reject) => {
            const url = s.buildMonitorUrl(monitor);
            runFFprobe(url,`${monitor.ke}${monitor.mid}`,(response) => {
                setTimeout(() => {
                    resolve(response)
                },timeoutAmount || 1000)
            },forceOverlap)
        })
    }
    const getStreamInfoFromProbe = (probeResult) => {
        const streamIndex = {
            video: [],
            audio: [],
            all: []
        }
        const streams = probeResult.streams || []
        streams.forEach((stream) => {
            try{
                const codecType = stream.codec_type || 'video'
                const simpleInfo = {
                    fps: eval(stream.r_frame_rate) || '',
                    width: stream.coded_width,
                    height: stream.coded_height,
                    streamType: stream.codec_type,
                    codec: (stream.codec_name || '').toLowerCase(),
                }
                streamIndex.all.push(simpleInfo)
                streamIndex[codecType].push(simpleInfo)
            }catch(err){
                console.log(err)
            }
        })
        if(streamIndex.video.length === 0){
            streamIndex.video.push({
                streamType: 'video',
                codec: 'unknown',
            })
        }
        return streamIndex
    }
    const createWarningsForConfiguration = (monitor,probeResult) => {
        const warnings = []
        const possibleWarnings = getPossibleWarnings(monitor,probeResult,config,lang)
        possibleWarnings.forEach((warning) => {
            if(warning.isTrue)warnings.push(warning)
        })
        return warnings
    }
    const buildMonitorConfigPartialFromWarnings = (warnings) => {
        var configPartial = {}
        warnings.forEach((warning) => {
            if(warning.automaticChange)configPartial = mergeDeep(configPartial,warning.automaticChange)
        })
        return configPartial
    }
    const repairConfiguration = (monitor,probeResult) => {
        const warnings = createWarningsForConfiguration(monitor,probeResult)
        const configPartial = buildMonitorConfigPartialFromWarnings(warnings)
        return mergeDeep(monitor,configPartial)
    }
    const applyPartialToConfiguration = (activeMonitor,configPartial) => {
        Object.keys(configPartial).forEach((key) => {
            if(key !== 'details'){
                activeMonitor[key] = configPartial[key]
            }else{
                const details = s.parseJSON(configPartial.details)
                Object.keys(details).forEach((key) => {
                    activeMonitor.details[key] = details[key]
                })
            }
        })
    }
    const getInputTypeFlags = (inputType) => {
        switch(inputType){
            case'socket':case'jpeg':case'pipe'://case'webpage':
                return `-pattern_type glob -f image2pipe -vcodec mjpeg`
            break;
            case'mjpeg':
                return `-reconnect 1 -f mjpeg`
            break;
            case'mxpeg':
                return `-reconnect 1 -f mxg`
            break;
            default:
                return ``
            break;
        }
    }
    const buildConnectionFlagsFromConfiguration = (monitor) => {
        const url = s.buildMonitorUrl(monitor);
        switch(monitor.type){
            case'dashcam':
                return `-i -`
            break;
            case'socket':case'jpeg':case'pipe'://case'webpage':
                return `-pattern_type glob -f image2pipe -vcodec mjpeg -i -`
            break;
            case'mjpeg':
                return `-reconnect 1 -f mjpeg -i "${url}"`
            break;
            case'mxpeg':
                return `-reconnect 1 -f mxg -i "${url}"`
            break;
            case'rtmp':
                if(!monitor.details.rtmp_key)monitor.details.rtmp_key = ''
                return `-i "rtmp://127.0.0.1:1935/${monitor.ke}_${monitor.mid}_${monitor.details.rtmp_key}"`
            break;
            case'h264':case'hls':case'mp4':
                return `-i "${url}"`
            break;
            case'local':
                return `-i "${monitor.path}"`
            break;
        }
    }
    const hasInputMaps = (e) => {
        return (e.details.input_maps && e.details.input_maps.length > 0)
    }
    const buildInputMap = function(e,arrayOfMaps){
        //`e` is the monitor object
        var string = '';
        if(hasInputMaps(e)){
            if(arrayOfMaps && arrayOfMaps instanceof Array && arrayOfMaps.length>0){
                arrayOfMaps.forEach(function(v){
                    if(v.map==='')v.map='0'
                    string += ' -map '+v.map
                })
            }else{
                var primaryMap = '0:0'
                if(e.details.primary_input && e.details.primary_input !== ''){
                    var primaryMap = e.details.primary_input || '0:0'
                    string += ' -map ' + primaryMap
                }
            }
        }
        return string;
    }
    const buildWatermarkFiltersFromConfiguration = (prefix,monitor,detail,detailKey) => {
        prefix = prefix ? prefix : ''
        const parameterContainer = detail ? detailKey ?  monitor.details[detail][detailKey] :  monitor.details[detail] : monitor.details
        const watermarkLocation = parameterContainer[`${prefix}watermark_location`]
        //bottom right is default
        var watermarkPosition = '(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
        switch(parameterContainer[`${prefix}watermark_position`]){
            case'tl'://top left
                watermarkPosition = '10:10'
            break;
            case'tr'://top right
                watermarkPosition = 'main_w-overlay_w-10:10'
            break;
            case'bl'://bottom left
                watermarkPosition = '10:main_h-overlay_h-10'
            break;
        }
        return `movie=${watermarkLocation}[watermark],[in][watermark]overlay=${watermarkPosition}[out]`
    }
    const buildRotationFiltersFromConfiguration = (prefix,monitor,detail,detailKey) => {
        prefix = prefix ? prefix : ''
        const parameterContainer = detail ? detailKey ?  monitor.details[detail][detailKey] :  monitor.details[detail] : monitor.details
        const userChoice = parameterContainer[`${prefix}rotate`]
        switch(userChoice){
            case'2,transpose=2':
            case'0':
            case'1':
            case'2':
            case'3':
                return `transpose=${userChoice}`
            break;
        }
        return ``
    }
    const buildTimestampFiltersFromConfiguration = (prefix,monitor,detail,detailKey) => {
        prefix = prefix ? prefix : ''
        const parameterContainer = detail ? detailKey ?  monitor.details[detail][detailKey] :  monitor.details[detail] : monitor.details
        const timestampFont = parameterContainer[`${prefix}timestamp_font`] ? parameterContainer[`${prefix}timestamp_font`] : '/usr/share/fonts/truetype/freefont/FreeSans.ttf'
        const timestampX = parameterContainer[`${prefix}timestamp_x`] ? parameterContainer[`${prefix}timestamp_x`] : '(w-tw)/2'
        const timestampY = parameterContainer[`${prefix}timestamp_y`] ? parameterContainer[`${prefix}timestamp_y`] : '0'
        const timestampColor = parameterContainer[`${prefix}timestamp_color`] ? parameterContainer[`${prefix}timestamp_color`] : 'white'
        const timestampBackgroundColor = parameterContainer[`${prefix}timestamp_box_color`] ? parameterContainer[`${prefix}timestamp_box_color`] : '0x00000000@1'
        const timestampFontSize = parameterContainer[`${prefix}timestamp_font_size`] ? parameterContainer[`${prefix}timestamp_font_size`] : '10'
        return `'drawtext=fontfile=${timestampFont}:text=\'%{localtime}\':x=${timestampX}:y=${timestampY}:fontcolor=${timestampColor}:box=1:boxcolor=${timestampBackgroundColor}:fontsize=${timestampFontSize}`
    }
    const validateDimensions = (oldWidth,oldHeight) => {
        const width = validateIntValue(oldWidth)
        const height = validateIntValue(oldHeight)
        return {
            videoWidth: width,
            videoHeight: height,
        }
    }
    const sanitizedFfmpegCommand = (e,ffmpegCommandString) => {
        var sanitizedCmd = `${ffmpegCommandString}`
        if(e.details.muser && e.details.mpass){
            sanitizedCmd = ffmpegCommandString
                .replace(`//${e.details.muser}:${e.details.mpass}@`,'//')
                .replace(`=${e.details.muser}`,'=USERNAME')
                .replace(`=${e.details.mpass}`,'=PASSWORD')
        }else if(e.details.muser){
            sanitizedCmd = ffmpegCommandString.replace(`//${e.details.muser}:@`,'//').replace(`=${e.details.muser}`,'=USERNAME')
        }
        return sanitizedCmd
    }
    const createPipeArray = function(e){
        const stdioPipes = [];
        var times = config.pipeAddition;
        if(e.details.stream_channels){
            times+=e.details.stream_channels.length
        }
        for(var i=0; i < times; i++){
            stdioPipes.push('pipe')
        }
        return stdioPipes
    }
    const splitForFFPMEG = function(ffmpegCommandAsString) {
        return ffmpegCommandAsString.replace(/\s+/g,' ').trim().match(/\\?.|^$/g).reduce((p, c) => {
            if(c === '"'){
                p.quote ^= 1;
            }else if(!p.quote && c === ' '){
                p.a.push('');
            }else{
                p.a[p.a.length-1] += c.replace(/\\(.)/,"$1");
            }
            return  p;
        }, {a: ['']}).a
    }
    return {
        ffprobe: runFFprobe,
        probeMonitor: probeMonitor,
        getStreamInfoFromProbe: getStreamInfoFromProbe,
        createWarningsForConfiguration: createWarningsForConfiguration,
        buildMonitorConfigPartialFromWarnings: buildMonitorConfigPartialFromWarnings,
        applyPartialToConfiguration: applyPartialToConfiguration,
        repairConfiguration: repairConfiguration,
        buildTimestampFiltersFromConfiguration: buildTimestampFiltersFromConfiguration,
        buildWatermarkFiltersFromConfiguration: buildWatermarkFiltersFromConfiguration,
        validateDimensions: validateDimensions,
        buildConnectionFlagsFromConfiguration: buildConnectionFlagsFromConfiguration,
        buildInputMap: buildInputMap,
        getInputTypeFlags: getInputTypeFlags,
        sanitizedFfmpegCommand: sanitizedFfmpegCommand,
        createPipeArray: createPipeArray,
        splitForFFPMEG: splitForFFPMEG,
    }
}
