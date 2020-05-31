$(document).ready(function(e){
    //Timelapse JPEG Window
    var timelapseWindow = $('#timelapsejpeg')
    var dateSelector = $('#timelapsejpeg_date')
    var fpsSelector = $('#timelapseJpegFps')
    var framesContainer = timelapseWindow.find('.frames')
    var frameStrip = timelapseWindow.find('.frameStrip')
    var frameIcons = timelapseWindow.find('.frameIcons')
    var fieldHolder = timelapseWindow.find('.fieldHolder')
    var frameStripPreview = timelapseWindow.find('.frameStripPreview')
    var frameStripContainer = timelapseWindow.find('.frameStripContainer')
    var playBackViewImage = timelapseWindow.find('.playBackView img')
    var liveStreamView = timelapseWindow.find('.liveStreamView')
    var monitorsList = timelapseWindow.find('.monitors_list')
    var apiBaseUrl = $.ccio.init('location',$user) + $user.auth_token
    var downloadRecheckTimers = {}
    var currentPlaylist = {}
    var frameSelected = null
    var playIntervalTimer = null
    var playInterval = 1000 / 30
    var fieldHolderCssHeightModifier = 0
    var canPlay = false;

    var openTimelapseWindow = function(monitorId,startDate,endDate){
        timelapseWindow.modal('show')
        drawTimelapseWindowElements(monitorId,startDate,endDate)
    }
    var getSelectedTime = function(asUtc){
        var dateRange = dateSelector.data('daterangepicker')
        var startDate = dateRange.startDate
        var endDate = dateRange.endDate
        if(asUtc){
            startDate = startDate.utc()
            endDate = endDate.utc()
        }
        startDate = startDate.format('YYYY-MM-DDTHH:mm:ss')
        endDate = endDate.format('YYYY-MM-DDTHH:mm:ss')
        return {
            startDate: startDate,
            endDate: endDate
        }
    }

    dateSelector.daterangepicker({
        startDate: moment().utc().subtract(2, 'days'),
        endDate: moment().utc(),
        timePicker: true,
        locale: {
            format: 'YYYY/MM/DD hh:mm:ss A'
        }
    }, function(start, end, label) {
        drawTimelapseWindowElements()
    })
    monitorsList.change(function(){
        drawTimelapseWindowElements()
        getLiveStream()
    })
    var getLiveStream = function(){
        var selectedMonitor = monitorsList.val()
        liveStreamView.html(`<iframe src="${apiBaseUrl + '/embed/' + $user.ke + '/' + selectedMonitor + '/jquery|fullscreen'}"></iframe>`)
        liveStreamView.find('iframe').width(playBackViewImage.width())

    }
    var drawTimelapseWindowElements = function(selectedMonitor,startDate,endDate){
        var dateRange = getSelectedTime(true)
        if(!startDate)startDate = dateRange.startDate
        if(!endDate)endDate = dateRange.endDate
        if(!selectedMonitor)selectedMonitor = monitorsList.val()
        var queryString = ['start=' + startDate,'end=' + endDate]
        var frameIconsHtml = ''
        var apiURL = apiBaseUrl + '/timelapse/' + $user.ke + '/' + selectedMonitor
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            if(data && data[0]){
                var firstFilename = data[0].filename
                frameSelected = firstFilename
                currentPlaylist = {}
                currentPlaylistArray = []
                $.each(data.reverse(),function(n,fileInfo){
                    fileInfo.href = apiURL + '/' + fileInfo.filename.split('T')[0] + '/' + fileInfo.filename
                    fileInfo.number = n
                    frameIconsHtml += '<div class="col-md-4"><div class="frame" data-filename="' + fileInfo.filename + '" style="background-image:url(\'' + fileInfo.href + '\')"><div class="shade">' + moment(fileInfo.time).format('YYYY-MM-DD HH:mm:ss') + '</div></div></div>'
                    currentPlaylist[fileInfo.filename] = fileInfo
                })
                currentPlaylistArray = data
                frameIcons.html(frameIconsHtml)
                frameIcons.find(`.frame:first`).click()
                // getLiveStream()
                resetFilmStripPositions()
            }else{
                frameIconsHtml = lang['No Data']
                frameIcons.html(frameIconsHtml)
            }
        })
    }
    var resetFilmStripPositions = function(){
        var numberOfFrames = Object.keys(currentPlaylist).length
        var fieldHolderHeight = fieldHolder.height() + fieldHolderCssHeightModifier
        frameIcons.css({height:"calc(100% - 15px - " + fieldHolderHeight + "px)"})
    }
    var setPlayBackFrame = function(href,callback){
        playBackViewImage
        .off('load').on('load',function(){
            playBackViewImage.off('error')
            if(callback)callback()
        })
        .off('error').on('error',function(){
            if(callback)callback()
        })
        playBackViewImage[0].src = href
    }
    var startPlayLoop = function(){
        var selectedFrame = currentPlaylist[frameSelected]
        var selectedFrameNumber = currentPlaylist[frameSelected].number
        setPlayBackFrame(selectedFrame.href,function(){
            frameIcons.find(`.frame.selected`).removeClass('selected')
            frameIcons.find(`.frame[data-filename="${selectedFrame.filename}"]`).addClass('selected')
            clearTimeout(playIntervalTimer)
            playIntervalTimer = setTimeout(function(){
                if(!canPlay)return
                ++selectedFrameNumber
                var newSelectedFrame = currentPlaylistArray[selectedFrameNumber]
                if(!newSelectedFrame)return
                frameSelected = newSelectedFrame.filename
                startPlayLoop()
            },playInterval)
        })
    }
    var playTimelapse = function(){
        canPlay = true
        startPlayLoop()
    }
    var destroyTimelapse = function(){
        playBackViewImage.off('load')
        frameSelected = null
        pauseTimelapse()
        frameIcons.empty()
        setPlayBackFrame(null)
    }
    var pauseTimelapse = function(){
        canPlay = false
        clearTimeout(playIntervalTimer)
        playIntervalTimer = null
    }
    var togglePlayPause = function(){
        var playPauseText = timelapseWindow.find('.playPauseText')
        if(canPlay){
            canPlay = false
            pauseTimelapse()
            playPauseText.text(lang.Play)
        }else{
            canPlay = true
            playTimelapse()
            playPauseText.text(lang.Pause)
        }
    }
    timelapseWindow.on('click','.frame',function(){
        pauseTimelapse()
        var selectedFrame = $(this).attr('data-filename')
        if(selectedFrame === frameSelected){
            return togglePlayPause()
        }
        frameSelected = selectedFrame
        frameIcons.find(`.frame.selected`).removeClass('selected')
        frameIcons.find(`.frame[data-filename="${selectedFrame}"]`).addClass('selected')
        var href = currentPlaylist[selectedFrame].href
        setPlayBackFrame(href)
    })
    timelapseWindow.on('click','.playPause',function(){
        togglePlayPause()
    })
    timelapseWindow.on('click','.download_mp4',function(){
        var _this = $(this)
        var runDownloader = function(){
            var dateRange = getSelectedTime(true)
            var startDate = dateRange.startDate
            var endDate = dateRange.endDate
            var selectedMonitor = monitorsList.val()
            var queryString = ['fps=' + fpsSelector.val(),'start=' + startDate,'end=' + endDate,'mp4=1']
            var timerId = queryString.join('&')
            var generatorUrl = apiBaseUrl + '/timelapse/' + $user.ke + '/' + selectedMonitor
            $.getJSON(generatorUrl + '?' + queryString.join('&'),function(response){
                _this.text(lang['Download'])
                if(response.fileExists){
                    var downloadName = startDate + '_' + endDate + '_' + selectedMonitor + '.mp4'
                    var a = document.createElement('a')
                    a.href = generatorUrl + '?' + queryString.concat(['download="1"']).join('&')
                    a.download = downloadName
                    a.click()
                }else{
                    _this.html(lang['Please Wait...'])
                    clearTimeout(downloadRecheckTimers[timerId])
                    downloadRecheckTimers[timerId] = setTimeout(function(){
                        _this.html(lang['Download'])
                    },5000)
                }
            })
        }
        runDownloader()
    })
    timelapseWindow.on('shown.bs.modal', function (e) {
        resetFilmStripPositions()
    })
    timelapseWindow.on('hidden.bs.modal', function (e) {
        destroyTimelapse()
    })
    fpsSelector
        .on('slide',function(ev){
            playInterval = 1000 / ev.value
        })
        .slider({
        	formatter: function(value) {
        		return 'FPS : ' + value;
        	}
        });
    $.timelapseJpeg = {
        openWindow: openTimelapseWindow,
        monitorsList: monitorsList
    }
})
