const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const treekill = require('tree-kill');
module.exports = (s,config,lang) => {
    const { mergeDeep } = require('../common.js')
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
        const probeCommand = s.splitForFFPMEG(`-analyzeduration 100000 probesize 100000 -v quiet -print_format json -show_format -show_streams -i "${url}"`)
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
        console.log(Object.keys(monitor))
        console.log(`monitor.protocol`,monitor.protocol)
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
    const buildWatermarkFiltersFromConfiguration = (prefix,monitor) => {
        prefix = prefix ? prefix : ''
        const watermarkLocation = monitor.details[`${prefix}watermark_location`]
        //bottom right is default
        var watermarkPosition = '(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
        switch(monitor.details[`${prefix}watermark_position`]){
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
    const buildRotationFiltersFromConfiguration = (prefix,monitor) => {
        prefix = prefix ? prefix : ''
        const userChoice = monitor.details[`${prefix}rotate`]
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
    const buildTimestampFiltersFromConfiguration = (prefix,monitor) => {
        prefix = prefix ? prefix : ''
        const timestampFont = monitor.details[`${prefix}timestamp_font`] ? monitor.details[`${prefix}timestamp_font`] : '/usr/share/fonts/truetype/freefont/FreeSans.ttf'
        const timestampX = monitor.details[`${prefix}timestamp_x`] ? monitor.details[`${prefix}timestamp_x`] : '(w-tw)/2'
        const timestampY = monitor.details[`${prefix}timestamp_y`] ? monitor.details[`${prefix}timestamp_y`] : '0'
        const timestampColor = monitor.details[`${prefix}timestamp_color`] ? monitor.details[`${prefix}timestamp_color`] : 'white'
        const timestampBackgroundColor = monitor.details[`${prefix}timestamp_box_color`] ? monitor.details[`${prefix}timestamp_box_color`] : '0x00000000@1'
        const timestampFontSize = monitor.details[`${prefix}timestamp_font_size`] ? monitor.details[`${prefix}timestamp_font_size`] : '10'
        return `'drawtext=fontfile=${timestampFont}:text=\'%{localtime}\':x=${timestampX}:y=${timestampY}:fontcolor=${timestampColor}:box=1:boxcolor=${timestampBackgroundColor}:fontsize=${timestampFontSize}`
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
        buildWatermarkFiltersFromConfiguration: buildWatermarkFiltersFromConfiguration
    }
}
