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
            probeWindow.find('.stop').show()
            probeWindow.find('[type="submit"]').hide()
        }else{
            probeWindow.find('._loading').hide()
            outputView.append('<div><b>END</b></div>')
            probeWindow.find('.stop').hide()
            probeWindow.find('[type="submit"]').show()
        }
    }
    probeForm.submit(function(e){
        e.preventDefault()
        setAsLoading(true)
        var el = $(this)
        var form = el.serializeObject()
        var flags = ''
        var url = form.url.trim()
        switch(form.mode){
            case'json':
                flags = '-print_format json -show_format -show_streams'
            break;
        }
    //    if(url.indexOf('{{JSON}}')>-1){
    //        url='-v quiet -print_format json -show_format -show_streams '+url
    //    }
        $.get(`${getApiPrefix()}/probe/${$user.ke}?url=${encodeURIComponent(`'${url}'`)}&flags=${flags}`,function(data){
            if(data.ok === true){
                var html
                try{
                    loadedProbe = JSON.parse(data.result)
                    loadedProbe.url = url
                    html = $.ccio.init('jsontoblock',loadedProbe)
                }catch(err){
                    html = data.result
                }
                outputView.append(html)
            }else{
                $.ccio.init('note',{title:'Failed to Probe',text:data.error,type:'error'});
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
                        switch(true){
                            case codecNameContains('aac'):
                                audioStream.isAAC = true
                                audioStream = stream
                            break;
                            case codecNameContains('pcm_alaw'):
                            case codecNameContains('law'):
                                audioStream.isAAC = false
                                audioStream = stream
                            break;
                        }
                    break;
                }
            })

            var codecNameContains = function(find){
                return stringContains(find,selectedPrimary.codec_name)
            }
            var streamVideoCodec = 'copy'
            var monitorCaptureRate = ''
            var selectedType = selectedPrimary.codec_name
            if(stringContains('.m3u8',loadedProbe.url)){
                selectedType = 'hls'
            }else if(stringContains('rtmp://',loadedProbe.url) || stringContains('rtmps://',loadedProbe.url)){
                selectedType = 'rtmp'
            }else if(loadedProbe.url.substring(0,1) === '/'){
                if(!codecNameContains('h264'){
                    streamVideoCodec = 'libx264'
                }
                selectedType = 'local'
                monitorCaptureRate = loadedProbe.r_frame_rate ? eval(loadedProbe.r_frame_rate) : ''
            }else if(codecNameContains('h264') || codecNameContains('hvec') || codecNameContains('h265')){
                selectedType = 'h264'
            }else if(codecNameContains('mjpg') || codecNameContains('mjpeg')){
                streamVideoCodec = 'libx264'
                selectedType = 'mjpeg'
                monitorCaptureRate = loadedProbe.r_frame_rate ? eval(loadedProbe.r_frame_rate) : ''
            }else if(codecNameContains('jpg') || codecNameContains('jpeg')){
                selectedType = 'jpeg'
                monitorCaptureRate = loadedProbe.r_frame_rate ? eval(loadedProbe.r_frame_rate) : ''
            }

            var monitorConfig = mergeDeep($.aM.generateDefaultMonitorSettings(),{
                type: selectedType,
                details: {
                    sfps: monitorCaptureRate,
                    auto_host: loadedProbe.url,
                    primary_input: `0:${selectedIndex || '0'}`,
                    stream_vcodec: streamVideoCodec,
                    stream_acodec: '',
                }
            })
            $.aM.import(loadedProbe)
            $.aM.e.modal('show')
        }
    })
    probeWindow.on('hidden.bs.modal',function(){
        outputView.empty()
    })
    probeWindow.find('.stop').click(function(e){
        el = $(this)
       // $.ccio.cx({f:'ffprobe',ff:'stop'})
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
