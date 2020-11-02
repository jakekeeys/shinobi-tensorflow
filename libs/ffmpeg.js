const fs = require('fs');
const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const {
    arrayContains,
} = require('../common.js')
module.exports = function(s,config,lang,onFinish){
    const {
        buildTimestampFilters,
        buildWatermarkFiltersFromConfiguration,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    if(config.ffmpegBinary)config.ffmpegDir = config.ffmpegBinary
    var ffmpeg = {}
    var downloadingFfmpeg = false;
    const hasCudaEnabled = (monitor) => {
        return monitor.details.accelerator === '1' && monitor.details.hwaccel === 'cuvid' && monitor.details.hwaccel_vcodec === ('h264_cuvid' || 'hevc_cuvid' || 'mjpeg_cuvid' || 'mpeg4_cuvid')
    }
    const inputTypeIsStreamer = (monitor) => {
        return monitor.type === 'dashcam'|| monitor.type === 'socket'
    }
    //check local ffmpeg
    ffmpeg.checkForWindows = function(failback){
        if (s.isWin && fs.existsSync(s.mainDirectory+'/ffmpeg/ffmpeg.exe')) {
            config.ffmpegDir = s.mainDirectory+'/ffmpeg/ffmpeg.exe'
        }else{
            failback()
        }
    }
    //check local ffmpeg
    ffmpeg.checkForUnix = function(failback){
        if(s.isWin === false){
            if (fs.existsSync('/usr/bin/ffmpeg')) {
                config.ffmpegDir = '/usr/bin/ffmpeg'
            }else{
                if (fs.existsSync('/usr/local/bin/ffmpeg')) {
                    config.ffmpegDir = '/usr/local/bin/ffmpeg'
                }else{
                    failback()
                }
            }
        }else{
            failback()
        }
    }
    //check node module : ffmpeg-static
    ffmpeg.checkForNpmStatic = function(failback){
        try{
            var staticFFmpeg = require('ffmpeg-static').path;
            if (fs.statSync(staticFFmpeg)) {
                config.ffmpegDir = staticFFmpeg
            }else{
                console.log('"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.')
                console.log('Run "npm uninstall ffmpeg-static" to remove it.')
                console.log('Run "npm install ffbinaries" to get a different static FFmpeg downloader.')
            }
        }catch(err){
            console.log('No "ffmpeg-static".')
            failback()
        }
    }
    //check node module : ffbinaries
    ffmpeg.checkForFfbinary = function(failback){
        try{
            ffbinaries = require('ffbinaries')
            var ffbinaryDir = s.mainDirectory + '/ffmpeg/'
            var downloadFFmpeg = function(){
                downloadingFfmpeg = true
                console.log('ffbinaries : Downloading FFmpeg. Please Wait...');
                ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], {
                    destination: ffbinaryDir,
                    version : '3.4'
                },function () {
                    config.ffmpegDir = ffbinaryDir + 'ffmpeg'
                    console.log('ffbinaries : FFmpeg Downloaded.');
                    ffmpeg.completeCheck()
                })
            }
            if (!fs.existsSync(ffbinaryDir + 'ffmpeg')) {
                downloadFFmpeg()
            }else{
                config.ffmpegDir = ffbinaryDir + 'ffmpeg'
            }
        }catch(err){
            console.log('No "ffbinaries". Continuing.')
            console.log('Run "npm install ffbinaries" to get this static FFmpeg downloader.')
            failback()
        }
    }
    //ffmpeg version
    ffmpeg.checkVersion = function(callback){
        try{
            s.ffmpegVersion = execSync(config.ffmpegDir+" -version").toString().split('Copyright')[0].replace('ffmpeg version','').trim()
            if(s.ffmpegVersion.indexOf(': 2.')>-1){
                s.systemLog('FFMPEG is too old : '+s.ffmpegVersion+', Needed : 3.2+',err)
                throw (new Error())
            }
        }catch(err){
            console.log('No FFmpeg found.')
            // process.exit()
        }
        callback()
    }
    //check available hardware acceleration methods
    ffmpeg.checkHwAccelMethods = function(callback){
        if(config.availableHWAccels === undefined){
            hwAccels = execSync(config.ffmpegDir+" -loglevel quiet -hwaccels").toString().split('\n')
            hwAccels.shift()
            availableHWAccels = []
            hwAccels.forEach(function(method){
                if(method && method !== '')availableHWAccels.push(method.trim())
            })
            config.availableHWAccels = availableHWAccels
            config.availableHWAccels = ['auto'].concat(config.availableHWAccels)
            console.log('Available Hardware Acceleration Methods : ',availableHWAccels.join(', '))
            var methods = {
                auto: {label:lang['Auto'],value:'auto'},
                drm: {label:lang['drm'],value:'drm'},
                cuvid: {label:lang['cuvid'],value:'cuvid'},
                cuda: {label:lang['cuda'],value:'cuda'},
                opencl: {label:lang['opencl'],value:'opencl'},
                vaapi: {label:lang['vaapi'],value:'vaapi'},
                qsv: {label:lang['qsv'],value:'qsv'},
                vdpau: {label:lang['vdpau'],value:'vdpau'},
                dxva2: {label:lang['dxva2'],value:'dxva2'},
                vdpau: {label:lang['vdpau'],value:'vdpau'},
                videotoolbox: {label:lang['videotoolbox'],value:'videotoolbox'}
            }
            s.listOfHwAccels = []
            config.availableHWAccels.forEach(function(availibleMethod){
                if(methods[availibleMethod]){
                    var method = methods[availibleMethod]
                    s.listOfHwAccels.push({
                        name: method.label,
                        value: method.value,
                    })
                 }
            })
        }
        callback()
    }
    ffmpeg.completeCheck = function(){
        ffmpeg.checkVersion(function(){
            ffmpeg.checkHwAccelMethods(function(){
                s.onFFmpegLoadedExtensions.forEach(function(extender){
                    extender(ffmpeg)
                })
                onFinish(ffmpeg)
            })
        })
    }
    //ffmpeg string cleaner, splits for use with spawn()
    s.splitForFFPMEG = function (ffmpegCommandAsString) {
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
    };
    const hasInputMaps = (e) => {
        return (e.details.input_maps && e.details.input_maps.length > 0)
    }
    s.createFFmpegMap = function(e,arrayOfMaps){
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
    s.createInputMap = function(e,number,input){
        //`e` is the monitor object
        //`x` is an object used to contain temporary values.
        var x = {}
        x.cust_input = ''
        x.hwaccel = ''
        if(input.cust_input&&input.cust_input!==''){x.cust_input+=' '+input.cust_input}
        //input - analyze duration
        if(input.aduration&&input.aduration!==''){x.cust_input+=' -analyzeduration '+input.aduration}
        //input - probe size
        if(input.probesize&&input.probesize!==''){x.cust_input+=' -probesize '+input.probesize}
        //input - stream loop (good for static files/lists)
        if(input.stream_loop === '1'){x.cust_input+=' -stream_loop -1'}
        //input - fps
        if(x.cust_input.indexOf('-r ')===-1&&input.sfps&&input.sfps!==''){
            input.sfps=parseFloat(input.sfps);
            if(isNaN(input.sfps)){input.sfps=1}
            x.cust_input+=' -r '+input.sfps
        }
        //input - is mjpeg
        if(input.type==='mjpeg'){
            if(x.cust_input.indexOf('-f ')===-1){
                x.cust_input+=' -f mjpeg'
            }
            //input - frames per second
            x.cust_input+=' -reconnect 1'
        }else
        //input - is h264 has rtsp in address and transport method is chosen
        if((input.type==='h264'||input.type==='mp4')&&input.fulladdress.indexOf('rtsp://')>-1&&input.rtsp_transport!==''&&input.rtsp_transport!=='no'){
            x.cust_input += ' -rtsp_transport '+input.rtsp_transport
        }else
        if((input.type==='mp4'||input.type==='mjpeg')&&x.cust_input.indexOf('-re')===-1){
            x.cust_input += ' -re'
        }
        //hardware acceleration
        if(input.accelerator&&input.accelerator==='1'){
            if(input.hwaccel&&input.hwaccel!==''){
                x.hwaccel+=' -hwaccel '+input.hwaccel;
            }
            if(input.hwaccel_vcodec&&input.hwaccel_vcodec!==''&&input.hwaccel_vcodec!=='auto'&&input.hwaccel_vcodec!=='no'){
                x.hwaccel+=' -c:v '+input.hwaccel_vcodec;
            }
            if(input.hwaccel_device&&input.hwaccel_device!==''){
                switch(input.hwaccel){
                    case'vaapi':
                        x.hwaccel+=' -vaapi_device '+input.hwaccel_device+' -hwaccel_output_format vaapi';
                    break;
                    default:
                        x.hwaccel+=' -hwaccel_device '+input.hwaccel_device;
                    break;
                }
            }
        }
        //custom - input flags
        return x.hwaccel+x.cust_input+' -i "'+input.fulladdress+'"';
    }
    //create sub stream channel
    s.createStreamChannel = function(e,number,channel){
        //`e` is the monitor object
        //`x` is an object used to contain temporary values.
        var x = {
            pipe: '',
            cust_stream: ' -strict -2'
        }
        if(!number||number==''){
            x.channel_sdir = e.sdir;
        }else{
            x.channel_sdir = e.sdir+'channel'+number+'/';
            if (!fs.existsSync(x.channel_sdir)){
                fs.mkdirSync(x.channel_sdir);
            }
        }
        x.stream_video_filters=[]
        //stream - frames per second
        if(channel.stream_vcodec!=='copy'){
            if(!channel.stream_fps||channel.stream_fps===''){
                switch(channel.stream_type){
                    case'rtmp':
                        channel.stream_fps=30
                    break;
                    default:
    //                        channel.stream_fps=5
                    break;
                }
            }
        }
        if(channel.stream_fps&&channel.stream_fps!==''){x.stream_fps=' -r '+channel.stream_fps}else{x.stream_fps=''}

        //stream - hls vcodec
        if(channel.stream_vcodec&&channel.stream_vcodec!=='no'){
            if(channel.stream_vcodec!==''){x.stream_vcodec=' -c:v '+channel.stream_vcodec}else{x.stream_vcodec=' -c:v libx264'}
        }else{
            x.stream_vcodec='';
        }
        //stream - hls acodec
        if(channel.stream_acodec!=='no'){
        if(channel.stream_acodec&&channel.stream_acodec!==''){x.stream_acodec=' -c:a '+channel.stream_acodec}else{x.stream_acodec=''}
        }else{
            x.stream_acodec=' -an';
        }
        //stream - resolution
        if(channel.stream_scale_x&&channel.stream_scale_x!==''&&channel.stream_scale_y&&channel.stream_scale_y!==''){
            x.dimensions = channel.stream_scale_x+'x'+channel.stream_scale_y;
        }
        //stream - hls segment time
        if(channel.hls_time&&channel.hls_time!==''){x.hls_time=channel.hls_time}else{x.hls_time="2"}
        //hls list size
        if(channel.hls_list_size&&channel.hls_list_size!==''){x.hls_list_size=channel.hls_list_size}else{x.hls_list_size=2}
        //stream - custom flags
        if(channel.cust_stream&&channel.cust_stream!==''){x.cust_stream=' '+channel.cust_stream}
        //stream - preset
        if(channel.stream_type !== 'h265' && channel.preset_stream && channel.preset_stream!==''){x.preset_stream=' -preset '+channel.preset_stream;}else{x.preset_stream=''}
        //hardware acceleration
        if(e.details.accelerator&&e.details.accelerator==='1'){
            if(e.details.hwaccel === 'auto')e.details.hwaccel = ''
            if(e.details.hwaccel && e.details.hwaccel!==''){
                x.hwaccel+=' -hwaccel '+e.details.hwaccel;
            }
            if(e.details.hwaccel_vcodec&&e.details.hwaccel_vcodec!==''){
                x.hwaccel+=' -c:v '+e.details.hwaccel_vcodec;
            }
            if(e.details.hwaccel_device&&e.details.hwaccel_device!==''){
                switch(e.details.hwaccel){
                    case'vaapi':
                        x.hwaccel+=' -vaapi_device '+e.details.hwaccel_device+' -hwaccel_output_format vaapi';
                    break;
                    default:
                        x.hwaccel+=' -hwaccel_device '+e.details.hwaccel_device;
                    break;
                }
            }
    //        else{
    //            if(e.details.hwaccel==='vaapi'){
    //                x.hwaccel+=' -hwaccel_device 0';
    //            }
    //        }
        }

        if(channel.rotate_stream&&channel.rotate_stream!==""&&channel.rotate_stream!=="no"){
            x.stream_video_filters.push('transpose='+channel.rotate_stream);
        }
        //stream - video filter
        if(channel.svf&&channel.svf!==''){
            x.stream_video_filters.push(channel.svf)
        }
        if(x.stream_video_filters.length>0){
            var string = x.stream_video_filters.join(',').trim()
            if(string===''){
                x.stream_video_filters=''
            }else{
                x.stream_video_filters=' -vf '+string
            }
        }else{
            x.stream_video_filters=''
        }
        x.pipe += s.createFFmpegMap(e,e.details.input_map_choices['stream_channel-'+(number-config.pipeAddition)])

        if(channel.stream_vcodec !== 'copy' || channel.stream_type === 'mjpeg' || channel.stream_type === 'b64'){
            x.cust_stream += x.stream_fps
        }
        switch(channel.stream_type){
            case'mp4':
                x.cust_stream+=' -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1'
                if(channel.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f mp4'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:'+number;
            break;
            case'rtmp':
                x.rtmp_server_url=s.checkCorrectPathEnding(channel.rtmp_server_url);
                if(channel.stream_vcodec!=='copy'){
                    if(channel.stream_vcodec==='libx264'){
                        channel.stream_vcodec = 'h264'
                    }
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    if(channel.stream_v_br&&channel.stream_v_br!==''){x.cust_stream+=' -b:v '+channel.stream_v_br}
                }
                if(channel.stream_vcodec!=='no'&&channel.stream_vcodec!==''){
                    x.cust_stream+=' -vcodec '+channel.stream_vcodec
                }
                if(channel.stream_acodec!=='copy'){
                    if(!channel.stream_acodec||channel.stream_acodec===''||channel.stream_acodec==='no'){
                        channel.stream_acodec = 'aac'
                    }
                    if(!channel.stream_a_br||channel.stream_a_br===''){channel.stream_a_br='128k'}
                    x.cust_stream+=' -ab '+channel.stream_a_br
                }
                if(channel.stream_acodec!==''){
                    x.cust_stream+=' -acodec '+channel.stream_acodec
                }
                x.pipe+=' -f flv'+x.stream_video_filters+x.cust_stream+' "'+x.rtmp_server_url+channel.rtmp_stream_key+'"';
            break;
            case'h264':
                if(channel.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f mpegts'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:'+number;
            break;
            case'flv':
                if(channel.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f flv'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:'+number;
            break;
            case'hls':
                if(channel.stream_vcodec!=='h264_vaapi'&&channel.stream_vcodec!=='copy'){
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    if(x.cust_stream.indexOf('-tune')===-1){x.cust_stream+=' -tune zerolatency'}
                    if(x.cust_stream.indexOf('-g ')===-1){x.cust_stream+=' -g 1'}
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=x.preset_stream+x.stream_acodec+x.stream_vcodec+' -f hls'+x.cust_stream+' -hls_time '+x.hls_time+' -hls_list_size '+x.hls_list_size+' -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "'+x.channel_sdir+'s.m3u8"';
            break;
            case'mjpeg':
                if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -q:v '+channel.stream_quality;
                if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                x.pipe+=' -c:v mjpeg -f mpjpeg -boundary_tag shinobi'+x.cust_stream+x.stream_video_filters+' pipe:'+number;
            break;
            default:
                x.pipe=''
            break;
        }
        return x.pipe
    }
    ffmpeg.buildMainInput = function(e,x){
        //e = monitor object
        //x = temporary values
        const isStreamer = inputTypeIsStreamer(e)
        const isCudaEnabled = hasCudaEnabled(e)
        //
        x.hwaccel = ''
        x.cust_input = ''
        //wallclock fix for strangely long, single frame videos
        if((config.wallClockTimestampAsDefault || e.details.wall_clock_timestamp_ignore !== '1') && e.type === 'h264' && x.cust_input.indexOf('-use_wallclock_as_timestamps 1') === -1){x.cust_input+=' -use_wallclock_as_timestamps 1';}
        //input - frame rate (capture rate)
        if(e.details.sfps && e.details.sfps!==''){x.input_fps=' -r '+e.details.sfps}else{x.input_fps=''}
        //input - analyze duration
        if(e.details.aduration&&e.details.aduration!==''){x.cust_input+=' -analyzeduration '+e.details.aduration};
        //input - probe size
        if(e.details.probesize&&e.details.probesize!==''){x.cust_input+=' -probesize '+e.details.probesize};
        //input - stream loop (good for static files/lists)
        if(e.details.stream_loop === '1' && (e.type === 'mp4' || e.type === 'local')){x.cust_input+=' -stream_loop -1'};
        //input
        if(e.details.cust_input.indexOf('-fflags') === -1){x.cust_input+=' -fflags +igndts'}
        switch(e.type){
            case'h264':
                switch(e.protocol){
                    case'rtsp':
                        if(e.details.rtsp_transport&&e.details.rtsp_transport!==''&&e.details.rtsp_transport!=='no'){x.cust_input+=' -rtsp_transport '+e.details.rtsp_transport;}
                    break;
                }
            break;
        }
        //hardware acceleration
        if(e.details.accelerator && e.details.accelerator==='1' && !isStreamer){
            if(e.details.hwaccel&&e.details.hwaccel!==''){
                x.hwaccel+=' -hwaccel '+e.details.hwaccel;
            }
            if(e.details.hwaccel_vcodec&&e.details.hwaccel_vcodec!==''){
                x.hwaccel+=' -c:v '+e.details.hwaccel_vcodec;
            }
            if(e.details.hwaccel_device&&e.details.hwaccel_device!==''){
                switch(e.details.hwaccel){
                    case'vaapi':
                        x.hwaccel+=' -vaapi_device '+e.details.hwaccel_device;
                    break;
                    default:
                        x.hwaccel+=' -hwaccel_device '+e.details.hwaccel_device;
                    break;
                }
            }
    //        else{
    //            if(e.details.hwaccel==='vaapi'){
    //                x.hwaccel+=' -hwaccel_device 0';
    //            }
    //        }
        }
        //logging - level
        if(e.details.loglevel&&e.details.loglevel!==''){x.loglevel='-loglevel '+e.details.loglevel;}else{x.loglevel='-loglevel error'}
        //custom - input flags
        if(e.details.cust_input&&e.details.cust_input!==''){x.cust_input+=' '+e.details.cust_input;}
        //add main input
        if((e.type === 'mp4' || e.type === 'mjpeg') && x.cust_input.indexOf('-re') === -1){
            x.cust_input += ' -re'
        }
    }
    ffmpeg.buildMainStream = function(e,x){
        //e = monitor object
        //x = temporary values
        const isCudaEnabled = hasCudaEnabled(e)
        const streamFlags = []
        const streamFilters = []
        const customStreamFlags = []
        const videoCodecisCopy = e.details.stream_vcodec === 'copy'
        const videoCodec = e.details.stream_vcodec ? e.details.stream_vcodec : 'no'
        const audioCodec = e.details.stream_acodec ? e.details.stream_acodec : 'no'
        const videoQuality = e.details.stream_quality ? e.details.stream_quality : '1'
        const streamType = e.details.stream_type ? e.details.stream_type : 'hls'
        const videoFps = !isNaN(parseFloat(e.details.stream_fps)) && e.details.stream_fps !== '0' ? parseFloat(e.details.stream_fps) : null
        const inputMap = s.createFFmpegMap(e,e.details.input_map_choices.stream)
        const outputCanHaveAudio = (streamType === 'hls' || streamType === 'mp4' || streamType === 'flv' || streamType === 'h265')
        const outputRequiresEncoding = streamType === 'mjpeg' || streamType === 'b64'
        const outputIsPresetCapable = outputCanHaveAudio
        if(inputMap)streamFlags.push(inputMap)
        if(e.details.cust_stream)customStreamFlags.push(...e.details.cust_stream.split(' '))
        //
        // if(e.details.stream_scale_x&&e.details.stream_scale_x!==''&&e.details.stream_scale_y&&e.details.stream_scale_y!==''){
        //     x.dimensions = e.details.stream_scale_x+'x'+e.details.stream_scale_y;
        // }
        if(customStreamFlags.indexOf('-strict -2') === -1)customStreamFlags.push(`-strict -2`)
        //stream - timestamp
        if(e.details.stream_timestamp === "1" && !videoCodecisCopy){
            streamFilters.push(buildTimestampFiltersFromConfiguration('stream_',e))
        }
        if(e.details.stream_watermark === "1" && e.details.stream_watermark_location){
            streamFilters.push(buildWatermarkFiltersFromConfiguration(`stream_`,e))
        }
        //stream - rotation
        if(e.details.stream_rotate && e.details.stream_rotate !== "no" && e.details.stream_vcodec !== 'copy'){
            streamFilters.push(buildRotationFiltersFromConfiguration(`stream_`,e))
        }
        if(videoCodec !== 'no'){
            streamFlags.push(`-c:v ` + videoCodec)
        }
        if(outputCanHaveAudio && audioCodec !== 'no'){
            streamFlags.push(`-c:a ` + videoCodec)
        }else{
            streamFlags.push(`-an`)
        }
        //stream - preset
        if(streamType !== 'h265' && e.details.preset_stream){
            streamFlags.push('-preset ' + e.details.preset_stream)
        }

        if(videoCodec === 'h264_vaapi'){
            streamFilters.push('format=nv12,hwupload');
            if(e.details.stream_scale_x && e.details.stream_scale_y){
                streamFilters.push('scale_vaapi=w='+e.details.stream_scale_x+':h='+e.details.stream_scale_y)
            }
    	}else if(isCudaEnabled && (streamType === 'mjpeg' || streamType === 'b64')){
            streamFilters.push('hwdownload,format=nv12')
        }
        if(!videoCodecisCopy){
            // if(
            //     !isNaN(parseInt(e.details.stream_scale_x)) &&
            //     !isNaN(parseInt(e.details.stream_scale_y))
            // ){
            //     streamingFlags.push(`-s ${e.details.stream_scale_x}x${e.details.stream_scale_y}`)
            // }
            if(videoFps && streamType === 'mjpeg' || streamType === 'b64'){
                streamFilters.push(`fps=${videoFps}`)
            }
        }
        const streamPreset = streamType !== 'h265' && e.details.preset_stream ? e.details.preset_stream : null
        //stream - video filter
        if(e.details.stream_vf){
            streamFilters.push(e.details.stream_vf)
        }
        if(outputIsPresetCapable){
            if(streamPreset){
                streamFlags.push(`-preset ${streamPreset}`)
            }
            if(!videoCodecisCopy){
                streamFlags.push(`-crf ${videoQuality}`)
            }
        }else{
            streamFlags.push(`-q:v ${videoQuality}`)
        }
        if((!videoCodecisCopy || outputRequiresEncoding) && streamFilters.length > 0){
            streamFlags.push(`-vf ${streamFilters.join(',')}`)
        }
        switch(streamType){
            case'mp4':
                streamFlags.push('-f mp4 -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream from Shinobi" -reset_timestamps 1 pipe:1')
            break;
            case'flv':
                streamFlags.push(`-f flv`,'pipe:1')
            break;
            case'hls':
                const hlsTime = !isNaN(parseInt(e.details.hls_time)) ? `${parseInt(e.details.hls_time)}` : '2'
                const hlsListSize = !isNaN(parseInt(e.details.hls_list_size)) ? `${parseInt(e.details.hls_list_size)}` : '2'
                if(videoCodec !== 'h264_vaapi' && !videoCodecisCopy){
                    if(arrayContains('-tune',streamFlags)){
                        streamFlags.push(`-tune zerolatency`)
                    }
                    if(arrayContains('-g ',streamFlags)){
                        streamFlags.push(`-g 1`)
                    }
                }
                streamFlags.push(`-f hls -hls_time ${hlsTime} -hls_list_size ${hlsListSize} -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "${e.sdir}s.m3u8"`)
            break;
            case'mjpeg':
                streamFlags.push(`-an -c:v mjpeg -f mpjpeg -boundary_tag shinobi pipe:1`)
            break;
            case'h265':
                streamFlags.push(`-movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Shinobi H.265 Stream" -reset_timestamps 1 -f hevc pipe:1`)
            break;
            case'b64':case'':case undefined:case null://base64
                streamFlags.push(`-an -c:v mjpeg -f image2pipe pipe:1`)
            break;
        }
        x.pipe += ' ' + streamFlags.join(' ')
        if(e.details.stream_channels){
            e.details.stream_channels.forEach(function(v,n){
                x.pipe += s.createStreamChannel(e,n+config.pipeAddition,v)
            })
        }
        //api - snapshot bin/ cgi.bin (JPEG Mode)
        if(e.details.snap === '1'){
            x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.snap)
            var snapVf = e.details.snap_vf ? e.details.snap_vf.split(',') : []
            if(e.details.snap_vf === '')snapVf.shift()
            if(e.cudaEnabled){
                snapVf.push('hwdownload,format=nv12')
            }
            snapVf.push(`fps=${e.details.snap_fps || '1'}`)
            //-vf "thumbnail_cuda=2,hwdownload,format=nv12"
            x.pipe += ` -vf "${snapVf.join(',')}"`
            if(e.details.snap_scale_x && e.details.snap_scale_x !== '' && e.details.snap_scale_y && e.details.snap_scale_y !== '')x.pipe += ' -s '+e.details.snap_scale_x+'x'+e.details.snap_scale_y
            if(e.details.cust_snap)x.pipe += ' ' + e.details.cust_snap
            x.pipe += ` -update 1 "${e.sdir}s.jpg" -y`
        }
        //custom - output
        if(e.details.custom_output&&e.details.custom_output!==''){x.pipe+=' '+e.details.custom_output;}
    }
    ffmpeg.buildMainRecording = function(e,x){
        //e = monitor object
        //x = temporary values
        if(e.mode === 'record'){
            const recordingFlags = []
            const recordingFilters = []
            const customRecordingFlags = []
            const videoCodecisCopy = e.details.vcodec === 'copy'
            const videoExtIsMp4 = e.ext === 'mp4'
            const defaultVideoCodec = videoExtIsMp4 ? 'libx264' : 'libvpx'
            const defaultAudioCodec = videoExtIsMp4 ? 'aac' : 'libvorbis'
            const videoCodec = e.details.vcodec === 'default' ? defaultVideoCodec : e.details.vcodec ? e.details.vcodec : defaultVideoCodec
            const audioCodec = e.details.acodec === 'default' ? defaultAudioCodec : e.details.acodec ? e.details.acodec : defaultAudioCodec
            const videoQuality = e.details.crf ? e.details.crf : '1'
            const videoFps = !isNaN(parseFloat(e.fps)) && e.fps !== '0' ? parseFloat(e.fps) : null
            const segmentLengthInMinutes = !isNaN(parseFloat(e.details.cutoff)) ? parseFloat(e.details.cutoff) : '15'
            const inputMap = s.createFFmpegMap(e,e.details.input_map_choices.record)
            if(inputMap)recordingFlags.push(inputMap)
            if(e.details.cust_record)customRecordingFlags.push(...e.details.cust_record.split(' '))
            //record - resolution
            if(customRecordingFlags.indexOf('-strict -2') === -1)customRecordingFlags.push(`-strict -2`)
            // if(customRecordingFlags.indexOf('-threads') === -1)customRecordingFlags.push(`-threads 10`)
            if(!videoCodecisCopy){
                if(
                    !isNaN(parseInt(e.details.record_scale_x)) &&
                    !isNaN(parseInt(e.details.record_scale_y))
                ){
                    recordingFlags.push(`-s ${e.details.record_scale_x}x${e.details.record_scale_y}`)
                }
                if(videoExtIsMp4){
                    recordingFlags.push(`-crf ${videoQuality}`)
                }else{
                    recordingFlags.push(`-q:v ${videoQuality}`)
                }
                if(videoFps){
                    recordingFilters.push(`fps=${videoFps}`)
                }
            }
            if(videoExtIsMp4){
                customRecordingFlags.push(`-segment_format_options movflags=faststart+frag_keyframe+empty_moov`)
            }
            if(videoCodec === 'h264_vaapi'){
                recordingFilters.push('format=nv12,hwupload')
            }
            switch(e.type){
                case'h264':case'hls':case'mp4':case'local':
                    if(audioCodec === 'no'){
                        recordingFlags.push(`-an`)
                    }else if(audioCodec !== 'none'){
                        recordingFlags.push(`-acodec ` + audioCodec)
                    }
                break;
            }
            if(videoCodec !== 'none'){
                recordingFlags.push(`-vcodec ` + videoCodec)
            }
            //record - timestamp options for -vf
            if(e.details.timestamp === "1" && !videoCodecisCopy){
                recordingFilters.push(buildTimestampFiltersFromConfiguration('',e))
            }
            //record - watermark for -vf
            if(e.details.watermark === "1" && e.details.watermark_location){
                recordingFilters.push(buildWatermarkFiltersFromConfiguration('',e))
            }
            if(e.details.rotate && e.details.rotate !== "no" && !videoCodecisCopy){
                recordingFilters.push(buildRotationFiltersFromConfiguration(``,e))
            }
            if(e.details.vf){
                recordingFilters.push(e.details.vf)
            }
            if(recordingFilters.length > 0){
               recordingFlags.push(`-vf "${recordingFilters.join(',')}"`)
            }
            if(e.details.preset_record){
                recordingFlags.push(`-preset ${e.details.preset_record}`)
            }
            if(customRecordingFlags.length > 0){
                recordingFlags.push(...customRecordingFlags)
            }
            //record - segmenting
            recordingFlags.push(`-f segment -segment_atclocktime 1 -reset_timestamps 1 -strftime 1 -segment_list pipe:8 -segment_time ${(60 * segmentLengthInMinutes)} "${e.dir}%Y-%m-%dT%H-%M-%S.${e.ext || 'mp4'}"`);
            x.pipe += ' ' + recordingFlags.join(' ')
        }
    }
    ffmpeg.buildAudioDetector = function(e,x){
        if(e.details.detector_audio === '1'){
            if(e.details.input_map_choices&&e.details.input_map_choices.detector_audio){
                //add input feed map
                x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.detector_audio)
            }else{
                x.pipe += ' -map 0:a'
            }
            x.pipe += ' -acodec pcm_s16le -f s16le -ac 1 -ar 16000 pipe:6'
        }
    }
    ffmpeg.buildMainDetector = function(e,x){
        //e = monitor object
        //x = temporary values
        const detectorFlags = []
        const inputMapsRequired = (e.details.input_map_choices && e.details.input_map_choices.detector)
        const sendFramesGlobally = (e.details.detector_send_frames === '1')
        const objectDetectorOutputIsEnabled = (e.details.detector_use_detect_object === '1')
        const builtInMotionDetectorIsEnabled = (e.details.detector_pam === '1')
        const sendFramesToObjectDetector = (e.details.detector_send_frames_object !== '0' && e.details.detector_use_detect_object === '1')
        const baseWidth = e.details.detector_scale_x ? e.details.detector_scale_x : '640'
        const baseHeight = e.details.detector_scale_y ? e.details.detector_scale_y : '480'
        const baseDimensionsFlag = `-s ${baseWidth}x${baseHeight}`
        const baseFps = e.details.detector_fps ? e.details.detector_fps : '2'
        const baseFpsFilter = 'fps=' + baseFps
        const objectDetectorDimensionsFlag = `-s ${e.details.detector_scale_x_object ? e.details.detector_scale_x_object : baseWidth}x${e.details.detector_scale_y_object ? e.details.detector_scale_y_object : baseHeight}`
        const objectDetectorFpsFilter = 'fps=' + (e.details.detector_fps_object ? e.details.detector_fps_object : baseFps)
        const isCudaEnabled = false || e.cudaEnabled
        const cudaVideoFilters = 'hwdownload,format=nv12'
        const videoFilters = []
        if(e.details.detector === '1' && (sendFramesGlobally || sendFramesToObjectDetector)){
            const addVideoFilters = () => {
                if(videoFilters.length > 0)detectorFlags.push(' -vf "' + videoFilters.join(',') + '"')
            }
            const addInputMap = () => {
                detectorFlags.push(s.createFFmpegMap(e,e.details.input_map_choices.detector))
            }
            const addObjectDetectorInputMap = () => {
                detectorFlags.push(s.createFFmpegMap(e,e.details.input_map_choices.detector_object || e.details.input_map_choices.detector))
            }
            const addObjectDetectValues = () => {
                const objVideoFilters = [objectDetectorFpsFilter]
                if(e.details.cust_detect_object)detectorFlags.push(e.details.cust_detect_object)
                if(isCudaEnabled)objVideoFilters.push(cudaVideoFilters)
                detectorFlags.push(objectDetectorDimensionsFlag + ' -vf "' + objVideoFilters.join(',') + '"')
            }
            if(sendFramesGlobally){
                if(builtInMotionDetectorIsEnabled)addInputMap();
                detectorFlags.push(baseDimensionsFlag)
                if(isCudaEnabled)videoFilters.push(cudaVideoFilters);
                videoFilters.push(baseFpsFilter)
                if(e.details.cust_detect)detectorFlags.push(e.details.cust_detect)
                addVideoFilters()
                if(builtInMotionDetectorIsEnabled){
                    detectorFlags.push('-an -c:v pam -pix_fmt gray -f image2pipe pipe:3')
                    if(objectDetectorOutputIsEnabled){
                        addObjectDetectorInputMap()
                        addObjectDetectValues()
                        detectorFlags.push('-an -f singlejpeg pipe:4')
                    }
                }else if(sendFramesToObjectDetector){
                    addObjectDetectorInputMap()
                    addObjectDetectValues()
                    detectorFlags.push('-an -f singlejpeg pipe:4')
                }else{
                    addInputMap()
                    detectorFlags.push('-an -f singlejpeg pipe:4')
                }
            }else if(sendFramesToObjectDetector){
                addObjectDetectorInputMap()
                addObjectDetectValues()
                detectorFlags.push('-an -f singlejpeg pipe:4')
            }
            x.pipe += ' ' + detectorFlags.join(' ')
        }
        //Traditional Recording Buffer
        if(e.details.detector === '1' && e.details.detector_trigger === '1' && e.details.detector_record_method === 'sip'){
            if(e.details.cust_sip_record && e.details.cust_sip_record !== ''){x.pipe += ' ' + e.details.cust_sip_record}
            x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.detector_sip_buffer || e.details.input_map_choices.detector)
            x.detector_buffer_filters=[]
            if(!e.details.detector_buffer_vcodec||e.details.detector_buffer_vcodec===''||e.details.detector_buffer_vcodec==='auto'){
                switch(e.type){
                    case'h264':case'hls':case'mp4':
                        e.details.detector_buffer_vcodec = 'copy'
                    break;
                    default:
                        if(e.details.accelerator === '1' && e.cudaEnabled){
                                e.details.detector_buffer_vcodec = 'h264_nvenc'
                        }else{
                            e.details.detector_buffer_vcodec = 'libx264'
                        }
                    break;
                }
            }
            if(!e.details.detector_buffer_acodec||e.details.detector_buffer_acodec===''||e.details.detector_buffer_acodec==='auto'){
                switch(e.type){
                    case'mjpeg':case'jpeg':case'socket':
                        e.details.detector_buffer_acodec = 'no'
                    break;
                    case'h264':case'hls':case'mp4':
                        e.details.detector_buffer_acodec = 'copy'
                    break;
                    default:
                        e.details.detector_buffer_acodec = 'aac'
                    break;
                }
            }
            if(e.details.detector_buffer_acodec === 'no'){
                x.detector_buffer_acodec = ' -an'
            }else{
                x.detector_buffer_acodec = ' -c:a '+e.details.detector_buffer_acodec
            }
            if(!e.details.detector_buffer_tune||e.details.detector_buffer_tune===''){e.details.detector_buffer_tune='zerolatency'}
            if(!e.details.detector_buffer_g||e.details.detector_buffer_g===''){e.details.detector_buffer_g='1'}
            if(!e.details.detector_buffer_hls_time||e.details.detector_buffer_hls_time===''){e.details.detector_buffer_hls_time='2'}
            if(!e.details.detector_buffer_hls_list_size||e.details.detector_buffer_hls_list_size===''){e.details.detector_buffer_hls_list_size='4'}
            if(!e.details.detector_buffer_start_number||e.details.detector_buffer_start_number===''){e.details.detector_buffer_start_number='0'}
            if(!e.details.detector_buffer_live_start_index||e.details.detector_buffer_live_start_index===''){e.details.detector_buffer_live_start_index='-3'}
            if(e.details.detector_buffer_vcodec.indexOf('_vaapi')>-1){
                if(x.hwaccel.indexOf('-vaapi_device')>-1){
                    x.detector_buffer_filters.push('format=nv12')
                    x.detector_buffer_filters.push('hwupload')
                }else{
                    e.details.detector_buffer_vcodec='libx264'
                }
            }
            if(e.details.detector_buffer_vcodec!=='copy'){
                if(e.details.detector_buffer_fps&&e.details.detector_buffer_fps!==''){
                    x.detector_buffer_fps=' -r '+e.details.detector_buffer_fps
                }else{
                    x.detector_buffer_fps=' -r 30'
                }
            }else{
                x.detector_buffer_fps=''
            }
            if(x.detector_buffer_filters.length>0){
                x.pipe+=' -vf '+x.detector_buffer_filters.join(',')
            }
            x.pipe += x.detector_buffer_fps+x.detector_buffer_acodec+' -c:v '+e.details.detector_buffer_vcodec+' -f hls -tune '+e.details.detector_buffer_tune+' -g '+e.details.detector_buffer_g+' -hls_time '+e.details.detector_buffer_hls_time+' -hls_list_size '+e.details.detector_buffer_hls_list_size+' -start_number '+e.details.detector_buffer_start_number+' -live_start_index '+e.details.detector_buffer_live_start_index+' -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "'+e.sdir+'detectorStream.m3u8"'
        }
    }
    ffmpeg.buildTimelapseOutput = function(e,x){
        if(e.details.record_timelapse === '1'){
            var recordTimelapseVideoFilters = []
            var flags = []
            x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.record_timelapse)
            recordTimelapseVideoFilters.push('fps=1/' + (e.details.record_timelapse_fps ? e.details.record_timelapse_fps : '900'))
            if(e.details.record_timelapse_vf && e.details.record_timelapse_vf !== '')flags.push('-vf ' + e.details.record_timelapse_vf)
            if(e.details.record_timelapse_scale_x && e.details.record_timelapse_scale_x !== '' && e.details.record_timelapse_scale_y && e.details.record_timelapse_scale_y !== '')flags.push(`-s ${e.details.record_timelapse_scale_x}x${e.details.record_timelapse_scale_y}`)
            //record - watermark for -vf
            if(e.details.record_timelapse_watermark&&e.details.record_timelapse_watermark=="1"&&e.details.record_timelapse_watermark_location&&e.details.record_timelapse_watermark_location!==''){
                switch(e.details.record_timelapse_watermark_position){
                    case'tl'://top left
                        x.record_timelapse_watermark_position = '10:10'
                    break;
                    case'tr'://top right
                        x.record_timelapse_watermark_position = 'main_w-overlay_w-10:10'
                    break;
                    case'bl'://bottom left
                        x.record_timelapse_watermark_position = '10:main_h-overlay_h-10'
                    break;
                    default://bottom right
                        x.record_timelapse_watermark_position = '(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
                    break;
                }
                recordTimelapseVideoFilters.push(
                    'movie=' + e.details.record_timelapse_watermark_location,
                    `[watermark],[in][watermark]overlay=${x.record_timelapse_watermark_position}[out]`
                )
            }
            if(recordTimelapseVideoFilters.length > 0){
                var videoFilter = `-vf "${recordTimelapseVideoFilters.join(',').trim()}"`
                flags.push(videoFilter)
            }
            x.pipe += ` -f singlejpeg ${flags.join(' ')} -an -q:v 1 pipe:7`
        }
    }
    ffmpeg.assembleMainPieces = function(e,x){
        //create executeable FFMPEG command
        x.ffmpegCommandString = x.loglevel+x.input_fps;
        //progress pipe
        x.ffmpegCommandString += ' -progress pipe:5';
        const url = s.buildMonitorUrl(e);
        switch(e.type){
            case'dashcam':
                x.ffmpegCommandString += x.cust_input+x.hwaccel+' -i -';
            break;
            case'socket':case'jpeg':case'pipe'://case'webpage':
                x.ffmpegCommandString += ' -pattern_type glob -f image2pipe'+x.record_fps+' -vcodec mjpeg'+x.cust_input+x.hwaccel+' -i -';
            break;
            case'mjpeg':
                x.ffmpegCommandString += ' -reconnect 1 -f mjpeg'+x.cust_input+x.hwaccel+' -i "'+url+'"';
            break;
            case'mxpeg':
                x.ffmpegCommandString += ' -reconnect 1 -f mxg'+x.cust_input+x.hwaccel+' -i "'+url+'"';
            break;
            case'rtmp':
                if(!e.details.rtmp_key)e.details.rtmp_key = ''
                x.ffmpegCommandString += x.cust_input+x.hwaccel+` -i "rtmp://127.0.0.1:1935/${e.ke + '_' + e.mid + '_' + e.details.rtmp_key}"`;
            break;
            case'h264':case'hls':case'mp4':
                x.ffmpegCommandString += x.cust_input+x.hwaccel+' -i "'+url+'"';
            break;
            case'local':
                x.ffmpegCommandString += x.cust_input+x.hwaccel+' -i "'+e.path+'"';
            break;
        }
        //add extra input maps
        if(e.details.input_maps){
            e.details.input_maps.forEach(function(v,n){
                x.ffmpegCommandString += s.createInputMap(e,n+1,v)
            })
        }
        //add recording and stream outputs
        x.ffmpegCommandString += x.pipe
    }
    ffmpeg.createPipeArray = function(e,x){
        //create additional pipes from ffmpeg
        x.stdioPipes = [];
        var times = config.pipeAddition;
        if(e.details.stream_channels){
            times+=e.details.stream_channels.length
        }
        for(var i=0; i < times; i++){
            x.stdioPipes.push('pipe')
        }
    }
    s.ffmpeg = function(e){
        //set X for temporary values so we don't break our main monitor object.
        var x = {tmp : ''}
        //set some placeholding values to avoid "undefined" in ffmpeg string.
        ffmpeg.buildMainInput(e,x)
        ffmpeg.buildMainStream(e,x)
        ffmpeg.buildMainRecording(e,x)
        ffmpeg.buildAudioDetector(e,x)
        ffmpeg.buildMainDetector(e,x)
        ffmpeg.buildTimelapseOutput(e,x)
        s.onFfmpegCameraStringCreationExtensions.forEach(function(extender){
            extender(e,x)
        })
        ffmpeg.assembleMainPieces(e,x)
        ffmpeg.createPipeArray(e,x)
        //hold ffmpeg command for log stream
        var sanitizedCmd = x.ffmpegCommandString
        if(e.details.muser && e.details.mpass){
            sanitizedCmd = sanitizedCmd
                .replace(`//${e.details.muser}:${e.details.mpass}@`,'//')
                .replace(`=${e.details.muser}`,'=USERNAME')
                .replace(`=${e.details.mpass}`,'=PASSWORD')
        }else if(e.details.muser){
            sanitizedCmd = sanitizedCmd.replace(`//${e.details.muser}:@`,'//').replace(`=${e.details.muser}`,'=USERNAME')
        }
        s.group[e.ke].activeMonitors[e.mid].ffmpeg = sanitizedCmd
        //clean the string of spatial impurities and split for spawn()
        x.ffmpegCommandString = s.splitForFFPMEG(x.ffmpegCommandString)
        //launch that bad boy
        // return spawn(config.ffmpegDir,x.ffmpegCommandString,{detached: true,stdio:x.stdioPipes})
        try{
          fs.unlinkSync(e.sdir + 'cmd.txt')
        }catch(err){

        }
        fs.writeFileSync(e.sdir + 'cmd.txt',JSON.stringify({
          cmd: x.ffmpegCommandString,
          pipes: x.stdioPipes.length,
          rawMonitorConfig: s.group[e.ke].rawMonitorConfigurations[e.id],
          globalInfo: {
            config: config,
            isAtleatOneDetectorPluginConnected: s.isAtleatOneDetectorPluginConnected
          }
        },null,3),'utf8')
        var cameraCommandParams = [
          './libs/cameraThread/singleCamera.js',
          config.ffmpegDir,
          e.sdir + 'cmd.txt'
        ]
        return spawn('node',cameraCommandParams,{detached: true,stdio:x.stdioPipes})
    }
    if(!config.ffmpegDir){
        ffmpeg.checkForWindows(function(){
            ffmpeg.checkForFfbinary(function(){
                ffmpeg.checkForNpmStatic(function(){
                    ffmpeg.checkForUnix(function(){
                        console.log('No FFmpeg found.')
                    })
                })
            })
        })
    }
    if(downloadingFfmpeg === false){
        //not downloading ffmpeg
        ffmpeg.completeCheck()
    }
    return ffmpeg
}
