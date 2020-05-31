$(document).ready(function(e){
    //Timelapse JPEG Window
    var eventCountsWindow = $('#eventCounts')
    var dateSelector = $('#eventCounts_date')
    var eventCountsChart = $('#eventCounts-chart')
    var monitorsList = eventCountsWindow.find('.monitors_list')
    var apiBaseUrl = $.ccio.init('location',$user) + $user.auth_token
    var downloadRecheckTimers = {}
    var currentPlaylist = {}
    var openEventCountsWindow = function(monitorId,startDate,endDate){
        eventCountsWindow.modal('show')
        drawEventCountsWindowElements(monitorId,startDate,endDate)
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
        drawEventCountsWindowElements()
    })
    monitorsList.change(function(){
        drawEventCountsWindowElements()
    })
    var drawnChart
    var currentColor = 0
    var pickNextColor = function(){
        var colorKeys = Object.keys(window.chartColors)
        ++currentColor
        if(!colorKeys[currentColor])currentColor = 0
        return window.chartColors[colorKeys[currentColor]]
    }
    var destroyChart = function(){
        if(drawnChart){
            drawnChart.destroy()
            drawnChart = null
        }
    }
    var drawEventCountsWindowElements = function(selectedMonitor,startDate,endDate){
        var dateRange = getSelectedTime(true)
        if(!startDate)startDate = dateRange.startDate
        if(!endDate)endDate = dateRange.endDate
        if(!selectedMonitor)selectedMonitor = monitorsList.val()
        var queryString = ['start=' + startDate,'end=' + endDate]
        var apiURL = apiBaseUrl + '/eventCounts/' + $user.ke + '/' + selectedMonitor
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            if(data.counts && data.counts[0]){
                    var separatedDataByTag = {}
                    var chartDatasets = []
                    var counts = data.counts
                    $.each(counts,function(n,row){
                        var dataPlots = []
                        if(!separatedDataByTag[row.tag]){
                            var chosenColor = pickNextColor()
                            separatedDataByTag[row.tag] = {
                                label: row.tag,
                                backgroundColor: Chart.helpers.color(chosenColor).alpha(0.5).rgbString(),
                                borderColor: chosenColor,
                                fill: false,
                                data: [],
                            }
                        }
                        separatedDataByTag[row.tag].data.push({
                            x: new Date(row.time),
                            y: row.count,
                        })
                        // chartDatasets.push()
                    })

            		var config = {
            			type: 'line',
            			data: {
            				datasets: Object.values(separatedDataByTag)
            			},
            			options: {
            				responsive: true,
            				title: {
            					display: true,
            					text: 'Events Counted'
            				},
            				scales: {
            					xAxes: [{
            						type: 'time',
            						display: true,
            						scaleLabel: {
            							display: true,
            							labelString: 'Date'
            						},
            						ticks: {
            							major: {
            								fontStyle: 'bold',
            								fontColor: '#FF0000'
            							}
            						}
            					}],
            					yAxes: [{
            						display: true,
            						scaleLabel: {
            							display: true,
            							labelString: 'value'
            						}
            					}]
            				}
            			}
            		};
                    var ctx = eventCountsChart[0].getContext('2d');
                    destroyChart()
                    drawnChart = new Chart(ctx, config);
            }else{
                eventCountsChart.html(lang['No Data'])
            }
        })
    }
    eventCountsWindow.on('shown.bs.modal', function (e) {
        createMonitorsList(monitorsList)
        drawEventCountsWindowElements()
    })
    eventCountsWindow.on('hidden.bs.modal', function (e) {
        destroyChart()
    })
    $.eventCounts = {
        openWindow: openEventCountsWindow,
        monitorsList: monitorsList
    }
})
