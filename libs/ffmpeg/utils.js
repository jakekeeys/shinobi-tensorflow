module.exports = (s,config,lang) => {
    const { mergeDeep } = require('../common.js')
    var exec = require('child_process').exec;
    const activeProbes = {}
    const runFFprobe = (url,auth,callback) => {
        var endData = {ok: false, result: {}}
        if(!url){
            endData.error = 'Missing URL'
            callback(endData)
            return
        }
        if(activeProbes[auth]){
            endData.error = 'Account is already probing'
            callback(endData)
            return
        }
        activeProbes[auth] = 1
        const probeCommand = s.splitForFFPMEG(`-v quiet -print_format json -show_format -show_streams -i "${url}"`).join(' ')
        exec('ffprobe ' + probeCommand,function(err,stdout,stderr){
            delete(activeProbes[auth])
            if(err){
                endData.error = err
            }else{
                endData.ok = true
                endData.result = s.parseJSON(stdout)
            }
            endData.probe = probeCommand
            callback(endData)
        })
    }
    const probeMonitor = (monitor,timeoutAmount) => {
        return new Promise((resolve,reject) => {
            const url = s.buildMonitorUrl(monitor);
            runFFprobe(url,`${monitor.ke}${monitor.mid}`,(response) => {
                setTimeout(() => {
                    resolve(response)
                },timeoutAmount || 1000)
            })
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
                    codec: stream.codec_name.toLowerCase(),
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
        const primaryVideoStream = probeResult.video[0]
        const warnings = []
        const possibleWarnings = [
            {
                isTrue: monitor.details.stream_vcodec === 'copy' && primaryVideoStream.codec === 'hevc',
                title: lang['Codec Mismatch'],
                text: lang.codecMismatchText1,
                level: 5,
            },
            {
                isTrue: (
                    (
                        monitor.details.stream_type === 'mp4' ||
                        monitor.details.stream_type === 'flv' ||
                        monitor.details.stream_type === 'hls'
                    ) &&
                    monitor.details.stream_vcodec === 'copy' &&
                    primaryVideoStream.codec === 'mjpeg'
                ),
                title: lang['Automatic Codec Repair'],
                text: lang.codecMismatchText2,
                level: 10,
                automaticChange: {
                    details: {
                        stream_type: 'mjpeg'
                    }
                }
            },
            {
                isTrue: (
                    (
                        monitor.details.stream_type === 'mjpeg' ||
                        monitor.details.stream_vcodec === 'libx264'
                    ) &&
                    primaryVideoStream.codec === 'h264'
                ),
                title: lang['Performance Optimization Possible'],
                text: lang.performanceOptimizeText1,
                level: 1,
            },
            {
                isTrue: (
                    monitor.details.vcodec === 'copy' &&
                    primaryVideoStream.codec === 'mjpeg'
                ),
                title: lang['Codec Mismatch'],
                text: lang.codecMismatchText3,
                level: 10,
                automaticChange: {
                    fps: probeResult.fps,
                    details: {
                        vcodec: 'libx264',
                    }
                }
            },
            {
                isTrue: (
                    !monitor.details.sfps &&
                    primaryVideoStream.codec === 'mjpeg'
                ),
                title: lang['Field Missing Value'],
                text: lang.fieldMissingValueText1,
                level: 10,
                automaticChange: {
                    details: {
                        sfps: probeResult.fps,
                    }
                }
            },
        ];
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
    return {
        ffprobe: runFFprobe,
        probeMonitor: probeMonitor,
        getStreamInfoFromProbe: getStreamInfoFromProbe,
        createWarningsForConfiguration: createWarningsForConfiguration,
        buildMonitorConfigPartialFromWarnings: buildMonitorConfigPartialFromWarnings,
        applyPartialToConfiguration: applyPartialToConfiguration,
        repairConfiguration: repairConfiguration
    }
}
