$(document).ready(function(e){
    console.log("%cWarning!", "font: 2em monospace; color: red;");
    console.log('%cLeaving the developer console open is fine if you turn off "Network Recording". This is because it will keep a log of all files, including frames and videos segments.', "font: 1.2em monospace; ");
    if(!$.ccio.permissionCheck('monitor_create')){
        $('#add_monitor_button_main').remove()
    }
    $.each(['user_change','monitor_create','view_logs'],function(n,permission){
        if(!$.ccio.permissionCheck(permission)){
            $('.permission_'+permission).remove()
        }
    })

    //Group Selector
    $.gR={e:$('#group_list'),b:$('#group_list_button')};
    $.gR.drawList=function(){
      var e={};
        e.tmp='';
        $.each($.ccio.init('monGroup'),function(n,v){
            if($user.mon_groups[n]){
               e.tmp+='<li class="mdl-menu__item" groups="'+n+'">'+$user.mon_groups[n].name+'</li>'
            }
        })
        $.gR.e.html(e.tmp)
    }
    $.gR.e.on('click','[groups]',function(){
      var e={};
        e.e=$(this),
        e.a=e.e.attr('groups');
        var user=$.users[e.e.attr('auth')];
        if(!user){user=$user}
        if(user===$user){
            e.chosen_set='watch_on'
        }else{
            e.chosen_set='watch_on_links'
        }
        $.each($.ccio.op()[e.chosen_set],function(n,v){
            $.each(v,function(m,b){
                $.ccio.cx({f:'monitor',ff:'watch_off',id:m,ke:n},user)
            })
        })
        $.each($.ccio.mon_groups[e.a],function(n,v){
            $.ccio.cx({f:'monitor',ff:'watch_on',id:v.mid,ke:v.ke},user)
        })
    })
    $.ccio.sortListMonitors = function(user){
        var listKey = user.auth_token
        if(user.auth_token === $user.auth_token){
            listKey = 0
        }
        if(!user.details.monitorListOrder)user.details.monitorListOrder = {0:[]}
        var getIdPlace = function(x){return user.details.monitorListOrder[listKey].indexOf(x)}
        $(function() {
           $('.link-monitors-list[auth="'+user.auth_token+'"] .monitor_block').sort(function(a, b) {
               var contentA = getIdPlace($(a).attr('mid'))
               var contentB = getIdPlace($(b).attr('mid'))
               return contentA - contentB
            }).each(function() { $('.link-monitors-list[auth="'+user.auth_token+'"]').append($(this)); });
        })
    }
    //log stream writer
    $.logWriter = {}
    $.logWriter.floodTimeout = null
    $.logWriter.floodCounter = 0
    $.logWriter.draw = function(id,d,user){
        if($.logWriter.floodLock)return $.ccio.log('logWriter.floodLock : Log was dropped');
        if($.logWriter.floodTimeout){
            ++$.logWriter.floodCounter
        }
        if($.logWriter.floodCounter > 10){
            $.logWriter.floodLock = setTimeout(function(){
                delete($.logWriter.floodLock)
            },10000)
        }
        clearTimeout($.logWriter.floodTimeout)
        $.logWriter.floodTimeout = setTimeout(function(){
            delete($.logWriter.floodTimeout)
            $.logWriter.floodCounter = 0
        },2000)
        $.ccio.tm(4,d,'#logs,'+id+'.monitor_item .logs:visible,'+id+'#add_monitor:visible .logs',user)
    }
    //open all monitors
    $('.open-all-monitors').click(function(){
        $('#monitors_list .monitor_block').each(function(n,v){
            var el = $(v)
            var ke = el.attr('ke')
            var mid = el.attr('mid')
            var auth = el.attr('auth')
            var monItem = $('.monitor_item[ke='+ke+'][mid='+mid+'][auth='+auth+']')
            if(monItem.length > 0){
                monItem.find('[monitor="watch_on"]').click()
            }else{
                el.find('[monitor="watch"]').click()
            }
        })
    })
    //search monitors list
    $('#monitors_list_search').keyup(function(){
        var monitorBlocks = $('.monitor_block');
        var searchTerms = $(this).val().toLowerCase().split(' ')
        if(searchTerms.length === 0 || searchTerms[0] === ''){
            monitorBlocks.show()
            return
        }
        monitorBlocks.hide()
        $.each($.ccio.mon,function(n,monitor){
            var searchThis = JSON.stringify($.ccio.init('cleanMon',monitor)).toLowerCase().replace('"','');
            $.each(searchTerms,function(m,term){
                if(searchThis.indexOf(term) >-1 ){
                    $('.monitor_block[ke="'+monitor.ke+'"][mid="'+monitor.mid+'"]').show()
                }
            })
        })
    })
    //dynamic bindings
    $.ccio.windowFocus = true
    $(window).focus(function() {
        $.ccio.windowFocus = true
        clearInterval($.ccio.soundAlarmInterval)
    }).blur(function() {
        $.ccio.windowFocus = false
    });
    $('body')
    .on('click','.logout',function(e){
        var logout = function(user,callback){
            $.get(getApiPrefix() + '/logout/'+user.ke+'/'+user.uid,callback)
        }
        $.each($.users,function(n,linkedShinobiUser){
            logout(linkedShinobiUser,function(){});
        })
        logout($user,function(data){
            console.log(data)
            localStorage.removeItem('ShinobiLogin_'+location.host);
            location.href=location.href;
        });
    })
    .on('click','[video]',function(e){
        e.e=$(this),
        e.a=e.e.attr('video'),
        e.p=e.e.parents('[mid]'),
        e.ke=e.p.attr('ke'),
        e.mid=e.p.attr('mid'),
        e.file=e.p.attr('file');
        e.auth=e.p.attr('auth');
        e.status=e.p.attr('status');
        if(!e.ke||!e.mid){
            //for calendar plugin
            e.p=e.e.parents('[data-mid]'),
            e.ke=e.p.data('ke'),
            e.mid=e.p.data('mid'),
            e.file=e.p.data('file');
            e.auth=e.p.data('auth');
            e.status=e.p.data('status');
        }
        e.mon=$.ccio.mon[e.ke+e.mid+e.auth];
        switch(e.a){
            case'launch':
                e.preventDefault();
                e.href=$(this).attr('href')
                var el = $('#video_viewer')
                var videoContainer = el.find('.video-container')
                el.find('.modal-title span').html(e.mon.name+' - '+e.file)
                var html = '<video class="video_video" video="'+e.href+'" autoplay loop controls><source src="'+e.href+'" type="video/'+e.mon.ext+'"></video><br><small class="msg"></small>'
                videoContainer.html(html)
                el.find('video')[0].onerror = function(){
                    videoContainer.find('.msg').text(lang.h265BrowserText1)
                }
                el.attr('mid',e.mid);
                footer = el.find('.modal-footer');
                footer.find('.download_link').attr('href',e.href).attr('download',e.file);
                footer.find('[monitor="download"][host="dropbox"]').attr('href',e.href);
                el.modal('show')
                    .attr('ke',e.ke)
                    .attr('mid',e.mid)
                    .attr('auth',e.auth)
                    .attr('file',e.file);
                if(e.status==1){
                    $.get($.ccio.init('videoHrefToRead',e.href),function(d){
                        if(d.ok !== true)console.log(d,new Error())
                    })
                }
                setTimeout(function(){
                    destroyGpsHandlerForVideoFile(`video_viewer_gps_map_map`)
                    var videoElement = videoContainer.find('.video_video')
                    var gpsContainer = videoContainer.next()
                    var fullWidth = 'col-md-12'
                    var partialWidth = 'col-md-8'
                    createGpsHandlerForVideoFile({
                        ke: e.ke,
                        mid: e.mid,
                        file: e.file,
                        targetVideoElement: videoElement,
                        targetMapElement: `video_viewer_gps_map`,
                    },function(response){
                        if(response.ok){
                            videoContainer.addClass(partialWidth).removeClass(fullWidth)
                            gpsContainer.show()
                        }else{
                            videoContainer.addClass(fullWidth).removeClass(partialWidth)
                            gpsContainer.hide()
                        }
                    })
                },2000)
            break;
            case'delete':
                e.preventDefault();
                var videoLink = e.p.find('[download]').attr('href')
                var href = $(this).attr('href')
                console.log('videoLink',videoLink)
                console.log(href)
                if(!href){
                    href = $.ccio.init('location',$.users[e.auth])+e.auth+'/videos/'+e.ke+'/'+e.mid+'/'+e.file+'/delete'
                }
                console.log(href)
                $.confirm.e.modal('show');
                $.confirm.title.text(lang['Delete Video']+' : '+e.file)
                e.html=lang.DeleteVideoMsg
                e.html+='<video class="video_video" autoplay loop controls><source src="'+videoLink+'" type="video/'+e.mon.ext+'"></video>';
                $.confirm.body.html(e.html)
                $.confirm.click({title:'Delete Video',class:'btn-danger'},function(){
                    $.getJSON(href,function(d){
                        $.ccio.log(d)
                    })
                });
            break;
            case'download':
                e.preventDefault();
                switch(e.e.attr('host')){
                    case'dropbox':
                        if($.ccio.DropboxAppKey){
                            Dropbox.save(e.e.attr('href'),e.e.attr('download'),{progress: function (progress) {$.ccio.log(progress)},success: function () {
                                $.ccio.log(lang.dropBoxSuccess);
                            }});
                        }
                    break;
                }
            break;
        }
    })
    .on('change','[localStorage]',function(){
        e = {}
        e.e=$(this)
        e.localStorage = e.e.attr('localStorage')
        e.value = e.e.val()
        $.ccio.op(e.localStorage,e.value)
    })
    .on('click','[system]',function(){
        var e = {};
        var el = $(this)
        switch(el.attr('system')){
            case'monitorMuteAudioSingle':
                var monitorId = el.attr('mid')
                var masterMute = $.ccio.op().switches.monitorMuteAudio
                var monitorMutes = $.ccio.op().monitorMutes || {}
                monitorMutes[monitorId] = monitorMutes[monitorId] === 1 ? 0 : 1
                $.ccio.op('monitorMutes',monitorMutes)
                var vidEl = $('.monitor_item[mid="' + monitorId + '"] video')[0]
                if(monitorMutes[monitorId] === 1){
                    vidEl.muted = true
                }else{
                    if(masterMute !== 1){
                        if($.ccio.windowFocus && hadFocus){
                            vidEl.muted = false
                        }else{
                            console.error('User must have window active to unmute.')
                        }
                    }
                }
                var volumeIcon = monitorMutes[monitorId] !== 1 ? 'volume-up' : 'volume-off'
                $(this).find('i').removeClass('fa-volume-up fa-volume-off').addClass('fa-' + volumeIcon)
            break;
            case'switch':
                var systemSwitch = el.attr('switch');
                var theSwitches = $.ccio.op().switches
                if(!theSwitches){
                    theSwitches={}
                }
                if(!theSwitches[systemSwitch]){
                    theSwitches[systemSwitch]=0
                }
                if(theSwitches[systemSwitch]===1){
                    theSwitches[systemSwitch]=0
                }else{
                    theSwitches[systemSwitch]=1
                }
                $.ccio.op('switches',theSwitches)
                switch(systemSwitch){
                    case'monitorOrder':
                        if(theSwitches[systemSwitch] !== 1){
                            $('.monitor_item').attr('data-gs-auto-position','yes')
                        }else{
                            $('.monitor_item').attr('data-gs-auto-position','no')
                        }
                    break;
                    case'monitorMuteAudio':
                        var monitorMutes = $.ccio.op().monitorMutes || {}
                        $('.monitor_item video').each(function(n,vidEl){
                            var monitorId = $(this).parents('[mid]').attr('mid')
                            if(theSwitches[systemSwitch] === 1){
                                vidEl.muted = true
                            }else{
                                if(monitorMutes[monitorId] !== 1){
                                    vidEl.muted = false
                                }
                            }
                        })
                    break;
                }
                switch(el.attr('type')){
                    case'text':
                        if(theSwitches[systemSwitch]===1){
                            el.addClass('text-success')
                        }else{
                            el.removeClass('text-success')
                        }
                    break;
                }
            break;
            case'cronStop':
                $.ccio.cx({f:'cron',ff:'stop'})
            break;
            case'cronRestart':
                $.ccio.cx({f:'cron',ff:'restart'})
            break;
            case'jpegToggle':
                e.cx={f:'monitor',ff:'jpeg_on'};
                if($.ccio.op().jpeg_on===true){
                    e.cx.ff='jpeg_off';
                }
                $.ccio.cx(e.cx)
            break;
        }
    })
    .on('click','[class_toggle]',function(e){
        e.e=$(this);
        e.n=e.e.attr('data-target');
        e.v=e.e.attr('class_toggle');
        e.o=$.ccio.op().class_toggle;
        if($(e.n).hasClass(e.v)){e.t=0}else{e.t=1}
        if(!e.o)e.o={};
        e.o[e.n]=[e.v,e.t];
        $.ccio.op('class_toggle',e.o)
        $(e.n).toggleClass(e.v);
    })
    .on('change','[dropdown_toggle]',function(e){
        e.e=$(this);
        e.n=e.e.attr('dropdown_toggle');
        e.v=e.e.val();
        e.o=$.ccio.op().dropdown_toggle;
        if(!e.o)e.o={};
        e.o[e.n]=e.v;
        $.ccio.op('dropdown_toggle',e.o)
    })
    //monitor functions
    .on('click','[monitor]',function(){
      var e={};
        e.e=$(this),
            e.a=e.e.attr('monitor'),//the function
            e.p=e.e.parents('[mid]'),//the parent element for monitor item
            e.ke=e.p.attr('ke'),//group key
            e.mid=e.p.attr('mid'),//monitor id
            e.auth=e.p.attr('auth'),//authkey
            e.mon=$.ccio.mon[e.ke+e.mid+e.auth];//monitor configuration
            var user
            if($.users[e.auth]){user=$.users[e.auth]}else{user=$user}
            if(!user){
                user=$user
            }
        switch(e.a){
            case'zoomStreamWithMouse':
                var streamWindow = $('.monitor_item[mid="'+e.mid+'"][ke="'+e.ke+'"][auth="'+e.auth+'"]')
                if(e.mon.magnifyStreamEnabled){
                    e.mon.magnifyStreamEnabled = false
                    streamWindow
                        .off('mousemove')
                        .off('touchmove')
                        .find('.zoomGlass').remove()
                }else{
                    e.mon.magnifyStreamEnabled = true
                    const magnifyStream = function(e){
                        $.ccio.magnifyStream({
                            p: streamWindow,
                            zoomAmount: 1,
                            auto: false,
                            animate: false,
                            pageX: e.pageX,
                            pageY:  e.pageY,
                            attribute: 'monitor="zoomStreamWithMouse"'
                        },user)
                    }
                    streamWindow
                        .on('mousemove', magnifyStream)
                        .on('touchmove', magnifyStream)
                }
            break;
            case'show_data':
                e.p.toggleClass('show_data')
                var dataBlocks = e.p.find('.stream-block,.mdl-data_window')
                if(e.p.hasClass('show_data')){
                    dataBlocks.addClass('col-md-6').removeClass('col-md-12')
                }else{
                    dataBlocks.addClass('col-md-12').removeClass('col-md-6')
                }
            break;
            case'motion':
                if(!e.mon.motionDetectionRunning){
                    $.ccio.init('streamMotionDetectOn',e,user)
                }else{
                    $.ccio.init('streamMotionDetectOff',e,user)
                }
            break;
            case'pop':
                popOutMonitor(e.mid)
            break;
            case'mode':
                e.mode=e.e.attr('mode')
                if(e.mode){
                    $.getJSON(getApiPrefix() + '/monitor/'+e.ke+'/'+e.mid+'/'+e.mode,function(d){
                        $.ccio.log(d)
                    })
                }
            break;
            case'trigger-event':
                $.getJSON(getApiPrefix() + '/motion/'+e.ke+'/'+e.mid+'/?data={"plug":"manual_trigger","name":"Manual Trigger","reason":"Manual","confidence":100}',function(d){
                    $.ccio.log(d)
                })
            break;
            case'timelapseJpeg':
                var monitorId = createMonitorsList($.timelapseJpeg.monitorsList)
                $.timelapseJpeg.openWindow(monitorId)
            break;
            case'region':
                if(!e.mon){
                    $.ccio.init('note',{title:lang['Unable to Launch'],text:lang.UnabletoLaunchText,type:'error'});
                    return;
                }
                e.d=JSON.parse(e.mon.details);
                $.loadRegionEditor(e.d)
            break;
            case'snapshot':
                $.ccio.snapshot(e,function(url){
                    $('#temp').html('<a href="'+url+'" download="'+$.ccio.init('tf')+'_'+e.ke+'_'+e.mid+'.jpg">a</a>').find('a')[0].click();
                });
            break;
            case'control':
                var switchChosen = e.e.attr('control')
                switch(switchChosen){
                    case'setHome':
                        $.get(getApiPrefix() + '/control' + '/' + $user.ke + '/' + e.mid + '/setHome',function(data){
                            console.log(data)
                        })
                    break;
                    default:
                        $.ccio.cx({
                            f: 'monitor',
                            ff: 'control',
                            direction: switchChosen,
                            id: e.mid,
                            ke: e.ke
                        },user)
                    break;
                }
            break;
            case'videos_table':case'calendar':case'video_grid'://call videos table or calendar or video grid
                $.vidview.launcher=$(this);
                e.limit=$.vidview.limit.val();
                if(!$.vidview.current_mid||$.vidview.current_mid!==e.mid){
                    $.vidview.current_mid=e.mid
                    $.vidview.current_page=1;
                    if(e.limit.replace(/ /g,'')===''){
                        e.limit='100';
                    }
                    if(e.limit.indexOf(',')===-1){
                        e.limit='0,'+e.limit
                    }else{
                        e.limit='0,'+e.limit.split(',')[1]
                    }
                    if(e.limit=='0,0'){
                        e.limit='0'
                    }
                    $.vidview.limit.val(e.limit)
                }
                e.dateRange=$('#videos_viewer_daterange').data('daterangepicker');
                var videoSet = 'videos'
                switch($.vidview.set.val()){
                    case'cloud':
                        videoSet = 'cloudVideos'
                    break;
                }
                e.videoURL=getApiPrefix() + '/'+videoSet+'/'+e.ke+'/'+e.mid+'?limit='+e.limit+'&start='+e.dateRange.startDate.clone().utc().format('YYYY-MM-DDTHH:mm:ss')+'&end='+e.dateRange.endDate.clone().utc().format('YYYY-MM-DDTHH:mm:ss');
                $.getJSON(e.videoURL,function(d){
                    d.pages=d.total/100;
                    $('.video_viewer_total').text(d.total)
                    if(d.pages+''.indexOf('.')>-1){++d.pages}
                    $.vidview.page_count=d.pages;
                    d.count=1
                    $.vidview.pages.empty()
                    d.fn=function(drawOne){
                        if(d.count<=$.vidview.page_count){
                            $.vidview.pages.append('<a class="btn btn-primary" page="'+d.count+'">'+d.count+'</a> ')
                            ++d.count;
                            d.fn()
                        }
                    }
                    d.fn()
                    $.vidview.pages.find('[page="'+$.vidview.current_page+'"]').addClass('active')
                    e.v=$.vidview.e;
                    $.vidview.loadedVideos = {}
                    e.b=e.v.modal('show').find('.modal-body .contents');
                    e.t=e.v.find('.modal-title i');
                    switch(e.a){
                        case'calendar':
                           $.vidview.e.removeClass('dark')
                           e.t.attr('class','fa fa-calendar')
                           e.ar=[];
                            if(d.videos[0]){
                                $.each(d.videos,function(n,v){
                                    if(v.status !== 0){
                                        $.vidview.loadedVideos[v.filename] = Object.assign(v,{})
                                        var n=$.ccio.mon[v.ke+v.mid+user.auth_token];
                                        if(n){v.title=n.name+' - '+(parseInt(v.size)/1048576).toFixed(2)+'mb';}
                                        v.start = moment.utc(v.time).local()
                                        v.end = moment.utc(v.end).local()
    //                                    v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                                        e.ar.push(v)
                                    }
                                })
                                e.b.html('')
                                try{e.b.fullCalendar('destroy')}catch(er){}
                                e.b.fullCalendar({
                                    header: {
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'month,agendaWeek,agendaDay,listWeek'
                                    },
                                    defaultDate: $.ccio.timeObject(d.videos[0].time).format('YYYY-MM-DD'),
                                    locale: user.details.lang.substring(0, 2),
                                    navLinks: true,
                                    eventLimit: true,
                                    events:e.ar,
                                    eventClick:function(f){
                                        $('#temp').html('<div mid="'+f.mid+'" ke="'+f.ke+'" auth="'+user.auth_token+'" file="'+f.filename+'"><div video="launch" href="'+$.ccio.init('videoUrlBuild',f)+'"></div></div>').find('[video="launch"]').click();
                                        $(this).css('border-color', 'red');
                                    }
                                });
                                setTimeout(function(){e.b.fullCalendar('changeView','month');e.b.find('.fc-scroller').css('height','auto')},500)
                            }else{
                                e.b.html('<div class="text-center">'+lang.NoVideosFoundForDateRange+'</div>')
                            }
                        break;
                        case'video_grid':
                            $.vidview.e.addClass('dark')
                            var tmp = '<di class="video_grid row">';
                            $.each(d.videos,function(n,v){
                                var href = $.ccio.init('videoUrlBuild',v)
                                v.mon = $.ccio.mon[v.ke+v.mid+user.auth_token]
                                var parentTag = 'ke="'+v.ke+'" status="'+v.status+'" mid="'+v.mid+'" file="'+v.filename+'" auth="'+v.mon.user.auth_token+'"'
                                tmp += '<div class="col-md-2" '+parentTag+'>'
                                    tmp += '<div class="thumb">'
                                        tmp += '<div class="title-strip">'+$.ccio.timeObject(v.time).format('h:mm:ss A, MMMM Do YYYY')+'</div>'
                                        tmp += '<div class="button-strip">'
                                            tmp += '<div class="btn-group">'
                                                tmp += '<a class="btn btn-xs btn-primary" video="launch" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a>'
                                                tmp += '<a class="btn btn-xs btn-default preview" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a>'
                                                tmp += '<a class="btn btn-xs btn-default" download="'+v.mid+'-'+v.filename+'" href="'+href+'">&nbsp;<i class="fa fa-download"></i>&nbsp;</a>'
                                            tmp += '</div>'
                                        tmp += '</div>'
                                    tmp += '</div>'
                                tmp += '</div>'
                            })
                            tmp += '</div>'
                            e.b.html(tmp)
                            var i = 0
                            var getThumbnail = function(){
                                var v = d.videos[i]
                                if(v){
                                    tool.getVideoImage($.ccio.init('videoUrlBuild',v),0,function(err,base64){
                                        if(base64){
                                            $('[ke="'+v.ke+'"][mid="'+v.mid+'"][file="'+v.filename+'"] .thumb').css('background-image','url('+base64+')')
                                        }
                                        ++i
                                        getThumbnail()
                                    })
                                }
                            }
                            getThumbnail()
                        break;
                        case'videos_table':
                            var showThumbnail = $.ccio.op().showThumbnail === '1'
                            $.vidview.e.removeClass('dark')
                            e.t.attr('class','fa fa-film')
                            var tmp = '<table class="table table-striped table-bordered">';
                            tmp+='<thead>';
                            tmp+='<tr>';
                            tmp+='<th><div class="checkbox"><input id="videos_select_all" type="checkbox"><label for="videos_select_all"></label></div></th>';
                            if(showThumbnail)tmp+='<th>'+lang.Thumbnail+'</th>';
                            tmp+='<th class="table-header-sorter" data-field="Closed">'+lang.Closed+'<i class="fa fa-sort"></i></th>';
                            tmp+='<th class="table-header-sorter" data-field="Ended">'+lang.Ended+'<i class="fa fa-sort"></i></th>';
                            tmp+='<th class="table-header-sorter" data-field="Started">'+lang.Started+'<i class="fa fa-sort"></i></th>';
                            tmp+='<th class="table-header-sorter" data-field="Monitor">'+lang.Monitor+'<i class="fa fa-sort"></i></th>';
                            tmp+='<th class="table-header-sorter" data-field="Filename">'+lang.Filename+'<i class="fa fa-sort"></i></th>';
                            tmp+='<th class="table-header-sorter" data-field="Size">'+lang['Size (mb)']+'<i class="fa fa-sort"></i></th>';
                            tmp+='<th>'+lang.Preview+'</th>';
                            tmp+='<th>'+lang.Watch+'</th>';
                            tmp+='<th>'+lang.Download+'</th>';
                            tmp+='<th class="permission_video_delete">'+lang.Delete+'</th>';
    //                        tmp+='<th class="permission_video_delete" data-field="Fix" data-sortable="true">'+lang.Fix+'</th>';
                            tmp+='</tr>';
                            tmp+='</thead>';
                            tmp+='<tbody>';
                            $.each(d.videos,function(n,v){
                                if(v.status!==0){
                                    $.vidview.loadedVideos[v.filename] = Object.assign(v,{})
                                    var href = $.ccio.init('videoUrlBuild',v)
                                    v.mon=$.ccio.mon[v.ke+v.mid+user.auth_token];
                                    v.start=v.time;
    //                                v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                                    const sortData = {
                                        _no: n,
                                        Closed: $.ccio.timeObject(v.end).unix(),
                                        Ended: $.ccio.timeObject(v.end).unix(),
                                        Started: $.ccio.timeObject(v.time).unix(),
                                        Monitor: v.mon.name,
                                        Filename: v.filename,
                                        Size: v.size,
                                    };
                                    tmp+='<tr data-sort="' + JSON.stringify(sortData).replace(/"/g, "&#34;") + '" data-ke="'+v.ke+'" data-status="'+v.status+'" data-mid="'+v.mid+'" data-file="'+v.filename+'" data-auth="'+v.mon.user.auth_token+'">';
                                    tmp+='<td><div class="checkbox"><input id="'+v.ke+'_'+v.filename+'" name="'+v.filename+'" value="'+v.mid+'" type="checkbox"><label for="'+v.ke+'_'+v.filename+'"></label></div></td>';
                                    if(showThumbnail)tmp+='<td class="text-center"><img class="thumbnail"></td>';
                                    tmp+='<td>'+$.ccio.timeObject(v.end).fromNow()+'</td>';
                                    tmp+='<td title="'+v.end+'">'+$.ccio.timeObject(v.end).format('h:mm:ss A, MMMM Do YYYY')+'</td>';
                                    tmp+='<td title="'+v.time+'">'+$.ccio.timeObject(v.time).format('h:mm:ss A, MMMM Do YYYY')+'</td>';
                                    tmp+='<td>'+v.mon.name+'</td>';
                                    tmp+='<td>'+v.filename+'</td>';
                                    tmp+='<td>'+(parseInt(v.size)/1048576).toFixed(2)+'</td>';
                                    tmp+='<td><a class="btn btn-sm btn-default preview" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a></td>';
                                    tmp+='<td><a class="btn btn-sm btn-primary" video="launch" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a></td>';
                                    tmp+='<td><a class="btn btn-sm btn-success" download="'+v.mid+'-'+v.filename+'" href="'+href+'">&nbsp;<i class="fa fa-download"></i>&nbsp;</a></td>';
                                    tmp+='<td class="permission_video_delete"><a class="btn btn-sm btn-danger" video="delete" href="'+$.ccio.init('videoHrefToDelete',href)+'">&nbsp;<i class="fa fa-trash"></i>&nbsp;</a></td>';
    //                                tmp+='<td class="permission_video_delete"><a class="btn btn-sm btn-warning" video="fix">&nbsp;<i class="fa fa-wrench"></i>&nbsp;</a></td>';
                                    tmp+='</tr>';
                                }
                            })
                            tmp+='</tbody>';
                            tmp+='</table>';
                            e.b.html(tmp)
                            e.b.css({
                                overflow: 'auto',
                                height: '100%',
                            }).scrollTop(0);
                            if(showThumbnail){
                                var i = 0
                                var getThumbnail = function(){
                                    var v = d.videos[i]
                                    if(v){
                                        tool.getVideoImage($.ccio.init('videoUrlBuild',v),0,function(err,base64){
                                            if(base64){
                                                $('[data-ke="'+v.ke+'"][data-mid="'+v.mid+'"][data-file="'+v.filename+'"] .thumbnail')[0].src = base64
                                            }
                                            ++i
                                            getThumbnail()
                                        })
                                    }
                                }
                                getThumbnail()
                            }
                        break;
                    }
                })
            break;
            case'fullscreen':
                e.e=e.e.parents('.monitor_item');
                e.e.addClass('fullscreen')
                e.vid=e.e.find('.stream-element')
                if(e.vid.is('canvas')){
                    e.doc=$('body')
                   e.vid.attr('height',e.doc.height())
                   e.vid.attr('width',e.doc.width())
                }
                $.ccio.init('fullscreen',e.vid[0])
            break;
            case'watch_on':
                $.ccio.cx({f:'monitor',ff:'watch_on',id:e.mid},user)
            break;
            case'control_toggle':
                e.e=e.p.find('.PTZ_controls');
                if(e.e.length>0){
                    e.e.remove()
                }else{
                    var html = `<div class="PTZ_controls">
                        <div class="pad">
                            <div class="control top" monitor="control" control="up"></div>
                            <div class="control left" monitor="control" control="left"></div>
                            <div class="control right" monitor="control" control="right"></div>
                            <div class="control bottom" monitor="control" control="down"></div>
                            <div class="control middle" monitor="control" control="center"></div>
                        </div>
                        <div class="btn-group btn-group-sm btn-group-justified">
                            <a title="${lang['Zoom In']}" class="zoom_in btn btn-default" monitor="control" control="zoom_in"><i class="fa fa-search-plus"></i></a>
                            <a title="${lang['Zoom Out']}" class="zoom_out btn btn-default" monitor="control" control="zoom_out"><i class="fa fa-search-minus"></i></a>
                        </div>
                        <div class="btn-group btn-group-sm btn-group-justified">
                            <a title="${lang['Enable Nightvision']}" class="nv_enable btn btn-default" monitor="control" control="enable_nv"><i class="fa fa-moon-o"></i></a>
                            <a title="${lang['Disable Nightvision']}" class="nv_disable btn btn-default" monitor="control" control="disable_nv"><i class="fa fa-sun-o"></i></a>
                        </div>
                        ${$.parseJSON($.ccio.mon[$user.ke + e.mid + $user.auth_token].details,{}).is_onvif === '1' ? `
                        <div class="btn-group btn-group-sm btn-group-justified">
                            <a title="${lang['Set Home Position (ONVIF-only)']}" class="btn btn-default" monitor="control" control="setHome"><i class="fa fa-h-square"></i> ${lang['Set Home']}</a>
                        </div>` : ``}
                    </div>`
                    e.p.append(html)
                }
            break;
            case'watch':
                if($("#monitor_live_"+e.mid+user.auth_token).length===0||$.ccio.mon[e.ke+e.mid+user.auth_token].watch!==1){
                    $.ccio.cx({f:'monitor',ff:'watch_on',id:e.mid},user)
                }else{
                    $("#main_canvas").animate({scrollTop:$("#monitor_live_"+e.mid+user.auth_token).position().top},500);
                }
            break;
            case'watch_off':
                $.ccio.cx({f:'monitor',ff:'watch_off',id:e.mid},user)
            break;
            case'delete':
                e.m=$('#confirm_window').modal('show');e.f=e.e.attr('file');
                $.confirm.title.text(lang['Delete Monitor']+' : '+e.mon.name)
                e.html=lang.DeleteMonitorText
                e.html+='<table class="info-table table table-striped"><tr>';
                $.each($.ccio.init('cleanMon',e.mon),function(n,v,g){
                    if(n==='host'&&v.indexOf('@')>-1){g=v.split('@')[1]}else{g=v};
                    try{JSON.parse(g);return}catch(err){}
                    e.html+='<tr><td><b>'+n+'</b></td><td style="word-break:break-all">'+g+'</td></tr>';
                })
                e.html+='</tr></table>';
                $.confirm.body.html(e.html)
                $.confirm.click([
                    {
                        title:'Delete Monitor',
                        class:'btn-danger',
                        callback:function(){
                            $.get(getApiPrefix() + '/configureMonitor/'+user.ke+'/'+e.mon.mid+'/delete',function(d){
                                $.ccio.log(d)
                            })
                        }
                    },
                    {
                        title:'Delete Monitor and Files',
                        class:'btn-danger',
                        callback:function(){
                            $.get(getApiPrefix() + '/configureMonitor/'+user.ke+'/'+e.mon.mid+'/delete?deleteFiles=true',function(d){
                                $.ccio.log(d)
                            })
                        }
                    }
                ])
            break;
            case'edit':
                e.p=$('#add_monitor'),e.mt=e.p.find('.modal-title')
                e.p.find('.am_notice').hide()
                e.p.find('[detailcontainer="detector_cascades"]').prop('checked',false).parents('.mdl-js-switch').removeClass('is-checked')
                if(!$.ccio.mon[e.ke+e.mid+user.auth_token]){
                    e.p.find('.am_notice_new').show()
                    //new monitor
                    e.p.find('[monitor="delete"]').hide()
                    e.mt.find('span').text('Add'),e.mt.find('i').attr('class','fa fa-plus');
                    //default values
                    e.values=$.aM.generateDefaultMonitorSettings();
                }else{
                    e.p.find('.am_notice_edit').show()
                    //edit monitor
                    e.p.find('[monitor="delete"]').show()
                    e.mt.find('span').text(lang.Edit);
                    e.mt.find('i').attr('class','fa fa-wrench');
                    e.values=$.ccio.mon[e.ke+e.mid+user.auth_token];
                }
                $.aM.selected=e.values;
    //            e.openTabs=$.ccio.op().tabsOpen
    //            if(e.openTabs[e.mid]){
    //                e.values=e.openTabs[e.mid]
    //            }
                $.aM.import(e)
                $('#add_monitor').modal('show')
            break;
        }
    })
    .on('dblclick','[type="password"],.password_field',function(){
        var _this = $(this)
        var type = 'password'
        _this.addClass('password_field')
        if(_this.attr('type') === 'password'){
            type = 'text'
        }
        _this.attr('type',type)
    })

    $('.modal').on('hidden.bs.modal',function(){
        var el = $(this)
        el.find('video').remove();
        el.find('iframe').attr('src','about:blank');
        if(el.attr('id') === 'video_viewer')destroyGpsHandlerForVideoFile(`video_viewer_gps_map_map`)
    });
    $('.modal').on('shown.bs.modal',function(){
        e={e:$(this).find('.flex-container-modal-body')}
        if(e.e.length>0){
            e.e.resize()
        }
    });
    $('body').find('.monitor-section-header').click(function(e){
        var parent = $(this).parent('.form-group-group')
        var boxWrapper = parent.attr('id')
        parent.toggleClass('hide-box-wrapper')
        var hideBoxWrapper = parent.hasClass('hide-box-wrapper')
        boxWrappersHidden[boxWrapper] = hideBoxWrapper
        $.ccio.op('boxWrappersHidden',boxWrappersHidden)
    });
    var boxWrappersHidden = $.ccio.op().boxWrappersHidden || {}
    $.each(boxWrappersHidden,function(boxId,hide){
        if(hide){
            $(`#${boxId}`).addClass('hide-box-wrapper')
        }
    })
    $('body')
    .on('click','.scrollTo',function(ee){
        ee.preventDefault()
        var e = {e:$(this)};
        e.parent=e.e.attr('scrollToParent')
        if(!e.parent){
            e.parent='body,html'
        }
        $(e.parent).animate({
            scrollTop: $(e.e.attr('href')).position().top
        }, 400);
    })
    .on('resize','.flex-container-modal-body',function(e){
        e=$(this)
        e.find('.flex-modal-block').css('height',e.height())
    })
    .on('resize','#monitors_live .monitor_item',function(e){
        e.e=$(this).find('.stream-block');
        e.c=e.e.find('canvas');
        e.c.attr('height',e.e.height());
        e.c.attr('width',e.e.width());
    })
    .on('keyup','.search-parent .search-controller',function(){
        _this = this;
        $.each($(".search-parent .search-body .search-row"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();
        });
    })
    .on('dblclick','.stream-hud',function(){
        $(this).parents('[mid]').find('[monitor="fullscreen"]').click();
    })
})
