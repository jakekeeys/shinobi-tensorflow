$(document).ready(function(e){
//POWER videos window
$.pwrvid={e:$('#powerVideo')};
$.pwrvid.f=$.pwrvid.e.find('form'),
$.pwrvid.d=$('#old_vis_pwrvideo'),
$.pwrvid.mL=$('#old_motion_list'),
$.pwrvid.m=$('#old_vis_monitors'),
$.pwrvid.lv=$('#old_live_view'),
$.pwrvid.dr=$('#old_pvideo_daterange'),
$.pwrvid.vp=$('#old_video_preview'),
$.pwrvid.seekBar=$('#old_pwrvid_seekBar'),
$.pwrvid.seekBarProgress=$.pwrvid.seekBar.find('.progress-bar'),
$.pwrvid.playRate = 1;
$.pwrvid.dr.daterangepicker({
    startDate:$.ccio.timeObject().subtract(moment.duration("24:00:00")),
    endDate:$.ccio.timeObject().add(moment.duration("24:00:00")),
    timePicker: true,
    timePicker24Hour: true,
    timePickerSeconds: true,
    timePickerIncrement: 30,
    locale: {
        format: 'MM/DD/YYYY h:mm A'
    }
},function(start, end, label){
    $.pwrvid.drawTimeline()
    $.pwrvid.dr.focus()
});
$('#old_pvideo_show_events').change(function(){
    $.pwrvid.drawTimeline()
})
$.pwrvid.e.on('click','[preview]',function(e){
    e.e=$(this);
    e.video=$.pwrvid.vp.find('video')[0];
    if(e.video){
        e.duration=e.video.duration;
        e.now=e.video.currentTime;
    }
    if($.pwrvid.video){
        clearInterval($.pwrvid.video.interval);
    }
    switch(e.e.attr('preview')){
        case'fullscreen':
            $.ccio.init('fullscreen',e.video)
        break;
        case'mute':
            e.video.muted = !e.video.muted
            e.e.find('i').toggleClass('fa-volume-off fa-volume-up')
            e.e.toggleClass('btn-danger')
        break;
        case'play':
            e.video.playbackRate = 1;
            $.pwrvid.vpOnPlayPause(1)
        break;
        case'stepFrontFront':
            e.add=e.e.attr('add')
            e.stepFrontFront=parseInt(e.e.attr('stepFrontFront'))
            if(!e.stepFrontFront||isNaN(e.stepFrontFront)){e.stepFrontFront = 5}
            if(e.add==="0"){
                $.pwrvid.playRate = e.stepFrontFront
            }else{
                $.pwrvid.playRate += e.stepFrontFront
            }
            e.video.playbackRate = $.pwrvid.playRate;
            e.video.play()
        break;
        case'stepFront':
            e.video.currentTime += 1;
            e.video.pause()
        break;
        case'stepBackBack':
           $.pwrvid.video.interval = setInterval(function(){
               e.video.playbackRate = 1.0;
               if(e.video.currentTime == 0){
                   clearInterval($.pwrvid.video.interval);
                   e.video.pause();
               }
               else{
                   e.video.currentTime += -.2;
               }
           },30);
        break;
        case'stepBack':
            e.video.currentTime += -1;
            e.video.pause()
        break;
        case'video':
//            e.preventDefault();
            e.p=e.e.parents('[mid]');
            e.filename=e.p.attr('file');
            $.pwrvid.vp.find('h3').text(e.filename)
            e.href=e.e.attr('href');
            e.status=e.p.attr('status');
            e.mon=$.ccio.mon[e.p.attr('ke')+e.p.attr('mid')+$user.auth_token];
            $.pwrvid.vp.find('.holder').html('<video class="video_video" video="'+e.href+'"><source src="'+e.href+'" type="video/'+e.mon.ext+'"></video>');
            $.pwrvid.vp
                .attr('mid',e.mon.mid)
                .attr('mid',e.mon.user.auth_token)
                .attr('ke',e.mon.ke)
                .attr('status',e.status)
                .attr('file',e.filename)
                .find('[download],[video="download"]')
                .attr('download',e.filename)
                .attr('href',e.href)
                $.pwrvid.vp.find('video').off('loadeddata').on('loadeddata',function(){
                    $.pwrvid.vp.find('.stream-objects .stream-detected-object').remove()
                })
            if(e.status==1){
                $.get($.ccio.init('videoHrefToRead',e.href),function(d){

                })
            }
            var labels=[]
            var Dataset1=[]
            var events=$.pwrvid.currentDataObject[e.filename].motion
            var eventsLabeledByTime={}
            $.each(events,function(n,v){
                if(!v.details.confidence){v.details.confidence=0}
                var time=$.ccio.timeObject(v.time).format('MM/DD/YYYY HH:mm:ss')
                labels.push(time)
                Dataset1.push(v.details.confidence)
                eventsLabeledByTime[time]=v;
            })
            if(events.length>0){
                $.pwrvid.mL.html("<canvas></canvas>")
                var timeFormat = 'MM/DD/YYYY HH:mm:ss';
                var color = Chart.helpers.color;
                Chart.defaults.global.defaultFontColor = '#fff';
                var config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            type: 'line',
                            label: 'Motion Confidence',
                            backgroundColor: color(window.chartColors.red).alpha(0.2).rgbString(),
                            borderColor: window.chartColors.red,
                            data: Dataset1,
                        }]
                    },
                    options: {
                        maintainAspectRatio: false,
                        title: {
                            fontColor: "white",
                            text:"Events in this video"
                        },
                        scales: {
                            xAxes: [{
                                type: "time",
                                display: true,
                                time: {
                                    format: timeFormat,
                                    // round: 'day'
                                }
                            }],
                        },
                    }
                };
                var ctx = $.pwrvid.mL.find('canvas')[0].getContext("2d");
                $.pwrvid.miniChart = new Chart(ctx, config);
                $.pwrvid.mL.find('canvas').click(function(f) {
                    var target = $.pwrvid.miniChart.getElementsAtEvent(f)[0];
                    if(!target){return false}
                    var video = $.pwrvid.currentDataObject[e.filename];
                    var event = video.motion[target._index];
                    var video1 = $('#old_video_preview video')[0];
                    video1.currentTime=$.ccio.timeObject(event.time).diff($.ccio.timeObject(video.row.time),'seconds')
                    video1.play()
                });
                var colorNames = Object.keys(window.chartColors);

            }else{
                $.pwrvid.mL.html('<div class="super-center text-center" style="width:auto">'+lang['No Events found for this video']+'</div>')
            }
            $.pwrvid.video={filename:e.filename,href:e.href,mid:e.mon.mid,ke:e.mon.ke}
            $.pwrvid.vpOnPlayPause=function(x,e){
              var e={}
                e.video=$.pwrvid.vp.find('video')[0]
                e.i=$.pwrvid.vp.find('[preview="play"]').find('i')
                if(e.video.paused===true){
                    e.i.removeClass('fa-pause').addClass('fa-play')
                    if(x==1)e.video.play();
                }else{
                    e.i.removeClass('fa-play').addClass('fa-pause')
                    if(x==1)e.video.pause();
                }
            }
            var videoElement=$.pwrvid.vp.find('video')[0]
            $.pwrvid.vp.find('video')
                .off('loadeddata').on('loadeddata', function() {
                    this.playbackRate = $.pwrvid.playRate;
                    this.play()
                })
                .off("pause").on("pause",$.pwrvid.vpOnPlayPause)
                .off("play").on("play",$.pwrvid.vpOnPlayPause)
                .off("timeupdate").on("timeupdate",function(){
                    var video = $.pwrvid.currentDataObject[e.filename];
                    var videoTime=$.ccio.timeObject(video.row.time).add(parseInt(videoElement.currentTime),'seconds').format('MM/DD/YYYY HH:mm:ss');
                    var event = eventsLabeledByTime[videoTime];
                    if(event){
                        if(event.details.plates){
                            console.log('licensePlateVideo',event)
                        }
                        if(event.details.matrices){
                            event.monitorDetails=JSON.parse(e.mon.details)
                            event.stream=$(videoElement)
                            event.streamObjects=$.pwrvid.vp.find('.stream-objects')
                            $.ccio.init('drawMatrices',event)
                        }
                        if(event.details.confidence){
                            $.pwrvid.vp.find('.motion-meter .progress-bar').css('width',event.details.confidence+'px').find('span').text(event.details.confidence)
                        }
                    }
                    var value= (( videoElement.currentTime / videoElement.duration ) * 100)+"%"
                    $.pwrvid.seekBarProgress.css("width",value);
                })
                $.pwrvid.seekBar.off("click").on("click", function(seek){
                    var offset = $(this).offset();
                    var left = (seek.pageX - offset.left);
                    var totalWidth = $.pwrvid.seekBar.width();
                    var percentage = ( left / totalWidth );
                    var vidTime = videoElement.duration * percentage;
                    videoElement.currentTime = vidTime;
                });
        break;
    }
})
$.pwrvid.drawTimeline=function(getData){
    var e={};
    $.pwrvid.e.find('.nodata').hide()
    if(getData===undefined){getData=true}
    var mid=$.pwrvid.m.val();
    $.pwrvid.e.find('.loading').show()
    e.live_header=$.pwrvid.lv.find('h3 span');
    e.live=$.pwrvid.lv.find('iframe');
    e.dateRange=$.pwrvid.dr.data('daterangepicker');
    e.videoLimit = $('#old_pvideo_video_limit').val();
    e.eventLimit = $('#old_pvideo_event_limit').val();
    if(e.eventLimit===''||isNaN(e.eventLimit)){e.eventLimit=500}
    if(e.videoLimit===''||isNaN(e.videoLimit)){e.videoLimit=0}

    var getTheData = function(){
        e.live_header.text($.ccio.mon[$user.ke+mid+$user.auth_token].name)
        e.live.attr('src',$.ccio.init('location',$user)+$user.auth_token+'/embed/'+$user.ke+'/'+mid+'/fullscreen|jquery|relative|gui')

        var pulseLoading = function(){
            var loading = $.pwrvid.e.find('.loading')
            var currentColor = loading.css('color')
            loading.animate('color','red')
            setTimeout(function(){
                loading.css('color',currentColor)
            },500)
        }
        if(getData===true){
            $.ccio.cx({
                f:'monitor',
                ff:'get',
                fff:'videos&events',
                videoLimit:e.videoLimit,
                eventLimit:e.eventLimit,
                startDate:$.ccio.init('th',e.dateRange.startDate),
                endDate:$.ccio.init('th',e.dateRange.endDate),
                ke:e.ke,
                mid:mid
            });
        }else{
            $.pwrvid.e.find('.loading').hide()
            e.next($.pwrvid.currentVideos,$.pwrvid.currentEvents)
        }
    }
    if(parseInt(e.eventLimit) >= 1000){
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Warning']+'!')
        e.html=lang.powerVideoEventLimit
        $.confirm.body.html(e.html)
        $.confirm.click({title:lang.Request,class:'btn-primary'},function(){
            getTheData()
        });
    }else{
        getTheData()
    }
}
$('#old_vis_monitors,#old_pvideo_event_limit,#pvideo_video_limit').change(function(){
    $.pwrvid.f.submit()
})
$.pwrvid.f.submit(function(e){
    e.preventDefault();
    $.pwrvid.drawTimeline()
    return false;
})
$.pwrvid.e.on('hidden.bs.modal',function(e){
    $(this).find('iframe').attr('src','about:blank')
    $.pwrvid.vp.find('.holder').empty()
    delete($.pwrvid.currentDataObject)
    delete($.pwrvid.currentData)
    $.pwrvid.mL.empty()
    $.pwrvid.d.empty()
})
$.pwrvid.e.on('shown.bs.modal',function(e){
    console.log('POV')
    $.pwrvid.m.empty()
    $.each($.ccio.mon,function(n,v){
        $.pwrvid.m.append('<option value="'+v.mid+'">'+v.name+'</option>')
    })
    var options = $.pwrvid.m.find('option').prop('selected',false)
    // if(e.mid !== ''){
    //     options = $.pwrvid.m.find('[value="'+e.mid+'"]')
    // }
    options.first().prop('selected',true)
    $.pwrvid.drawTimeline()
})
$user.ws.on('f',function (d){
    switch(d.f){
        case'videos&events':
            var videos = d.videos;
            var events = d.events;
    //            $.pwrvid.currentlyLoading = false
            $.pwrvid.currentVideos=videos
            $.pwrvid.currentEvents=events
            $.pwrvid.e.find('.loading').hide()
            $.pwrvid.e.find('.nodata').hide()
            //$.pwrvid.drawTimeLine
            if($.pwrvid.t&&$.pwrvid.t.destroy){$.pwrvid.t.destroy()}
            data={};
            $.each(videos.videos,function(n,v){
                if(!v||!v.mid){return}
                v.mon=$.ccio.mon[v.ke+v.mid+$user.auth_token];
    //                v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                if(v.status>0){
        //                    data.push({src:v,x:v.time,y:$.ccio.timeObject(v.time).diff($.ccio.timeObject(v.end),'minutes')/-1})
                    data[v.filename]={
                        filename:v.filename,
                        time:v.time,
                        timeFormatted:$.ccio.timeObject(v.time).format('MM/DD/YYYY HH:mm'),
                        endTime:v.end,
                        close:$.ccio.timeObject(v.time).diff($.ccio.timeObject(v.end),'minutes')/-1,
                        motion:[],
                        row:v,
                        position:n
                    }
                }
            });

            var eventsToCheck = Object.assign({},events)
            $.each(data,function(m,b){
                startTimeFormatted = $.ccio.timeObject(b.time).format('YYYY-MM-DD HH:mm:ss');
                startTime = $.ccio.timeObject(b.time).format();
                endTime = $.ccio.timeObject(b.endTime).format();
                var newSetOfEventsWithoutChecked = {};
                var eventTime
                $.each(eventsToCheck,function(n,v){
                    if(typeof v.time === 'string' && v.time.indexOf('T') > -1){
                        eventTime = v.time.split('T')
                    }else if(typeof v.time === 'number'){
                        eventTime = moment(v.time).format('YYYY-MM-DD HH:mm:ss').split(' ')
                    }else{
                        eventTime = v.time.split(' ')
                    }
                    eventTime[1] = eventTime[1].replace(/-/g,':'),eventTime = eventTime.join(' ');
                    if(eventTime === startTimeFormatted){
                        data[m].motion.push(v)
                    }else if ($.ccio.timeObject(v.time).isBetween(startTime,$.ccio.timeObject(b.endTime).format())) {
                        data[m].motion.push(v)
                    }else{
                        newSetOfEventsWithoutChecked[n] = v;
                    }
                })
                eventsToCheck = newSetOfEventsWithoutChecked;
            });
            $.pwrvid.currentDataObject=data;
            if($.pwrvid.chart){
                $.pwrvid.d.empty()
                delete($.pwrvid.chart)
            }
            $.pwrvid.currentData=Object.values(data);
            if($.pwrvid.currentData.length>0){
                var labels=[]
                var Dataset1=[]
                var Dataset2=[]
                $.each(data,function(n,v){
                    labels.push(v.timeFormatted)
                    Dataset1.push(v.close)
                    Dataset2.push(v.motion.length)
                })
                $.pwrvid.d.html("<canvas></canvas>")
                var timeFormat = 'MM/DD/YYYY HH:mm';
                var color = Chart.helpers.color;
                Chart.defaults.global.defaultFontColor = '#fff';
                var config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            type: 'line',
                            label: lang['Video and Time Span (Minutes)'],
                            backgroundColor: color(window.chartColors.blue).alpha(0.2).rgbString(),
                            borderColor: window.chartColors.blue,
                            data: Dataset1,
                        }, {
                            type: 'bar',
                            showTooltip: false,
                            label: lang['Counts of Motion'],
                            backgroundColor: color(window.chartColors.red).alpha(0.5).rgbString(),
                            borderColor: window.chartColors.red,
                            data:Dataset2,
                        }, ]
                    },
                    options: {
                         maintainAspectRatio: false,
                        title: {
                            fontColor: "white",
                            text: lang['Video Length (minutes) and Motion Count per video']
                        },
                        tooltips: {
                            callbacks: {

                            },
                        },
                        scales: {
                            xAxes: [{
                                type: "time",
                                display: true,
                                time: {
                                    // format: timeFormat,
                                    unit: 'minute',
                                    displayFormats: {
                                        minute: 'h:mm a',
                                    },
                                },
                                categoryPercentage: 0.6,
                                barPercentage: .5,
                            }],
                        },
                    }
                };

                var ctx = $.pwrvid.d.find('canvas')[0].getContext("2d");
                $.pwrvid.chart = new Chart(ctx, config);
                $.pwrvid.d.find('canvas').click(function(e) {
                    var target = $.pwrvid.chart.getElementsAtEvent(e)[0];
                    if(!target){return false}
                    target = $.pwrvid.currentData[target._index];
                    $.pwrvid.e.find('.temp').html('<li class="glM'+target.row.mid+$user.auth_token+'" mid="'+target.row.mid+'" ke="'+target.row.ke+'" status="'+target.row.status+'" file="'+target.row.filename+'" auth="'+$user.auth_token+'"><a class="btn btn-sm btn-primary" preview="video" href="'+target.row.href+'"><i class="fa fa-play-circle"></i></a></li>').find('a').click()
                });
                var colorNames = Object.keys(window.chartColors);
            }else{
                $.pwrvid.e.find('.nodata').show()
            }
        break;
    }
})
})
