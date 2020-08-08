$(document).ready(function(){
    window.setRadialBearing = function(iconElement,addedDegrees,titlePrefix){
        //fa-compass
        var degrees = -35;
        degrees += addedDegrees
        iconElement.css('transform','rotate(' + degrees + 'deg)').attr('title',titlePrefix + addedDegrees)
    }
    var createMapElement = function(options){
        $(`#${options.id}`).html(`<div class="gps-map" id="${options.id}_map" style="min-height: 600px;border-radius:5px;overflow:hidden;"></div>`)
        var vidViewMap = L.map(options.id + '_map').setView(options.initalView, options.zoom)
        var mapBoxMarker;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreet Map'
        }).addTo(vidViewMap)

        if(options.marker)mapBoxMarker = L.marker(options.marker).addTo(vidViewMap)
        return {
            map: vidViewMap,
            marker: mapBoxMarker,
        }
    }
    window.destroyGpsHandlerForVideoFile = function(mapId){
        var vidViewMap = $(`#${mapId}`)
        if (vidViewMap.length > 0) {
            try{
                vidViewMap.off();
                vidViewMap.remove();
            }catch(err){
                console.log(err)
            }
        }
    }
    window.createGpsHandlerForVideoFile = function(options,callback){
        var groupKey = options.ke
        var monitorId = options.mid
        var filename = options.file
        var videoElement = options.targetVideoElement
        $.get(getApiPrefix() + '/videos/' + groupKey + '/' + monitorId + '/' + filename + '?json=true',function(video){
            var response = {ok: false}
            var gps = video.details.gps
            if(gps && gps[0]){
                var gpsPoints = {}
                var firstMarker = gps[0]

                var videoStartTime = new Date(video.time)
                $.each(gps,function(n,point){
                    var pointTime = new Date(point.time)
                    var seekPosition = (pointTime - videoStartTime) / 1000
                    gpsPoints[pointTime] = point
                })
                response.ok = true
                response.gpsPoints = gpsPoints
                callback(response)
                response.elements = createMapElement({
                    id: options.targetMapElement,
                    initalView: [firstMarker.lat,firstMarker.lng],
                    marker: [firstMarker.lat,firstMarker.lng],
                    zoom: 2,
                })
                videoElement.on('timeupdate',function(){
                    var point = gpsPoints[parseInt(this.currentTime)]
                    if(point){
                        mapBoxMarker.setLatLng([point.lat, point.lng]).update()
                    }
                })
            }else{
                callback(response)
            }
        })
    }
})
