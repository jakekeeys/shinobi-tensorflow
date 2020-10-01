$(document).ready(function(e){

//Monitor Editor
$.aM = {}
var monitorEditorWindow = $('#add_monitor')
var monitorsForCopy = $('#copy_settings_monitors')
var monitorSectionInputMaps = $('#monSectionInputMaps')
var monitorStreamChannels = $('#monSectionStreamChannels')
var monSectionPresets = $('#monSectionPresets')
var copySettingsSelector = $('#copy_settings')
var monitorPresetsSelection = $('#monitorPresetsSelection')
var monitorPresetsNameField = $('#monitorPresetsName')
var editorForm = monitorEditorWindow.find('form')
var fieldsLoaded = {}
var sections = {}
var loadedPresets = {}
monitorEditorWindow.find('.follow-list ul').affix();
$.aM.generateDefaultMonitorSettings = function(){
    return {
       "mode": "start",
       "mid": $.ccio.gid(),
       "name": "Some Stream",
       "type": "h264",
       "host": "",
       "port": "",
       "path": "/",
       "height": "480",
       "width": "640",
       "ext": "mp4",
       "protocol": "http",
       "fps": "1",
       "details": {
           "max_keep_days": "",
           "notes": "",
           "dir": "",
           "rtmp_key": "",
           "auto_host_enable": "1",
           "auto_host": "",
           "rtsp_transport": "tcp",
           "muser": "",
           "mpass": "",
           "port_force": "0",
           "fatal_max": "0",
           "skip_ping": null,
           "is_onvif": null,
           "onvif_port": "",
           "primary_input": "0:0",
           "aduration": "1000000000",
           "probesize": "1000000000",
           "stream_loop": "0",
           "sfps": "",
           "accelerator": "0",
           "hwaccel": "auto",
           "hwaccel_vcodec": "",
           "hwaccel_device": "",
           "use_coprocessor": null,
           "stream_type": "hls",
           "stream_flv_type": "ws",
           "stream_flv_maxLatency": "",
           "stream_mjpeg_clients": "",
           "stream_vcodec": "copy",
           "stream_acodec": "no",
           "hls_time": "2",
           "hls_list_size": "3",
           "preset_stream": "ultrafast",
           "signal_check": "10",
           "signal_check_log": "0",
           "stream_quality": "15",
           "stream_fps": "2",
           "stream_scale_x": "",
           "stream_scale_y": "",
           "rotate_stream": "no",
           "svf": "",
           "tv_channel": "0",
           "tv_channel_id": "",
           "tv_channel_group_title": "",
           "stream_timestamp": "0",
           "stream_timestamp_font": "",
           "stream_timestamp_font_size": "",
           "stream_timestamp_color": "",
           "stream_timestamp_box_color": "",
           "stream_timestamp_x": "",
           "stream_timestamp_y": "",
           "stream_watermark": "0",
           "stream_watermark_location": "",
           "stream_watermark_position": "tr",
           "snap": "0",
           "snap_fps": "",
           "snap_scale_x": "",
           "snap_scale_y": "",
           "snap_vf": "",
           "vcodec": "copy",
           "crf": "1",
           "acodec": "no",
           "record_scale_y": "",
           "record_scale_x": "",
           "cutoff": "15",
           "rotate_record": "no",
           "vf": "",
           "timestamp": "0",
           "timestamp_font": "",
           "timestamp_font_size": "10",
           "timestamp_color": "white",
           "timestamp_box_color": "0x00000000@1",
           "timestamp_x": "(w-tw)/2",
           "timestamp_y": "0",
           "watermark": "0",
           "watermark_location": "",
           "watermark_position": "tr",
           "record_timelapse": null,
           "record_timelapse_mp4": null,
           "record_timelapse_fps": null,
           "record_timelapse_scale_x": "",
           "record_timelapse_scale_y": "",
           "record_timelapse_vf": "",
           "record_timelapse_watermark": null,
           "record_timelapse_watermark_location": "",
           "record_timelapse_watermark_position": null,
           "cust_input": "",
           "cust_stream": "",
           "cust_snap": "",
           "cust_record": "",
           "cust_detect": "",
           "cust_sip_record": "",
           "custom_output": "",
           "detector": "0",
           "detector_http_api": null,
           "detector_send_frames": "1",
           "detector_lock_timeout": "",
           "detector_save": "0",
           "detector_fps": "",
           "detector_scale_x": "640",
           "detector_scale_y": "480",
           "detector_record_method": "sip",
           "detector_trigger": "1",
           "detector_trigger_record_fps": "",
           "detector_timeout": "10",
           "detector_send_video_length": "",
           "watchdog_reset": "0",
           "detector_delete_motionless_videos": "0",
           "det_multi_trig": null,
           "group_detector_multi": "",
           "detector_webhook": "0",
           "detector_webhook_url": "",
           "detector_webhook_method": null,
           "detector_command_enable": "0",
           "detector_command": "",
           "detector_command_timeout": "",
           "detector_mail": "0",
           "detector_mail_timeout": "",
           "detector_discordbot": null,
           "detector_discordbot_send_video": null,
           "detector_discordbot_timeout": "",
           "use_detector_filters": null,
           "use_detector_filters_object": null,
           "cords": "[]",
           "detector_filters": "",
           "detector_pam": "1",
           "detector_show_matrix": null,
           "detector_sensitivity": "",
           "detector_max_sensitivity": "",
           "detector_threshold": "1",
           "detector_color_threshold": "",
           "detector_frame": "0",
           "detector_noise_filter": null,
           "detector_noise_filter_range": "",
           "detector_notrigger": "0",
           "detector_notrigger_mail": "0",
           "detector_notrigger_timeout": "",
           "detector_audio": null,
           "detector_audio_min_db": "",
           "detector_audio_max_db": "",
           "detector_use_detect_object": "0",
           "detector_send_frames_object": null,
           "detector_obj_region": null,
           "detector_use_motion": "1",
           "detector_fps_object": "",
           "detector_scale_x_object": "",
           "detector_scale_y_object": "",
           "detector_lisence_plate": "0",
           "detector_lisence_plate_country": "us",
           "detector_buffer_vcodec": "auto",
           "detector_buffer_acodec": null,
           "detector_buffer_fps": "",
           "detector_buffer_hls_time": "",
           "detector_buffer_hls_list_size": "",
           "detector_buffer_start_number": "",
           "detector_buffer_live_start_index": "",
           "control": "0",
           "control_base_url": "",
           "control_url_method": null,
           "control_digest_auth": null,
           "control_stop": "0",
           "control_url_stop_timeout": "",
           "control_url_center": "",
           "control_url_left": "",
           "control_url_left_stop": "",
           "control_url_right": "",
           "control_url_right_stop": "",
           "control_url_up": "",
           "control_url_up_stop": "",
           "control_url_down": "",
           "control_url_down_stop": "",
           "control_url_enable_nv": "",
           "control_url_disable_nv": "",
           "control_url_zoom_out": "",
           "control_url_zoom_out_stop": "",
           "control_url_zoom_in": "",
           "control_url_zoom_in_stop": "",
           "groups": "[]",
           "loglevel": "warning",
           "sqllog": "0",
           "detector_cascades": "",
           "stream_channels": "",
           "input_maps": "",
           "input_map_choices": ""
        },
       "shto": "[]",
       "shfr": "[]"
    }
}
var getHumanizedMonitorConfig = function(monitor){
    var humanizedMonitorKeys = {}
    $.each(monitor,function(key,value){
        if(key === 'details'){
            humanizedMonitorKeys.details = {}
            $.each(value,function(key,value){
                humanizedMonitorKeys.details[fieldsLoaded[`detail=${key}`] && fieldsLoaded[`detail=${key}`].field ? fieldsLoaded[`detail=${key}`].field + ` (${key})` : key] = value
            })
        }else{
            humanizedMonitorKeys[fieldsLoaded[key] && fieldsLoaded[key].field ? fieldsLoaded[key].field : key] = value
        }
    })
    return humanizedMonitorKeys
}
var getSelectedMonitorInfo = function(){
    var groupKey = monitorEditorWindow.attr('ke')
    var monitorId = monitorEditorWindow.attr('mid')
    return {
        ke: groupKey,
        mid: monitorId,
        auth: $user.auth_token,
    }
}
var differentiateMonitorConfig = function(firstConfig,secondConfig){
    console.log(firstConfig,secondConfig)
    var diffedConfig = {}
    var firstConfigEditable = Object.assign(firstConfig,{details:$.parseJSON(firstConfig.details)})
    var secondConfigEditable = Object.assign(secondConfig,{details:$.parseJSON(secondConfig.details)})
    return diffObject(firstConfigEditable,secondConfigEditable)
}
var copyMonitorSettingsToSelected = function(monitorConfig){
    var monitorDetails = $.parseJSON(monitorConfig.details);
    var copyMonitors = monitorsForCopy.val();
    var chosenSections = [];
    var chosenMonitors = {};

    if(!copyMonitors||copyMonitors.length===0){
        $.ccio.init('note',{title:lang['No Monitors Selected'],text:lang.monSavedButNotCopied})
        return
    }

    monitorEditorWindow.find('[copy]').each(function(n,v){
        var el = $(v)
        if(el.val() === '1'){
            chosenSections.push(el.attr('copy'))
        }
    })
    var alterSettings = function(settingsToAlter,monitor){
        monitor.details = $.parseJSON(monitor.details);
        var searchElements = []
        if(settingsToAlter.indexOf('field=') > -1){
            var splitSettingsToAlter = settingsToAlter.split('=')
            if(splitSettingsToAlter[1] === 'detail' && splitSettingsToAlter[2]){
                searchElements = monitorEditorWindow.find(`[detail="${splitSettingsToAlter[2]}"]`)
            }else{
                searchElements = monitorEditorWindow.find(`[name="${splitSettingsToAlter[1]}"]`)
            }
        }else{
            searchElements = monitorEditorWindow.find(settingsToAlter).find('input,select,textarea')
        }
        searchElements.each(function(n,v){
            var el = $(v);
            var name = el.attr('name')
            var detail = el.attr('detail')
            var value
            switch(true){
                case !!name:
                    var value = monitorConfig[name]
                    monitor[name] = value;
                break;
                case !!detail:
                    detail = detail.replace('"','')
                    var value = monitorDetails[detail]
                    monitor.details[detail] = value;
                break;
            }
        })
        monitor.details = JSON.stringify(monitor.details);
        return monitor;
    }
    $.each(copyMonitors,function(n,id){
        var monitor
        if(monitorConfig.id === id)return;
        if(id === '$New'){
            monitor = $.aM.generateDefaultMonitorSettings();
            //connection
            monitor.name = monitorConfig.name+' - '+monitor.mid
            monitor.type = monitorConfig.type
            monitor.protocol = monitorConfig.protocol
            monitor.host = monitorConfig.host
            monitor.port = monitorConfig.port
            monitor.path = monitorConfig.path
            monitor.details.fatal_max = monitorDetails.fatal_max
            monitor.details.port_force = monitorDetails.port_force
            monitor.details.muser = monitorDetails.muser
            monitor.details.password = monitorDetails.password
            monitor.details.rtsp_transport = monitorDetails.rtsp_transport
            monitor.details.auto_host = monitorDetails.auto_host
            monitor.details.auto_host_enable = monitorDetails.auto_host_enable
            //input
            monitor.details.aduration = monitorDetails.aduration
            monitor.details.probesize = monitorDetails.probesize
            monitor.details.stream_loop = monitorDetails.stream_loop
            monitor.details.sfps = monitorDetails.sfps
            monitor.details.accelerator = monitorDetails.accelerator
            monitor.details.hwaccel = monitorDetails.hwaccel
            monitor.details.hwaccel_vcodec = monitorDetails.hwaccel_vcodec
            monitor.details.hwaccel_device = monitorDetails.hwaccel_device
        }else{
            monitor = Object.assign({},$.ccio.init('cleanMon',$.ccio.mon[$user.ke+id+$user.auth_token]));
        }
        $.each(chosenSections,function(n,section){
            monitor = alterSettings(section,monitor)
        })
        $.post(getApiPrefix()+'/configureMonitor/'+$user.ke+'/'+monitor.mid,{data:JSON.stringify(monitor)},function(d){
            $.ccio.log(d)
        })
        chosenMonitors[monitor.mid] = monitor;
    })
}
var getMonitorEditFormFields = function(){
    var response = {ok: true}
    var monitorConfig = editorForm.serializeObject()
    var errorsFound = []
    $.each(monitorConfig,function(n,v){monitorConfig[n]=v.trim()});
    $.each(['fps','width','height','port'],function(n,key){
        monitorConfig[key] = !isNaN(monitorConfig[key]) ? parseFloat(monitorConfig[key]) : monitorConfig[key]
    })
    monitorConfig.mid = monitorConfig.mid.replace(/[^\w\s]/gi,'').replace(/ /g,'')
    if(monitorConfig.mid.length < 3){errorsFound.push('Monitor ID too short')}
    if(monitorConfig.port == ''){
        if(monitorConfig.protocol === 'https'){
            monitorConfig.port = 443
        }else{
            monitorConfig.port = 80
        }
    }
    if(monitorConfig.name == ''){errorsFound.push('Monitor Name cannot be blank')}
//    if(monitorConfig.protocol=='rtsp'){monitorConfig.ext='mp4',monitorConfig.type='rtsp'}
    if(errorsFound.length > 0){
        response.ok = false
        response.errors = errorsFound
        return response;
    }
    response.monitorConfig = monitorConfig
    return response
}
var addSection = function(section){
    sections[section.name] = {
        id: section.id,
        color: section.color
    }
    if(section.info){
        $.each(section.info,function(m,block){
            if(block.isFormGroupGroup === true){
                addSection(block)
            }else if(block.name){
                fieldsLoaded[block.name] = block
            }
        })
    }
    if(section.blocks){
        $.each(section.blocks,function(m,block){
            addSection(block)
        })
    }
}
$.each($.ccio.definitions['Monitor Settings'].blocks,function(n,section){
    addSection(section)
})
var drawList = function(){
    var list = monitorEditorWindow.find('.follow-list ul')
    var html = ''
    $.each(sections,function(sectionName,section){
        var sectionId = section.id
        var el = $('#' + sectionId + ':visible')
        if(el.length > 0){
            html += `<li><a class="scrollTo" href="#${sectionId}" scrollToParent="#add_monitor .modal-body"><span class="dot dot-${section.color}"></span>${sectionName}</a></li>`
        }
    })
    list.html(html)
}
monitorEditorWindow.on('shown.bs.modal', function () {
    drawList()
})
$.aM.import = function(options){
    var monitorConfig = options.values || options
    $.get(getApiPrefix()+'/hls/'+monitorConfig.ke+'/'+monitorConfig.mid+'/detectorStream.m3u8',function(data){
        $('#monEditBufferPreview').html(data)
    })
    monitorEditorWindow.find('.edit_id').text(monitorConfig.mid);
    monitorEditorWindow.attr('mid',monitorConfig.mid).attr('ke',monitorConfig.ke).attr('auth',monitorConfig.auth || $user.auth_token)
    $.each(monitorConfig,function(n,v){
        monitorEditorWindow.find('[name="'+n+'"]').val(v).change()
    })
    var monitorDetails = $.parseJSON(monitorConfig.details);
    //get maps
    monitorSectionInputMaps.empty()
    if(monitorDetails.input_maps && monitorDetails.input_maps !== ''){
        var input_maps
        try{
            input_maps = $.parseJSON(monitorDetails.input_maps)
        }catch(er){
            input_maps = monitorDetails.input_maps;
        }
        if(input_maps.length > 0){
            showInputMappingFields()
            $.each(input_maps,function(n,v){
                var tempID = $.ccio.tm('input-map')
                var parent = $('#monSectionMap'+tempID)
                $.each(v,function(m,b){
                    parent.find('[map-detail="'+m+'"]').val(b).change()
                })
            })
        }else{
            showInputMappingFields(false)
        }
    }
    //get channels
    monitorStreamChannels.empty()
    if(monitorDetails.stream_channels&&monitorDetails.stream_channels!==''){
        var stream_channels
        try{
            stream_channels = $.parseJSON(monitorDetails.stream_channels)
        }catch(er){
            stream_channels = monitorDetails.stream_channels;
        }
        $.each(stream_channels,function(n,v){
            var tempID = $.ccio.tm('stream-channel')
            var parent = $('#monSectionChannel'+tempID)
            $.each(v,function(m,b){
                parent.find('[channel-detail="'+m+'"]').val(b)
            })
        })
    }
    //get map choices for outputs
    monitorEditorWindow.find('[input-mapping] .choices').empty()
    if(monitorDetails.input_map_choices&&monitorDetails.input_map_choices!==''){
        var input_map_choices
        try{
            input_map_choices = $.parseJSON(monitorDetails.input_map_choices)
        }catch(er){
            input_map_choices = monitorDetails.input_map_choices;
        }
        $.each(input_map_choices,function(n,v){
            $.each(v,function(m,b){
                var parent = $('[input-mapping="'+n+'"] .choices')
                $.ccio.tm('input-map-selector',b,parent)
            })
        })
    }
    monitorEditorWindow.find('[detail]').each(function(n,v){
        v=$(v).attr('detail');if(!monitorDetails[v]){monitorDetails[v]=''}
    })
    $.each(monitorDetails,function(n,v){
        var theVal = v;
        if(v instanceof Object){
            theVal = JSON.stringify(v);
        }
        monitorEditorWindow.find('[detail="'+n+'"]').val(theVal).change();
    });
    $.each(monitorDetails,function(n,v){
        try{
            var variable=$.parseJSON(v)
        }catch(err){
            var variable=v
        }
        if(variable instanceof Object){
            $('[detailContainer="'+n+'"][detailObject]').prop('checked',false)
            $('[detailContainer="'+n+'"][detailObject]').parents('.mdl-js-switch').removeClass('is-checked')
            if(variable instanceof Array){
                $.each(variable,function(m,b,parentOfObject){
                    $('[detailContainer="'+n+'"][detailObject="'+b+'"]').prop('checked',true)
                    parentOfObject=$('[detailContainer="'+n+'"][detailObject="'+b+'"]').parents('.mdl-js-switch')
                    parentOfObject.addClass('is-checked')
                })
            }else{
                $.each(variable,function(m,b){
                    if(typeof b ==='string'){
                       $('[detailContainer="'+n+'"][detailObject="'+m+'"]').val(b).change()
                    }else{
                        $('[detailContainer="'+n+'"][detailObject="'+m+'"]').prop('checked',true)
                        parentOfObject=$('[detailContainer="'+n+'"][detailObject="'+m+'"]').parents('.mdl-js-switch')
                        parentOfObject.addClass('is-checked')
                    }
                })
            }
        }
    });
    try{
        $.each(['groups','group_detector_multi'],function(m,b){
            var tmp=''
            $.each($user.mon_groups,function(n,v){
                tmp+='<li class="mdl-list__item">';
                tmp+='<span class="mdl-list__item-primary-content">';
                tmp+=v.name;
                tmp+='</span>';
                tmp+='<span class="mdl-list__item-secondary-action">';
                tmp+='<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">';
                tmp+='<input type="checkbox" '+b+' value="'+v.id+'" class="mdl-switch__input"';
                if(!monitorDetails[b]){
                    monitorDetails[b]=[]
                }
                if(monitorDetails[b].indexOf(v.id)>-1){tmp+=' checked';}
                tmp+=' />';
                tmp+='</label>';
                tmp+='</span>';
                tmp+='</li>';
            })
            $('#monitor_'+b).html(tmp)
        })
        componentHandler.upgradeAllRegistered()
    }catch(er){
        console.log(er)
        //no group, this 'try' will be removed in future.
    };
    copySettingsSelector.val('0').change()

    drawPresetsSection()

    var tmp = '';
    $.each($.ccio.mon,function(n,v){
        if(v.ke === $user.ke){
            tmp += $.ccio.tm('option',{auth_token:$user.auth_token,id:v.mid,name:v.name},null,$user);
        }
    })
    monitorsForCopy.find('optgroup').html(tmp)
    drawList()
}
//parse "Automatic" field in "Input" Section
monitorEditorWindow.on('change','.auto_host_fill input,.auto_host_fill select',function(e){
    var theSwitch = monitorEditorWindow.find('[detail="auto_host_enable"]').val()
    if(!theSwitch||theSwitch===''){
        theSwitch='1'
    }
    if(theSwitch==='1'){
        return
    }
    if(monitorEditorWindow.find('[name="host"]').val() !== ''){
        monitorEditorWindow.find('[detail="auto_host"]').val(buildMonitorURL())
    }
})
monitorEditorWindow.on('change','[detail="auto_host"]',function(e){
    var isRTSP = false
    var inputType = monitorEditorWindow.find('[name="type"]').val()
    var url = $(this).val()
    var theSwitch = monitorEditorWindow.find('[detail="auto_host_enable"]')
    var disabled = theSwitch.val()
    if(!disabled||disabled===''){
        //if no value, then probably old version of monitor config. Set to Manual to avoid confusion.
        disabled='0'
        theSwitch.val('0').change()
    }
    if(disabled==='0'){
        return
    }
    if(inputType === 'local'){
        monitorEditorWindow.find('[name="path"]').val(url).change()
    }else{
        var urlSplitByDots = url.split('.')
        var has = function(query,searchIn){if(!searchIn){searchIn=url;};return url.indexOf(query)>-1}
        var protocol = url.split('://')[0]
        console.log(url.split('://'))
        //switch RTSP, RTMP and RTMPS to parse URL
        if(has('rtsp://')){
            isRTSP = true;
            url = url.replace('rtsp://','http://')
        }
        if(has('rtmp://')){
            isRTMP = true;
            url = url.replace('rtmp://','http://')
        }
        if(has('rtmps://')){
            isRTMPS = true;
            url = url.replace('rtmps://','http://')
        }
        //parse URL
        var parsedURL = document.createElement('a');
        parsedURL.href = url;
        var pathname = parsedURL.pathname
        if(url.indexOf('?') > -1){
            pathname += '?'+url.split('?')[1]
        }
        monitorEditorWindow.find('[name="protocol"]').val(protocol).change()
        if(isRTSP){
            monitorEditorWindow.find('[detail="rtsp_transport"]').val('tcp').change()
            monitorEditorWindow.find('[detail="aduration"]').val(1000000).change()
            monitorEditorWindow.find('[detail="probesize"]').val(1000000).change()
        }
        monitorEditorWindow.find('[detail="muser"]').val(parsedURL.username).change()
        monitorEditorWindow.find('[detail="mpass"]').val(parsedURL.password).change()
        monitorEditorWindow.find('[name="host"]').val(parsedURL.hostname).change()
        monitorEditorWindow.find('[name="port"]').val(parsedURL.port).change()
        monitorEditorWindow.find('[name="path"]').val(pathname).change()
        delete(parsedURL)
    }
})
monitorEditorWindow.find('.refresh_cascades').click(function(e){
    $.ccio.cx({f:'ocv_in',data:{f:'refreshPlugins',ke:$user.ke}})
})
editorForm.submit(function(e){
    e.preventDefault();
    var validation = getMonitorEditFormFields()
    if(!validation.ok){
        var errorsFound = validation.errors
        $.sM.e.find('.msg').html(errorsFound.join('<br>'));
        $.ccio.init('note',{title:'Configuration Invalid',text:errorsFound.join('<br>'),type:'error'});
    }
    var monitorConfig = validation.monitorConfig
    $.post(getApiPrefix()+'/configureMonitor/'+$user.ke+'/'+monitorConfig.mid,{data:JSON.stringify(monitorConfig)},function(d){
        $.ccio.log(d)
    })
    //
    if(copySettingsSelector.val() === '1'){
        copyMonitorSettingsToSelected(monitorConfig)
    }
    monitorEditorWindow.modal('hide')
    return false;
});
//////////////////
//Input Map (Feed)
var mapPlacementInit = function(){
    $('.input-map').each(function(n,v){
        var _this = $(this)
        _this.find('.place').text(n+1)
    })
}
var monitorSectionInputMapsave = function(){
    var mapContainers = $('[input-mapping]');
    var stringForSave = {}
    mapContainers.each(function(q,t){
        var mapRowElement = $(t).find('.map-row');
        var mapRow = []
        mapRowElement.each(function(n,v){
            var map={}
            $.each($(v).find('[map-input]'),function(m,b){
                map[$(b).attr('map-input')]=$(b).val()
            });
            mapRow.push(map)
        });
        stringForSave[$(t).attr('input-mapping')] = mapRow;
    });
    monitorEditorWindow.find('[detail="input_map_choices"]').val(JSON.stringify(stringForSave)).change();
}
monitorSectionInputMaps.on('click','.delete',function(){
    $(this).parents('.input-map').remove()
    var inputs = $('[map-detail]')
    if(inputs.length===0){
        monitorEditorWindow.find('[detail="input_maps"]').val('[]').change()
        showInputMappingFields(false)
    }else{
        inputs.first().change()
        showInputMappingFields()
    }
    mapPlacementInit()
})
monitorEditorWindow.on('change','[map-detail]',function(){
    var el = monitorSectionInputMaps.find('.input-map')
    var selectedMaps = []
    el.each(function(n,v){
        var map={}
        $.each($(v).find('[map-detail]'),function(m,b){
            map[$(b).attr('map-detail')]=$(b).val()
        });
        selectedMaps.push(map)
    });
    monitorEditorWindow.find('[detail="input_maps"]').val(JSON.stringify(selectedMaps)).change()
})
monitorEditorWindow.on('click','[input-mapping] .add_map_row',function(){
    $.ccio.tm('input-map-selector',{},$(this).parents('[input-mapping]').find('.choices'))
    monitorSectionInputMapsave()
})
monitorEditorWindow.on('click','[input-mapping] .delete_map_row',function(){
    $(this).parents('.map-row').remove()
    monitorSectionInputMapsave()
})
monitorEditorWindow.on('change','[map-input]',function(){
    monitorSectionInputMapsave()
})
//////////////////
//Stream Channels
var monitorStreamChannelsave = function(){
    var el = monitorStreamChannels.find('.stream-channel')
    var selectedChannels = []
    el.each(function(n,v){
        var channel={}
        $.each($(v).find('[channel-detail]'),function(m,b){
            channel[$(b).attr('channel-detail')]=$(b).val()
        });
        selectedChannels.push(channel)
    });
    monitorEditorWindow.find('[detail="stream_channels"]').val(JSON.stringify(selectedChannels)).change()
}
var channelPlacementInit = function(){
    $('.stream-channel').each(function(n,v){
        var _this = $(this)
        _this.attr('stream-channel',n)
        _this.find('.place').text(n)
        _this.find('[input-mapping]').attr('input-mapping','stream_channel-'+n)
        monitorSectionInputMapsave()
    })
}
var buildMonitorURL = function(){
    var user = monitorEditorWindow.find('[detail="muser"]').val();
    var pass = monitorEditorWindow.find('[detail="mpass"]').val();
    var host = monitorEditorWindow.find('[name="host"]').val();
    var protocol = monitorEditorWindow.find('[name="protocol"]').val();
    var port = monitorEditorWindow.find('[name="port"]').val();
    var path = monitorEditorWindow.find('[name="path"]').val();
    var type = monitorEditorWindow.find('[name="type"]').val();
    if(type === 'local'){
        url = path;
    }else{
        if(host.indexOf('@') === -1 && user !== ''){
            host = user + ':' + pass + '@' + host;
        }
        url = $.ccio.init('url',{
            user: user,
            pass: pass,
            host: host,
            protocol: protocol,
            port: port,
            path: path,
            type: type,
        }) + path;
    }
    return url
}
var showInputMappingFields = function(showMaps){
    var el = $('[input-mapping],.input-mapping')
    if(showMaps === undefined)showMaps = true
    if(showMaps){
        el.show()
    }else{
        el.hide()
    }
    drawList()
}
monitorStreamChannels.on('click','.delete',function(){
    $(this).parents('.stream-channel').remove()
    monitorStreamChannelsave()
    channelPlacementInit()
})
monitorEditorWindow.on('change','[channel-detail]',function(){
    monitorStreamChannelsave()
})
//////////////////
monitorEditorWindow.on('change','[groups]',function(){
  var e={};
    var el = monitorEditorWindow.find('[groups]:checked');
    var selectedGroups = [];
    el.each(function(n,v){
        selectedGroups.push($(v).val())
    });
    monitorEditorWindow.find('[detail="groups"]').val(JSON.stringify(selectedGroups)).change()
})
monitorEditorWindow.on('change','[group_detector_multi]',function(){
  var e={};
    var el = monitorEditorWindow.find('[group_detector_multi]:checked');
    var selectedMultiTrigger=[];
    el.each(function(n,v){
        selectedMultiTrigger.push($(v).val())
    });
    monitorEditorWindow.find('[detail="group_detector_multi"]').val(JSON.stringify(selectedMultiTrigger)).change()
})
monitorEditorWindow.on('change','.detector_cascade_selection',function(){
  var e={};
    var el = monitorEditorWindow.find('.detector_cascade_selection:checked');
    var selectedCascades = {};
    el.each(function(n,v){
        selectedCascades[$(v).val()]={}
    });
    monitorEditorWindow.find('[detail="detector_cascades"]').val(JSON.stringify(selectedCascades)).change()
})
//monitorEditorWindow.on('change','.detector_cascade_selection',function(){
//  var e={};
//    e.details=monitorEditorWindow.find('[name="details"]')
//    try{
//        e.detailsVal=$.parseJSON(e.details.val())
//    }catch(err){
//        e.detailsVal={}
//    }
//    e.detailsVal.detector_cascades=[];
//    var el = monitorEditorWindow.find('.detector_cascade_selection:checked');
//    el.each(function(n,v){
//        e.detailsVal.detector_cascades.push($(v).val())
//    });
//    e.details.val(JSON.stringify(e.detailsVal))
//})
monitorEditorWindow.find('.probe_config').click(function(){
    $.pB.submit(buildMonitorURL(),true)
})
monitorEditorWindow.find('.import_config').click(function(e){
    var el = $(this);
    var monitorId = el.parents('[mid]').attr('mid');
    $.confirm.create({
        title: lang['Import Monitor Configuration'],
        body: lang.ImportMonitorConfigurationText+'<div style="margin-top:15px"><div class="form-group"><textarea placeholder="'+lang['Paste JSON here.']+'" class="form-control"></textarea></div><label class="upload_file btn btn-primary btn-block"> Upload File <input class="upload" type=file name="files[]"></label></div>',
        clickOptions: {
            title: 'Import',
            class: 'btn-primary'
        },
        clickCallback: function(){
            try{
                var monitorConfig = $.parseJSON($.confirm.e.find('textarea').val());
                $.aM.import(monitorConfig)
                monitorEditorWindow.modal('show')
            }catch(err){
                $.ccio.log(err)
                $.ccio.init('note',{title:lang['Invalid JSON'],text:lang.InvalidJSONText,type:'error'})
            }
        }
    })
    $.confirm.e.find('.upload').change(function(e){
        var files = e.target.files; // FileList object
        f = files[0];
        var reader = new FileReader();
        reader.onload = function(ee) {
            $.confirm.e.find('textarea').val(ee.target.result);
        }
        reader.readAsText(f);
    });
});
monitorEditorWindow.find('.save_config').click(function(e){
    //export monior config in view
  var el = $(this);
  var monitorId = el.parents('[mid]').attr('mid');
  var form = editorForm.serializeObject();
    if(!monitorId||monitorId===''){
        monitorId='NewMonitor'
    }
    form.details = $.parseJSON(form.details)
    e.dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(form));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',e.dataStr)
        .attr('download','Shinobi_'+monitorId+'_config.json')
        [0].click()
});
monitorEditorWindow.find('.add_map').click(function(e){
    showInputMappingFields()
    $.ccio.tm('input-map')
});
monitorEditorWindow.find('.add_channel').click(function(e){
    $.ccio.tm('stream-channel')
});
editorForm.find('[detail="stream_type"]').change(function(e){
    var el = $(this);
    if(el.val()==='jpeg')editorForm.find('[detail="snap"]').val('1').change()
})
editorForm.find('[name="type"]').change(function(e){
    var el = $(this);
    if(el.val()==='h264')editorForm.find('[name="protocol"]').val('rtsp').change()
})
editorForm.find('[detail]').change($.ccio.form.details)
editorForm.on('change','[selector]',function(){
    var el = $(this);
    var key = el.attr('selector')
    var value = el.val();
    e.triggerChange = el.attr('triggerchange')
    e.triggerChangeIgnore = el.attr('triggerChangeIgnore')
    editorForm.find('.' + key + '_input').hide()
    editorForm.find('.' + key + '_' + value).show();
    editorForm.find('.' + key + '_text').text($(this).find('option:selected').text())
    if(e.triggerChange && e.triggerChange !== '' && !e.triggerChangeIgnore || (e.triggerChangeIgnore && e.triggerChangeIgnore.split(',').indexOf(value) === -1)){
        console.log(e.triggerChange)
        $(e.triggerChange).trigger('change')
    }
    drawList()
});
editorForm.find('[name="type"]').change(function(e){
    var el = $(this);
    var value = el.val();
    var pathField = editorForm.find('[name="path"]');
    switch(value){
        case'local':case'socket':
            pathField.attr('placeholder','/dev/video0')
        break;
        default:
            pathField.attr('placeholder','/videostream.cgi?1')
        break;
    }
});
var boxWrappersHidden = $.ccio.op().boxWrappersHidden || {}
$.each(boxWrappersHidden,function(boxId,hide){
    if(hide){
        $(`#${boxId}`).addClass('hide-box-wrapper')
    }
})
monitorEditorWindow.find('.monitor-section-header').click(function(e){
    var parent = $(this).parent('.form-group-group')
    var boxWrapper = parent.attr('id')
    parent.toggleClass('hide-box-wrapper')
    var hideBoxWrapper = parent.hasClass('hide-box-wrapper')
    boxWrappersHidden[boxWrapper] = hideBoxWrapper
    $.ccio.op('boxWrappersHidden',boxWrappersHidden)
});
    $.aM.connectedDetectorPlugins = {}
    $.aM.addDetectorPlugin = function(name,d){
        $.aM.connectedDetectorPlugins[d.plug] = {
            id: d.id,
            plug: d.plug,
            notice: d.notice,
            connectionType: d.connectionType
        }
        $.aM.drawPluginElements()
    }
    $.aM.removeDetectorPlugin = function(name){
        delete($.aM.connectedDetectorPlugins[name])
        $.aM.drawPluginElements(name)
    }
    $.aM.drawPluginElements = function(){
        if(Object.keys($.aM.connectedDetectorPlugins).length === 0){
            $('.stream-objects .stream-detected-object').remove()
            $('.shinobi-detector').hide()
            $('.shinobi-detector-msg').empty()
            $('.shinobi-detector_name').empty()
            $('.shinobi-detector_plug').hide()
            $('.shinobi-detector-invert').show()
            drawList()
        }else{
            var pluginTitle = []
            var pluginNotice = []
            $.each($.aM.connectedDetectorPlugins,function(name,d){
                pluginTitle.push(name)
                if(d.notice){
                    pluginNotice.push('<b>' + d.plug + '</b> : ' + d.notice)
                }
                $('.shinobi-detector-'+d.plug).show()
            })
            $('.shinobi-detector').show()
            $('.shinobi-detector-invert').hide()
            $('.shinobi-detector_name').text(pluginTitle.join(', '))
            if(pluginNotice.length > 0)$('.shinobi-detector-msg').text(pluginNotice.join('<br>'))
            drawList()
        }
    }
    // presets
    var loadPresets = function(callback){
        $.get(getApiPrefix() + '/monitorStates/' + $user.ke,function(d){
            var presets = d.presets
            loadedPresets = {}
            $.each(presets,function(n,preset){
                loadedPresets[preset.name] = preset
            })
            drawPresetsSection()
            if(callback)callback(presets)
        })
    }
    var drawPresetsSection = function(){
        var html = ''
        var selectedMonitor = getSelectedMonitorInfo()
        $.each(loadedPresets,function(n,preset){
            var hasSelectedMonitor = false
            var humanizedMonitorKeys
            var presetMonitors = preset.details.monitors || []
            $.each(presetMonitors,function(n,monitor){
                if(monitor.mid === selectedMonitor.mid){
                    hasSelectedMonitor = true
                    humanizedMonitorKeys = getHumanizedMonitorConfig(monitor)
                }
            })
            html += `<li class="mdl-list__item" preset-name="${preset.name}">
                <span class="mdl-list__item-primary-content" style="word-break:break-all">
                    <code class="epic-text">${preset.name}</code>&nbsp;<code class="epic-text text-purple">${presetMonitors.length} Monitor${presetMonitors.length > 1 ? 's' : ''}</code> &nbsp;
                    ${hasSelectedMonitor ? `<ul class="json-to-block striped import-monitor-preset cursor-pointer">${$.ccio.init('jsontoblock',humanizedMonitorKeys)}</ul>` : ''}
                </span>
                <span class="mdl-list__item-secondary-action text-right" style="width:150px">
                    <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" style="margin-right: 15px">
                        <input type="checkbox" value="${preset.name}" ${hasSelectedMonitor ? 'checked' : ''} class="mdl-switch__input"/>
                    </label>
                    <a class="btn btn-danger delete-preset"><i class="fa fa-trash-o"></i></a>
                </span>
            </li>`
        })
        monitorPresetsSelection.html(html)
        componentHandler.upgradeAllRegistered()
    }
    var addNewPreset = function(callback){
        var newName = monitorPresetsNameField.val()
        if(newName === ''){
            return $.ccio.init('note',{title:lang['Invalid Data'],text:lang['Name cannot be empty.'],type:'error'})
        }
        var data = JSON.stringify({
            monitors: []
        })
        $.post(getApiPrefix() + '/monitorStates/' + $user.ke + '/' + newName + '/insert',{data:data},function(d){
            $.ccio.log(d)
            if(d.ok === true){
                loadPresets(function(presets){
                    if(callback)callback(d)
                })
                $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
            }
        })
    }
    var deletePreset = function(presetName,callback){
        var preset = loadedPresets[presetName]
        var monitorsAssociated = `<code>${lang.Presets}</code><br><br><div class="row">`
        $.each(preset.details.monitors,function(n,monitorConfigPartial){
            monitorsAssociated += `<div class="col-md-6 json-to-block striped">${$.ccio.init('jsontoblock',getHumanizedMonitorConfig(monitorConfigPartial))}</div>`
        })
        monitorsAssociated += '</div>'
        $.confirm.create({
            title: lang['Delete Monitor States Preset'],
            body: lang.deleteMonitorStateText1 + `<br><br>` + monitorsAssociated,
            clickOptions: {
                title:'Delete',
                class:'btn-danger'
            },
            clickCallback: function(){
                $.post(getApiPrefix() + '/monitorStates/' + $user.ke + '/' + presetName + '/delete',function(d){
                    $.ccio.log(d)
                    if(d.ok === true){
                        loadPresets(function(presets){
                            if(callback)callback(d)
                        })
                        $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
                    }
                })
            }
        })
    }
    var validateMonitorPreset = function(monitorPartialToAdd){
        var response = {ok: true}
        var numberOfKeys = Object.keys(monitorPartialToAdd)
        if(numberOfKeys.length < 2){
            response.ok = false
            response.msg = lang.monitorStateNotEnoughChanges
            return response
        }
        return response
    }
    var addMonitorToPreset = function(presetName,callback){
        var validation = getMonitorEditFormFields()
        if(!validation.ok){
            callback(true)
            return
        }
        var monitorConfig = validation.monitorConfig
        console.log(monitorConfig.mid)
        var inMemoryMonitorConfig = Object.assign({},$.ccio.init('cleanMon',$.ccio.mon[$user.ke+monitorConfig.mid+$user.auth_token]));
        var currentPreset = loadedPresets[presetName]
        var presetMonitors = currentPreset.details.monitors || []
        var newMonitorsArray = [].concat(presetMonitors)
        var monitorIndexInPreset = newMonitorsArray.findIndex(monitor => monitor.mid === monitorConfig.mid)
        delete(inMemoryMonitorConfig.ke)
        delete(monitorConfig.ke)
        var monitorPartialToAdd = differentiateMonitorConfig(inMemoryMonitorConfig,monitorConfig)
        monitorPartialToAdd.mid = monitorConfig.mid
        //validateMonitorPreset
        var monitorPresetValidation = validateMonitorPreset(monitorPartialToAdd)
        if(!monitorPresetValidation.ok){
            $.ccio.init('note',{title:lang.monitorStatesError,text:monitorPresetValidation.msg,type:'warning'})
            callback(true)
            return
        }
        //
        if(monitorIndexInPreset > -1){
            newMonitorsArray[monitorIndexInPreset] = monitorPartialToAdd
        }else{
            newMonitorsArray.push(monitorPartialToAdd)
        }
        var data = JSON.stringify({
            monitors: newMonitorsArray
        })
        $.post(getApiPrefix() + '/monitorStates/' + $user.ke + '/' + presetName + '/edit',{data:data},function(d){
            $.ccio.log(d)
            if(d.ok === true){
                loadPresets(function(presets){
                    callback(null,d)
                })
                $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
            }
        })
    }
    var removeMonitorFromPreset = function(presetName,callback){
        var validation = getMonitorEditFormFields()
        if(!validation.ok){
            return
        }
        var monitorConfig = validation.monitorConfig
        var currentPreset = loadedPresets[presetName]
        var presetMonitors = currentPreset.details.monitors || []
        var newMonitorsArray = [].concat(presetMonitors)
        var monitorIndexInPreset = newMonitorsArray.findIndex(monitor => monitor.mid === monitorConfig.mid)
        if(monitorIndexInPreset > -1){
            delete(newMonitorsArray[monitorIndexInPreset])
            newMonitorsArray = newMonitorsArray.filter(function () { return true })
        }
        var data = JSON.stringify({
            monitors: newMonitorsArray
        })
        $.post(getApiPrefix() + '/monitorStates/' + $user.ke + '/' + presetName + '/edit',{data:data},function(d){
            $.ccio.log(d)
            if(d.ok === true){
                loadPresets(function(presets){
                    callback(d)
                })
                $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
            }
        })
    }
    var loadMonitorPartialFromPreset = function(preset,monitorId){
        $.confirm.create({
            title: lang['Import Monitor Configuration'],
            body: lang.undoAllUnsaveChanges,
            clickOptions: {
                title: 'Import',
                class: 'btn-primary'
            },
            clickCallback: function(){
                var monitorConfigPartial = preset.details.monitors.find(monitor => monitor.mid === monitorId) || {};
                var copyCurrentConfig = $.ccio.init('cleanMon',$.ccio.mon[$user.ke+monitorId+$user.auth_token])
                copyCurrentConfig.details = $.parseJSON(copyCurrentConfig.details)
                var monitorObjectToLoad = mergeDeep(copyCurrentConfig,monitorConfigPartial);
                $.aM.import(monitorObjectToLoad)
            }
        })
    }
    loadPresets()
    monSectionPresets.find('.add-new').click(function(){
        addNewPreset()
    })
    monSectionPresets.on('click','.delete-preset',function(){
        var presetName = $(this).parents('[preset-name]').attr('preset-name')
        deletePreset(presetName)
    })
    monSectionPresets.on('click','.import-monitor-preset',function(e){
        e.preventDefault()
        var presetName = $(this).parents('[preset-name]').attr('preset-name')
        var preset = loadedPresets[presetName]
        var currentMonitorInEditor = getSelectedMonitorInfo()
        loadMonitorPartialFromPreset(preset,currentMonitorInEditor.mid)
        return false
    })
    monitorPresetsSelection.on('change','.mdl-switch__input',function(){
        var el = $(this)
        var name = el.val()
        if(el.is(':checked')){
            addMonitorToPreset(name,function(err,d){
                if(err){
                    el.prop("checked", false)
                    el.parents('.is-checked').removeClass('is-checked')
                }
            })
        }else{
            removeMonitorFromPreset(name,function(d){
            })
        }
    })
    //
    $.aM.channels = monitorStreamChannels
    $.aM.maps = monitorSectionInputMaps
    $.aM.e = monitorEditorWindow
})
