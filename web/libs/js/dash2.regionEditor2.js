$(document).ready(function(e){
    var regionEditorWindow = $('#region_editor')
    var regionEditorForm = regionEditorWindow.find('form')
    var regionEditorRegionsList = $('#regions_list')
    var regionEditorRegionsPoints = $('#regions_points')
    var regionEditorRegionsCanvas = $('#regions_canvas')
    var regionStillImage = $('#region_still_image');
    var regionEditorCanvasHolder = regionEditorWindow.find('.canvas_holder')
    var getRegionEditorCanvas = function(){
        return regionEditorWindow.find('canvas')
    }
    var getRegionEditorNameField = function(){
        return regionEditorWindow.find('[name="name"]')
    }
    var getCurrentlySelectedRegionId = function(){
        return regionEditorRegionsList.val()
    }
    var regionViewerDetails = {}
    var createBlankCoorindateObject = function(name){
        return {
            name: name,
            sensitivity: 10,
            max_sensitivity: '',
            threshold: 1,
            color_threshold: 9,
            points: [
                [0, 0],
                [0, 100],
                [100, 0]
            ]
        }
    }
    var loadRegionEditor = function(monitorDetails){
        var width = $.aM.e.find('[detail="detector_scale_x"]').val()
        var height = $.aM.e.find('[detail="detector_scale_y"]').val()
        monitorDetails.cords = $.aM.e.find('[detail="cords"]').val()
        if(width === ''){
            monitorDetails.detector_scale_x = 640
            monitorDetails.detector_scale_y = 480
            $.aM.e.find('[detail="detector_scale_x"]').val(monitorDetails.detector_scale_x)
            $.aM.e.find('[detail="detector_scale_y"]').val(monitorDetails.detector_scale_y)
        }else{
            monitorDetails.detector_scale_x = width
            monitorDetails.detector_scale_y = height
        }

        regionEditorWindow.modal('show')
        getRegionEditorCanvas().attr('width',monitorDetails.detector_scale_x).attr('height',monitorDetails.detector_scale_y)
        regionEditorCanvasHolder.css({
            width: monitorDetails.detector_scale_x,
            height: monitorDetails.detector_scale_y
        });
        if(monitorDetails.cords && (monitorDetails.cords instanceof Object) === false){
            try{
                monitorDetails.cords = JSON.parse(monitorDetails.cords)
            }catch(er){

            }
        }
        if(!monitorDetails.cords || monitorDetails.cords === ''){
            monitorDetails.cords = {}
            monitorDetails.cords[s.gid(5)] = createBlankCoorindateObject('newName')
        }
        regionViewerDetails = monitorDetails;
        initiateRegionList()
    }
    var drawPointsTable = function(){
        var currentRegionId = getCurrentlySelectedRegionId()
        var value = regionEditorRegionsCanvas.val().replace(/(,[^,]*),/g, '$1;').split(';');
        var newArray = [];
        $.each(value,function(n,v){
            v = v.split(',')
            if(v[1]){
                newArray.push([v[0],v[1]])
            }
        })
        regionViewerDetails.cords[currentRegionId].points = newArray
        regionEditorRegionsPoints.empty()
        $.each(regionViewerDetails.cords[currentRegionId].points,function(n,v){
            if(isNaN(v[0])){v[0] = 20}
            if(isNaN(v[1])){v[1] = 20}
            regionEditorRegionsPoints.append(`<tr points="${n}">
    <td>
        <input class="form-control" placeholder="X" point="x" value="${v[0]}">
    </td>
    <td>
        <input class="form-control" placeholder="Y" point="y" value="${v[1]}">
    </td>
    <td class="text-right"><a class="delete btn btn-danger"><i class="fa fa-trash-o"></i></a></td>
</tr>`)
        })
    }
    var saveCoords = function(){
        $.aM.e.find('[detail="cords"]').val(JSON.stringify(regionViewerDetails.cords)).change()
    }
    var initiateRegionList = function(){
        regionEditorRegionsList.empty()
        regionEditorRegionsPoints.empty()
        $.each(regionViewerDetails.cords,function(regionId,region){
            if(region && region.name){
                regionEditorRegionsList.append('<option value="' + regionId + '">' + region.name + '</option>')
            }
        });
        regionEditorRegionsList.change();
    }
    var initLiveStream = function(e){
        var e={}
        var liveElement = $('#region_editor_live');
        var apiPoint = 'embed'
        liveElement.find('iframe,img').attr('src','about:blank').hide()
        if(regionStillImage.is(':checked')){
            liveElement = liveElement.find('img')
            apiPoint = 'jpeg'
        }else{
            liveElement = liveElement.find('iframe')
            apiPoint = 'embed'
        }
        var apiUrl = `${$.ccio.init('location',$user)+$user.auth_token}/${apiPoint}/${$user.ke}/${$.aM.selected.mid}`
        if(apiPoint === 'embed'){
            apiUrl += '/fullscreen|jquery|relative'
        }else{
            apiUrl += '/s.jpg'
        }
        if(liveElement.attr('src') !== apiUrl){
            liveElement.attr('src',apiUrl).show()
        }
        liveElement.attr('width',regionViewerDetails.detector_scale_x)
        liveElement.attr('height',regionViewerDetails.detector_scale_y)
    }
    var initCanvas = function(){
        var newArray = [];
        var regionEditorRegionsListValue = regionEditorRegionsList.val();
        if(!regionEditorRegionsListValue){
            regionEditorForm.find('[name="name"]').val('')
            regionEditorForm.find('[name="sensitivity"]').val('')
            regionEditorForm.find('[name="max_sensitivity"]').val('')
            regionEditorForm.find('[name="threshold"]').val('')
            regionEditorForm.find('[name="color_threshold"]').val('')
            regionEditorRegionsPoints.empty()
        }else{
            var cord = regionViewerDetails.cords[regionEditorRegionsListValue];
            if(!cord.points){
                cord.points = [
                    [0,0],
                    [0,100],
                    [100,0]
                ]
            }
            $.each(cord.points,function(n,v){
                newArray = newArray.concat(v)
            })
            if(isNaN(cord.sensitivity)){
                cord.sensitivity = regionViewerDetails.detector_sensitivity
            }
            regionEditorForm.find('[name="name"]').val(cord.name || regionEditorRegionsListValue)
            regionEditorWindow.find('.cord_name').text(cord.name || regionEditorRegionsListValue)
            regionEditorForm.find('[name="sensitivity"]').val(cord.sensitivity)
            regionEditorForm.find('[name="max_sensitivity"]').val(cord.max_sensitivity)
            regionEditorForm.find('[name="threshold"]').val(cord.threshold)
            regionEditorForm.find('[name="color_threshold"]').val(cord.color_threshold)
            regionEditorWindow.find('.canvas_holder canvas').remove()
            initLiveStream()
            regionEditorRegionsCanvas.val(newArray.join(','))
            regionEditorRegionsCanvas.canvasAreaDraw({
                imageUrl: placeholder.getData(placeholder.plcimg({
                    bgcolor: 'transparent',
                    text: ' ',
                    size: regionViewerDetails.detector_scale_x+'x'+regionViewerDetails.detector_scale_y
                }))
            })
            drawPointsTable()
        }
    }
    regionEditorRegionsList.change(function(e){
        initCanvas();
    })
    regionEditorWindow.on('change','[name]',function(){
        var currentRegionId = getCurrentlySelectedRegionId()
        var el = $(this)
        var val = el.val()
        var key = el.attr('name')
        regionViewerDetails.cords[currentRegionId][key] = val
        saveCoords()
    })
    regionEditorWindow.on('change','[point]',function(e){
        var currentRegionId = getCurrentlySelectedRegionId()
        var points = [];
        $('[points]').each(function(n,v){
            var el = $(this)
            var pointValueX = el.find('[point="x"]').val()
            if(pointValueX){
                points.push([
                    pointValueX,
                    el.find('[point="y"]').val()
                ])
            }
        })
        regionViewerDetails.cords[currentRegionId].points = points;
        initCanvas()
    })
    regionEditorWindow.find('.erase').click(function(e){
        var currentRegionId = getCurrentlySelectedRegionId()
        var newCoordinates = []
        $.each(regionViewerDetails.cords,function(n,points){
            if(points && points !== regionViewerDetails.cords[currentRegionId]){
                newCoordinates.push(points)
            }
        })
        regionViewerDetails.cords = newCoordinates.concat([])
        if(Object.keys(regionViewerDetails.cords).length > 0){
            initiateRegionList();
        }else{
            regionEditorForm.find('input').prop('disabled',true)
            regionEditorRegionsPoints.empty()
            regionEditorRegionsList.find('[value="'+currentRegionId+'"]').remove()
            $.aM.e.find('[detail="cords"]').val('{}').change()
        }
    })
    regionEditorWindow.on('changed','#regions_canvas',function(e){
        drawPointsTable()
        saveCoords()
    })
    regionEditorForm.submit(function(e){
        e.preventDefault()

        return false;
    })
    regionEditorRegionsPoints
    .on('click','.delete',function(e){
        var elParent = $(this).parents('tr')
        var points = elParent.attr('points')
        delete(regionViewerDetails.cords[regionEditorRegionsList.val()].points[points])
        saveCoords()
        elParent.remove()
        regionEditorRegionsList.change()
    })
    regionEditorWindow.on('click','.add',function(e){
        regionEditorForm.find('input').prop('disabled',false)
        var randomId = $.ccio.gid(5);
        var newCoordinates = {}
        $.each(regionViewerDetails.cords,function(n,v){
            if(v && v !== null && v !== 'null'){
                newCoordinates[n] = v;
            }
        })
        regionViewerDetails.cords = newCoordinates
        regionViewerDetails.cords[randomId] = createBlankCoorindateObject(randomId)
        regionEditorRegionsList.append(`<option value="${randomId}">${randomId}</option>`)
        regionEditorRegionsList.val(randomId)
        regionEditorRegionsList.change()
    })
    regionStillImage.change(function(e){
        var dashboardSwitches = $.ccio.op().switches || {}
        if($(this).is(':checked')){
            dashboardSwitches.regionStillImage = 1
        }else{
            dashboardSwitches.regionStillImage = "0"
        }
        $.ccio.op('switches',dashboardSwitches)
        initLiveStream()
    }).ready(function(e){
        var dashboardSwitches = $.ccio.op().switches || {}
        if(dashboardSwitches.regionStillImage === 1){
            regionStillImage.prop('checked',true)
        }
    })
    $.loadRegionEditor = loadRegionEditor
})
