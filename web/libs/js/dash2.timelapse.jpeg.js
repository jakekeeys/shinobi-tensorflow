$(document).ready(function(e){
    //Timelapse JPEG Window
    $.timelapseJpeg = {e:$('#timelapsejpeg')}
    $.timelapseJpeg.datepicker = $('#timelapsejpeg_date')
    $.timelapseJpeg.timelapseJpegFps = $('#timelapseJpegFps')
    $.timelapseJpeg.framesContainer = $.timelapseJpeg.e.find('.frames')
    $.timelapseJpeg.frameStrip = $.timelapseJpeg.e.find('.frameStrip')
    $.timelapseJpeg.frameIcons = $.timelapseJpeg.e.find('.frameIcons')
    $.timelapseJpeg.fieldHolder = $.timelapseJpeg.e.find('.fieldHolder')
    $.timelapseJpeg.frameStripPreview = $.timelapseJpeg.e.find('.frameStripPreview')
    $.timelapseJpeg.frameStripContainer = $.timelapseJpeg.e.find('.frameStripContainer')
    $.timelapseJpeg.playBackViewImg = $.timelapseJpeg.e.find('.playBackView img')
    $.timelapseJpeg.liveStreamView = $.timelapseJpeg.e.find('.liveStreamView')
    $.timelapseJpeg.monitors=$.timelapseJpeg.e.find('.monitors_list')
    $.timelapseJpeg.pointer = $.ccio.init('location',$user)
    $.timelapseJpeg.downloadRecheckTimers = {}
    $.timelapseJpeg.selectedStartDate = moment().utc().subtract(2, 'days').format('YYYY-MM-DDTHH:mm:ss')
    $.timelapseJpeg.selectedEndDate = moment().utc().format('YYYY-MM-DDTHH:mm:ss')
    $.timelapseJpeg.datepicker.daterangepicker({
        startDate: moment().utc().subtract(2, 'days'),
        endDate: moment().utc(),
        timePicker: true,
        locale: {
            format: 'YYYY/MM/DD hh:mm:ss A'
        }
    }, function(start, end, label) {
        console.log(start,end)
        var selectedStartDate = moment(start).utc().format('YYYY-MM-DDTHH:mm:ss')
        var selectedEndDate = moment(end).utc().format('YYYY-MM-DDTHH:mm:ss')
        $.timelapseJpeg.draw(selectedStartDate,selectedEndDate)
        $.timelapseJpeg.selectedStartDate = selectedStartDate
        $.timelapseJpeg.selectedEndDate = selectedEndDate
    })
    $.timelapseJpeg.monitors.change(function(){
        $.timelapseJpeg.draw()
        $.timelapseJpeg.getLiveStream()
    })
    $.timelapseJpeg.getLiveStream = function(){
        var selectedMonitor = $.timelapseJpeg.monitors.val()
        $.timelapseJpeg.liveStreamView.html(`<iframe src="${$.timelapseJpeg.pointer+$user.auth_token+'/embed/'+$user.ke+'/'+selectedMonitor+'/jquery|fullscreen'}"></iframe>`)
        $.timelapseJpeg.liveStreamView.find('iframe').width($.timelapseJpeg.playBackViewImg.width())

    }
    $.timelapseJpeg.draw = function(startDate,endDate){
        if(!startDate)startDate = $.timelapseJpeg.selectedStartDate
        if(!endDate)endDate = $.timelapseJpeg.selectedEndDate
        $.timelapseJpeg.frameStripContainerOffset = $.timelapseJpeg.frameStripContainer.offset()
        var queryString = ['start=' + startDate,'end=' + endDate]
        var frameIconsHtml = ''
        var selectedMonitor = $.timelapseJpeg.monitors.val()
        var apiURL = $.timelapseJpeg.pointer+$user.auth_token+'/timelapse/'+$user.ke+'/'+selectedMonitor
        console.log(apiURL + '?' + queryString.join('&'))
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            if(data && data[0]){
                var firstFilename = data[0].filename
                $.timelapseJpeg.frameSelected = firstFilename
                $.timelapseJpeg.playlist = {}
                $.timelapseJpeg.playlistArray = []
                $.each(data.reverse(),function(n,fileInfo){
                    fileInfo.href = apiURL + '/' + fileInfo.filename.split('T')[0] + '/' + fileInfo.filename
                    fileInfo.number = n
                    frameIconsHtml += '<div class="col-md-4"><div class="frame" data-filename="' + fileInfo.filename + '" style="background-image:url(\'' + fileInfo.href + '\')"><div class="shade">' + moment(fileInfo.time).format('YYYY-MM-DD HH:mm:ss') + '</div></div></div>'
                    $.timelapseJpeg.playlist[fileInfo.filename] = fileInfo
                })
                $.timelapseJpeg.playlistArray = data
                $.timelapseJpeg.frameIcons.html(frameIconsHtml)
                $.timelapseJpeg.frameIcons.find(`.frame:first`).click()
                $.timelapseJpeg.getLiveStream()
                $.timelapseJpeg.resetFilmStripPositions()
            }else{
                frameIconsHtml = lang['No Data']
                $.timelapseJpeg.frameIcons.html(frameIconsHtml)
            }
        })
    }
    $.timelapseJpeg.fieldHolderCssHeightModifier = 0
    $.timelapseJpeg.resetFilmStripPositions = function(){
        var numberOfFrames = Object.keys($.timelapseJpeg.playlist).length
        var fieldHolderHeight = $.timelapseJpeg.fieldHolder.height() + $.timelapseJpeg.fieldHolderCssHeightModifier
        console.log("calc(100% - " + fieldHolderHeight + "px)")
        $.timelapseJpeg.frameIcons.css({height:"calc(100% - " + fieldHolderHeight + "px)"})
    }
    $.timelapseJpeg.setPlayBackFrame = function(href){
        $.timelapseJpeg.playBackViewImg[0].src = href
    }
    $.timelapseJpeg.playInterval = 1000 / 30
    $.timelapseJpeg.play = function(){
        var selectedFrame = $.timelapseJpeg.playlist[$.timelapseJpeg.frameSelected]
        var selectedFrameNumber = $.timelapseJpeg.playlist[$.timelapseJpeg.frameSelected].number
        $.timelapseJpeg.setPlayBackFrame(selectedFrame.href)
        $.timelapseJpeg.frameIcons.find(`.frame.selected`).removeClass('selected')
        $.timelapseJpeg.frameIcons.find(`.frame[data-filename="${selectedFrame.filename}"]`).addClass('selected')
        clearTimeout($.timelapseJpeg.playIntervalTimer)
        $.timelapseJpeg.playIntervalTimer = setTimeout(function(){
            ++selectedFrameNumber
            var newSelectedFrame = $.timelapseJpeg.playlistArray[selectedFrameNumber]
            if(!newSelectedFrame)return
            $.timelapseJpeg.frameSelected = newSelectedFrame.filename
            $.timelapseJpeg.play()
        },$.timelapseJpeg.playInterval)
    }
    $.timelapseJpeg.destroy = function(){
        $.timelapseJpeg.pause()
        $.timelapseJpeg.frameIcons.empty()
        $.timelapseJpeg.setPlayBackFrame(null)
    }
    $.timelapseJpeg.pause = function(){
        clearTimeout($.timelapseJpeg.playIntervalTimer)
        delete($.timelapseJpeg.playIntervalTimer)
    }
    $.timelapseJpeg.togglePlayPause = function(){
        if($.timelapseJpeg.playIntervalTimer){
            $.timelapseJpeg.pause()
        }else{
            $.timelapseJpeg.play()
        }
    }
    $.timelapseJpeg.e.on('click','.frame',function(){
        $.timelapseJpeg.pause()
        var selectedFrame = $(this).attr('data-filename')
        if(selectedFrame === $.timelapseJpeg.frameSelected){
            return $.timelapseJpeg.togglePlayPause()
        }
        $.timelapseJpeg.frameSelected = selectedFrame
        $.timelapseJpeg.frameIcons.find(`.frame.selected`).removeClass('selected')
        $.timelapseJpeg.frameIcons.find(`.frame[data-filename="${selectedFrame}"]`).addClass('selected')
        var href = $.timelapseJpeg.playlist[selectedFrame].href
        $.timelapseJpeg.setPlayBackFrame(href)
    })
    $.timelapseJpeg.e.on('click','.download_mp4',function(){
        var _this = $(this)
        var runDownloader = function(){
            var startDate = $.timelapseJpeg.selectedStartDate
            var endDate = $.timelapseJpeg.selectedEndDate
            var queryString = ['fps=' + $.timelapseJpeg.timelapseJpegFps.val(),'start=' + startDate,'end=' + endDate,'mp4=1']
            var timerId = queryString.join('&')
            var selectedMonitor = $.timelapseJpeg.monitors.val()
            var generatorUrl = $.timelapseJpeg.pointer + $user.auth_token + '/timelapse/' + $user.ke + '/' + selectedMonitor
            $.getJSON(generatorUrl + '?' + queryString.join('&'),function(response){
                if(response.fileExists){
                    _this.text(lang['Download'])
                    var downloadName = startDate + '_' + endDate + '_' + selectedMonitor + '.mp4'
                    var a = document.createElement('a')
                    a.href = generatorUrl + '?' + queryString.concat(['download="1"']).join('&')
                    a.download = downloadName
                    a.click()
                }else{
                    _this.html('&nbsp;<i class="fa fa-spinner fa-pulse"></i>&nbsp;')
                    clearTimeout($.timelapseJpeg.downloadRecheckTimers[timerId])
                    $.timelapseJpeg.downloadRecheckTimers[timerId] = setTimeout(function(){
                        runDownloader()
                    },5000)
                }
            })
        }
        runDownloader()
    })
    $.timelapseJpeg.e.on('shown.bs.modal', function (e) {
        // $.timelapseJpeg.datepicker.val($.timelapseJpeg.baseDate)
        // $.timelapseJpeg.draw($.timelapseJpeg.baseDate)
    })
    $.timelapseJpeg.e.on('hidden.bs.modal', function (e) {
        $.timelapseJpeg.destroy()
    })
    $.timelapseJpeg.timelapseJpegFps
        .on('slide',function(ev){
            $.timelapseJpeg.playInterval = 1000 / ev.value
        })
        .slider({
        	formatter: function(value) {
        		return 'FPS : ' + value;
        	}
        })
})
