$(document).ready(function(e){
    var selectedApiKey = `${$user.auth_token}`
    var getUrlPieces = function(url){
        var el = document.createElement('a');
        el.href = url
        return el
        // el.host        // www.somedomain.com (includes port if there is one[1])
        // el.hostname    // www.somedomain.com
        // el.hash        // #top
        // el.href        // http://www.somedomain.com/account/search?filter=a#top
        // el.pathname    // /account/search
        // el.port        // (port if there is one[1])
        // el.protocol    // http:
        // el.search      // ?filter=a
    }
//multi monitor manager
var theWindow = $('#multi_mon')
var apiKeySelector = $('#multi_mon_api_key_selector')
var theTable = theWindow.find('.tableData tbody');
var theForm = theWindow.find('form');
var drawApiKeyList = function(){
    $.get($.ccio.init('location',$user)+$user.auth_token+'/api/'+$user.ke+'/list',function(d){
        var html = ''
        $.each(d.keys || [],function(n,key){
            html += `<option value="${key.code}">${key.code}</option>`
        })
        apiKeySelector.find('optgroup').html(html)
    })
}
var drawTable = function(){
    var tmp=''
    $.each($.ccio.mon,function(n,v){
        var streamURL = $.ccio.init('streamURL',v).replace($user.auth_token,selectedApiKey)
        if(streamURL!=='Websocket'&&v.mode!==('idle'&&'stop')){
            streamURL='<a target="_blank" href="'+streamURL+'">'+streamURL+'</a>'
        }
        var img = $('#left_menu [mid="'+v.mid+'"] [monitor="watch"]').attr('src')
        tmp+='<tr mid="'+v.mid+'" ke="'+v.ke+'" auth="'+selectedApiKey+'">'
        tmp+='<td><div class="checkbox"><input id="multimonCheck_'+v.ke+v.mid+selectedApiKey+'" type="checkbox" name="'+v.ke+v.mid+selectedApiKey+'" value="1"><label for="multimonCheck_'+v.ke+v.mid+selectedApiKey+'"></label></div></td>'
        tmp+='<td><a monitor="watch"><img class="small-square-img" src="'+img+'"></a></td><td>'+v.name+'<br><small>'+v.mid+'</small></td><td class="monitor_status">'+v.status+'</td><td><small>'+streamURL+'</small></td>'
        //buttons
        tmp+='<td class="text-right"><a title="'+lang.Pop+'" monitor="pop" class="btn btn-primary"><i class="fa fa-external-link"></i></a> <a title="'+lang.Calendar+'" monitor="calendar" class="btn btn-default"><i class="fa fa-calendar"></i></a> <a title="'+lang['Power Viewer']+'" class="btn btn-default" monitor="powerview"><i class="fa fa-map-marker"></i></a> <a title="'+lang['Time-lapse']+'" class="btn btn-default" monitor="timelapse"><i class="fa fa-angle-double-right"></i></a> <a title="'+lang['Videos List']+'" monitor="videos_table" class="btn btn-default"><i class="fa fa-film"></i></a> <a title="'+lang['Monitor Settings']+'" class="btn btn-default" monitor="edit"><i class="fa fa-wrench"></i></a></td>'
        tmp+='</tr>'
    })
    theTable.html(tmp)
}
var getSelectedMonitors = function(unclean){
    var arr = [];
    if(unclean === true){
        var monitors = $.ccio.mon
    }else{
        var monitors = $.ccio.init('cleanMons','object')
    }
    $.each(theForm.serializeObject(),function(n,v){
        console.log(monitors,n)
        arr.push(monitors[n])
    })
    return arr;
}
theForm.on('change','#multimon_select_all',function(e){
    var el = $(this);
    var isChecked = el.prop('checked')
    var nameField = theForm.find('input[type=checkbox][name]')
    if(isChecked === true){
        nameField.prop('checked',true)
    }else{
        nameField.prop('checked',false)
    }
})
theWindow.find('.import_config').click(function(){
    var el = $(this);
    var html = lang.ImportMultiMonitorConfigurationText+'<div style="margin-top:15px"><div class="form-group"><textarea placeholder="'+lang['Paste JSON here.']+'" class="form-control"></textarea></div><label class="upload_file btn btn-primary btn-block">'+lang['Upload File']+'<input class="upload" type=file name="files[]"></label></div>';
    $.confirm.create({
        title: lang['Import Monitor Configuration'],
        body: html,
        clickOptions: {
            title: lang['Import'],
            class: 'btn-primary'
        },
        clickCallback: function(){
            try{
                var postMonitor = function(v){
                    $.post($.ccio.init('location',$user)+$user.auth_token+'/configureMonitor/'+$user.ke+'/'+v.mid,{data:JSON.stringify(v,null,3)},function(d){
                        $.ccio.log(d)
                    })
                }
                var parseZmMonitor = function(Monitor){
                    console.log(Monitor)
                    var newMon = $.aM.generateDefaultMonitorSettings()
                    newMon.details = JSON.parse(newMon.details)
                    newMon.details.stream_type = 'jpeg'
                    switch(Monitor.Type.toLowerCase()){
                        case'ffmpeg':case'libvlc':
                            newMon.details.auto_host_enable = '1'
                            newMon.details.auto_host = Monitor.Path
                            if(newMon.auto_host.indexOf('rtsp://') > -1 || newMon.auto_host.indexOf('rtmp://') > -1 || newMon.auto_host.indexOf('rtmps://') > -1){
                                newMon.type = 'h264'
                            }else{
                                $.ccio.init('note',{title:lang['Please Check Your Settings'],text:lang.migrateText1,type:'error'})
                            }
                        break;
                        case'local':
                            newMon.details.auto_host = Monitor.Device
                        break;
                        case'remote':

                        break;
                    }
                    newMon.details = JSON.stringify(newMon.details)
                    console.log(newMon)
                    return newMon
                }
                var textFieldData = $.confirm.e.find('textarea').val()
                var parsedData = JSON.parse(textFieldData)
                //zoneminder one monitor
                if(parsedData.monitor){
                    $.aM.import({
                        values : parseZmMonitor(parsedData.monitor.Monitor)
                    })
                    $.aM.e.modal('show')
                }else
                //zoneminder multiple monitors
                if(parsedData.monitors){
                    $.each(parsedData.monitors,function(n,v){
                        $.aM.import({
                            values : parseZmMonitor(parsedData.Monitor)
                        })
                        parseZmMonitor(v.Monitor)
                    })
                }else
                //shinobi one monitor
                if(parsedData.mid){
                    postMonitor(parsedData)
                }else
                //shinobi multiple monitors
                if(parsedData[0] && parsedData[0].mid){
                    $.each(parsedData,function(n,v){
                        postMonitor(v)
                    })
                }
            }catch(err){
                //#EXTM3U
                if(textFieldData.indexOf('#EXTM3U') > -1 && textFieldData.indexOf('{"') === -1){
                    var m3u8List = textFieldData.replace('#EXTM3U','').trim().split('\n')
                    var parsedList = {}
                    var currentName
                    m3u8List.forEach(function(line){
                        if(line.indexOf('#EXTINF:-1,') > -1){
                            currentName = line.replace('#EXTINF:-1,','').trim()
                        }else{
                            parsedList[currentName] = line.trim()
                        }
                    })
                    $.each(parsedList,function(name,url){
                        var link = getUrlPieces(url)
                        var newMon = $.aM.generateDefaultMonitorSettings()
                        newMon.details = JSON.parse(newMon.details)
                        newMon.mid = 'HLS' + name.toLowerCase()
                        newMon.name = name
                        newMon.port = link.port
                        newMon.host = link.hostname
                        newMon.path = link.pathname
                        newMon.details.tv_channel = '1'
                        newMon.details.tv_channel_id = name
                        newMon.details.auto_host_enable = '1'
                        newMon.details.auto_host = url
                        newMon.details.stream_quality = '1'
                        newMon.details.stream_fps = ''
                        newMon.details.stream_vcodec = 'libx264'
                        newMon.details.stream_acodec = 'aac'
                        newMon.details.stream_type = 'hls'
                        newMon.details.hls_time = '10'
                        newMon.type = 'mp4'
                        newMon.details = JSON.stringify(newMon.details)
                        postMonitor(newMon)
                    })
                }else{
                    $.ccio.log(err)
                    $.ccio.init('note',{title:lang['Invalid JSON'],text:lang.InvalidJSONText,type:'error'})
                }
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
})
theWindow.find('.delete').click(function(){
    var arr = getSelectedMonitors(true);
    if(arr.length===0){
        $.ccio.init('note',{title:lang['No Monitors Selected'],text:lang['Select atleast one monitor to delete'],type:'error'});
        return
    }
    $.confirm.e.modal('show');
    $.confirm.title.text(lang['Delete']+' '+lang['Monitors'])
    var html = '<p>'+lang.DeleteMonitorsText+'</p>';
    $.confirm.body.html(html)
    $.confirm.click([
        {
            title:lang['Delete']+' '+lang['Monitors'],
            class:'btn-danger',
            callback:function(){
                $.each(arr,function(n,v){
                    $.get($.ccio.init('location',$user)+v.user.auth_token+'/configureMonitor/'+v.ke+'/'+v.mid+'/delete',function(data){
                        console.log(data)
                    })
                })
            }
        },
        {
            title:lang['Delete Monitors and Files'],
            class:'btn-danger',
            callback:function(){
                $.each(arr,function(n,v){
                    $.get($.ccio.init('location',$user)+v.user.auth_token+'/configureMonitor/'+v.ke+'/'+v.mid+'/delete?deleteFiles=true',function(data){
                        console.log(data)
                    })
                })
            }
        }
    ]);
})
theWindow.find('.save_config').click(function(){
    var el = $(this);
    var arr = getSelectedMonitors();
    if(arr.length===0){
        $.ccio.init('note',{title:lang['No Monitors Selected'],text:lang['Select atleast one monitor to delete'],type:'error'});
        return
    }
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(arr));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',dataStr)
        .attr('download','Shinobi_Monitors_'+(new Date())+'.json')
        [0].click()
})
theWindow.on('shown.bs.modal',function() {
    drawTable()
    drawApiKeyList()
})
apiKeySelector.change(function(){
    var value = $(this).val()
    console.log(value)
    selectedApiKey = `${value}`
    drawTable()
})
})
