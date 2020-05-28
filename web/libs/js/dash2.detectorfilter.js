$(document).ready(function(e){
    //detector filters window
    $.detectorFilters = {e:$('#detector_filter')};
    var detectorFiltersWindow = $('#detector_filter')
    var detectorFiltersSelector = $('#detector_filters')
    var detectorFiltersConditionRows = $('#detector_filters_where')
    var detectorFiltersForm = detectorFiltersWindow.find('form');
    var getSelectedFilter = function(){
        return detectorFiltersSelector.val()
    }
    var drawOptions = function(){
        var dFilters = getFiltersFromMonitorInEditor()
        detectorFiltersForm.find('[name="id"]').val($.ccio.gid(5))
        detectorFiltersSelector.find('optgroup').empty()
        $.each(dFilters,function(n,dFilter){
            $.ccio.tm('option',{auth_token:$user.auth_token,id:dFilter.id,name:dFilter.filter_name},'#detector_filters optgroup')
        })
    }
    var getFiltersFromMonitorInEditor = function(){
        try{
            return JSON.parse($.aM.e.find('[detail="detector_filters"]').val())
        }catch(err){
            return {}
        }
    }
    var writeFiltersToMonitorEditor = function(){
        var currentVals = getFiltersFromMonitorInEditor()
        currentVals[$.detectorFilters.lastSave.id] = $.detectorFilters.lastSave
        $.aM.e.find('[detail="detector_filters"]').val(JSON.stringify(currentVals)).change()
    }
    var drawDetectorFilterFieldsRow = function(d){
        if(!d)d = {};
        d.id = $('#filters_where .row').length;
        if(!d.p1){d.p1='indifference'}
        if(!d.p2){d.p2='='}
        if(!d.p3){d.p3=''}
        if(!d.p4){d.p4='&&'}
        tmp = `<div class="row where-row">
           <div class="form-group col-md-3">
               <label>
                   <select class="form-control" where="p1">
                       <option value="indifference" selected>${lang['Indifference']}</option>
                       <option value="name">${lang['Region Name']}</option>
                       <option value="reason">${lang['Reason']}</option>
                       <option value="time">${lang['Time']}</option>
                       <option value="plug">${lang['Detection Engine']}</option>
                       <optgroup label="Matrix">
                          <option value="tag">${lang['Object Tag']}</option>
                          <option value="confidence">${lang['Confidence']}</option>
                          <option value="x">${lang['X Point']}</option>
                          <option value="y">${lang['Y Point']}</option>
                          <option value="height">${lang['Height']}</option>
                          <option value="width">${lang['Width']}</option>
                       </optgroup>
                   </select>
               </label>
           </div>
           <div class="form-group col-md-3">
               <label>
                   <select class="form-control" where="p2">
                       <option value="===" selected>${lang['Equal to']}</option>
                       <option value="!==">${lang['Not Equal to']}</option>
                       <option value="indexOf">${lang['Contains']}</option>
                       <option value="!indexOf">${lang['Does Not Contain']}</option>
                       <optgroup label="For Numbers">
                          <option value=">=">${lang['Greater Than or Equal to']}</option>
                          <option value=">">${lang['Greater Than']}</option>
                          <option value="<">${lang['Less Than']}</option>
                          <option value="<=">${lang['Less Than or Equal to']}</option>
                       </optgroup>
                   </select>
               </label>
           </div>
           <div class="form-group col-md-3">
               <label>
                   <input class="form-control" placeholder="Value" title="${lang.Value}" where="p3">
               </label>
           </div>
           <div class="form-group col-md-3">
               <label>
                   <select class="form-control" where="p4">
                       <option value="&&" selected>${lang['AND']}</option>
                       <option value="||">${lang['OR']}</option>
                   </select>
               </label>
           </div>
        </div>`
        detectorFiltersConditionRows.append(tmp);
        detectorFiltersConditionRows.find('.row [where="p4"][disabled]').prop('disabled',false)
        detectorFiltersConditionRows.find('.row:last [where="p1"]').val(d.p1)
        detectorFiltersConditionRows.find('.row:last [where="p2"]').val(d.p2)
        detectorFiltersConditionRows.find('.row:last [where="p3"]').val(d.p3)
        detectorFiltersConditionRows.find('.row:last [where="p4"]').val(d.p4).prop('disabled',true)
    }
    detectorFiltersWindow.on('change','[where="p1"]',function(e){
        var el = $(this)
        var p1v = el.val()
        var parent = el.parents('.row')
        var p3 = parent.find('[where="p3"]')
        var options = []
        switch(p1v){
            case'time':
                options = [
                    '00:00:00'
                ]
            break;
            case'reason':
                options = [
                    'licensePlate',
                    'object',
                    'motion',
                ]
            break;
            case'plug':
                options = [
                    'Tensorflow',
                    'Yolo',
                    'built-in',
                ]
            break;
            case'tag':
                options = [
                    'car',
                    'tree',
                    'pottedplant',
                ]
            break;
        }
        var msg = 'Value'
        if(options.length > 0){
            msg = 'Example : '+options.join(', ')
        }
        p3.attr('placeholder',msg)
    })
    detectorFiltersWindow.on('shown.bs.modal',function(e){
        drawOptions()
    })
    detectorFiltersWindow.on('click','.where .add',function(e){
        drawDetectorFilterFieldsRow()
    })
    detectorFiltersWindow.on('click','.where .remove',function(e){
        el = detectorFiltersConditionRows.find('.row');
        if(el.length > 1){
            el.last().remove();
            detectorFiltersConditionRows.find('.row:last [where="p4"]').prop('disabled',true)
        }
    })
    detectorFiltersForm.find('.delete').click(function(e){
        var currentVals = getFiltersFromMonitorInEditor()
        var newObject = {}
        var deleteId = getSelectedFilter()
        $.each(currentVals,function(id,obj){
            if(id === deleteId)return false;
            newObject[id] = obj
        })
        $.aM.e.find('[detail="detector_filters"]').val(JSON.stringify(newObject)).change()
        drawOptions()
    })
    detectorFiltersSelector.change(function(){
        var el = $(this)
        var filterId = el.val()
        var filterName
        detectorFiltersConditionRows.empty()
        if(filterId && filterId!==''){
            var currentFilter = getFiltersFromMonitorInEditor()[filterId]
            filterName = currentFilter.name
            $.each(currentFilter.where,function(n,v){
                drawDetectorFilterFieldsRow(v)
            })
            $.each(currentFilter.actions,function(action,val){
                detectorFiltersWindow.find('[actions="'+action+'"]').val(val)
            })
            $.each(currentFilter,function(n,v){
                if(n === 'where'){return}
                detectorFiltersForm.find('[name="'+n+'"]').val(v)
            })
        }else{
            filterName = lang['Add New'];
            detectorFiltersForm.find('[name="id"]').val($.ccio.gid(5));
            drawDetectorFilterFieldsRow()
        }
        detectorFiltersWindow.find('.filter_name').text(filterName)
    }).change()
    detectorFiltersForm.submit(function(e){
        e.preventDefault()
        var el = $(this)
        var form = el.serializeObject()
        $.each(form,function(key,value){
            form[key] = value.trim()
        })
        //create conditions object (where)
        form.where = []
        el.find('.where-row').each(function(n,v){
            var where = {}
            $(v).find('[where]').each(function(m,b){
                var el = $(this)
                where[el.attr('where')] = el.val().trim()
            })
            form.where.push(where)
        })
        // create actions object (do)
        form.actions = {}
        el.find('.actions-row').each(function(n,v){
            var actions = $(v).find('[actions]')
            form.actions[actions.attr('actions')] = actions.val()
        })
        $.detectorFilters.lastSave = form
        writeFiltersToMonitorEditor()
        detectorFiltersWindow.modal('hide')
        return false
    })
})
