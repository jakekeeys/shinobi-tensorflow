$(document).ready(function(e){
    //probe
    var loadedProbe = {}
    var probeWindow = $('#probe')
    var probeForm = probeWindow.find('form')
    var outputView = probeWindow.find('.output_data')
    var setAsLoading = function(appearance){
        if(appearance){
            probeWindow.find('._loading').show()
            outputView.empty()
            probeWindow.find('[type="submit"]').prop('disabled',true).html('<i class="fa fa-pulse fa-spinner"></i> ' + lang['Please Wait...'])
        }else{
            probeWindow.find('._loading').hide()
            outputView.append('<div><b>END</b></div>')
            probeWindow.find('[type="submit"]').prop('disabled',false).html('<i class="fa fa-search"></i> ' + lang.FFprobe)
        }
    }
    probeForm.submit(function(e){
        e.preventDefault()
        setAsLoading(true)
        var el = $(this)
        var form = el.serializeObject()
        var flags = 'default'
        var url = form.url.trim()
        $.get(`${getApiPrefix()}/probe/${$user.ke}?url=${url}`,function(data){
            if(data.ok === true){
                var html
                try{
                    loadedProbe = data.result
                    loadedProbe.url = url
                    html = $.ccio.init('jsontoblock',loadedProbe)
                }catch(err){
                    console.log(err)
                    html = data.result
                }
                outputView.append(html)
            }else{
                $.ccio.init('note',{title:'Failed to Probe',text:$.stringJSON(data.error),type:'error'});
            }
            setAsLoading(false)
        })
        return false;
    })
    probeWindow.find('.fill').click(function(){
        if(loadedProbe.streams){
            //select primary input map 0:0 or 0:1?
            var selectedIndex
            var selectedPrimary
            var audioStream
            $.each(loadedProbe.streams,function(n,stream){
                var codecNameContains = function(find){
                    return stringContains(find,stream.codec_name)
                }
                switch(stream.codec_type){
                    case'video':
                        selectedIndex = n
                        selectedPrimary = stream
                    break;
                    case'audio':
                        audioStream = stream
                        switch(true){
                            case codecNameContains('aac'):
                                audioStream.isAAC = true
                            break;
                            case codecNameContains('pcm_alaw'):
                            case codecNameContains('law'):
                                audioStream.isAAC = false
                            break;
                        }
                    break;
                }
            })

            //select input type, primary video codec
            var codecNameContains = function(find){
                return stringContains(find,selectedPrimary.codec_name)
            }
            var primaryVideoCodec = 'copy'
            var monitorCaptureRate = ''
            var selectedType = selectedPrimary.codec_name
            if(stringContains('.m3u8',loadedProbe.url)){
                selectedType = 'hls'
            }else if(stringContains('rtmp://',loadedProbe.url) || stringContains('rtmps://',loadedProbe.url)){
                selectedType = 'rtmp'
            }else if(loadedProbe.url.substring(0,1) === '/'){
                if(!codecNameContains('h264')){
                    primaryVideoCodec = 'libx264'
                }
                selectedType = 'local'
                monitorCaptureRate = loadedProbe.r_frame_rate ? eval(loadedProbe.r_frame_rate) : ''
            }else if(codecNameContains('h264') || codecNameContains('hvec') || codecNameContains('h265')){
                selectedType = 'h264'
            }else if(codecNameContains('mjpg') || codecNameContains('mjpeg')){
                primaryVideoCodec = 'libx264'
                selectedType = 'mjpeg'
                monitorCaptureRate = loadedProbe.r_frame_rate ? eval(loadedProbe.r_frame_rate) : ''
            }else if(codecNameContains('jpg') || codecNameContains('jpeg')){
                selectedType = 'jpeg'
                monitorCaptureRate = loadedProbe.r_frame_rate ? eval(loadedProbe.r_frame_rate) : ''
            }
            //select primary audio codec
            var primaryAudioCodec = 'no'
            if(audioStream){
                primaryAudioCodec = 'aac'
                // if(audioStream.isAAC){
                //     primaryAudioCodec = 'copy'
                // }else{
                //     primaryAudioCodec = 'aac'
                // }
            }

            var monitorConfig = mergeDeep($.aM.generateDefaultMonitorSettings(),{
                type: selectedType,
                fps: monitorCaptureRate, //videoRecordRate
                details: {
                    auto_host: loadedProbe.url,
                    primary_input: `0:${selectedIndex || '0'}`,
                    sfps: monitorCaptureRate,
                    vcodec: primaryVideoCodec,
                    acodec: primaryAudioCodec,
                    stream_vcodec: primaryVideoCodec,
                    stream_acodec: primaryAudioCodec,
                    stream_fps: monitorCaptureRate,
                    detector_buffer_vcodec: primaryVideoCodec,
                    detector_buffer_acodec: primaryAudioCodec,
                    detector_buffer_fps: monitorCaptureRate,
                }
            })
            $.aM.import(monitorConfig)
            $.aM.e.find('[detail="auto_host"]').change()
            $.aM.e.modal('show')
            probeWindow.modal('hide')
        }else{
            console.log('No Probe Result Loaded!')
        }
    })
    probeWindow.on('hidden.bs.modal',function(){
        outputView.empty()
    })
    probeWindow.find('.stop').click(function(e){
        el = $(this)
        $.get(`${getApiPrefix()}/probe/${$user.ke}?action=stop`,function(data){
            setAsLoading(false)
        })
    })
    $.pB = {
        submit: function(url,show){
            probeWindow.find('[name="url"]').val(url)
            probeForm.submit()
            if(show)probeWindow.modal('show')
        },
        writeData: function(jsonString){
            outputView.append($.ccio.init('jsontoblock',JSON.parse(jsonString)))
        },
        setAsLoading: setAsLoading
    }
})
