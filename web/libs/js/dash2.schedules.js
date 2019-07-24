$(document).ready(function(){
    $.schedules = {
        e: $('#schedules'),
        selector: $('#schedulesSelector'),
        loadedMonitorStates: {},
        loadedSchedules: {}
    }
    $.schedules.f = $.schedules.e.find('form')
    $.schedules.selectedStates = $.schedules.e.find('[name="monitorStates"]')
    $.schedules.selectedDays = $.schedules.e.find('[name="days"]')
    $.schedules.loadSchedules = function(callback){
        $.get($.ccio.init('location',$user) + $user.auth_token + '/schedule/' + $user.ke,function(d){
            console.log(d)
            var html = ''
            $.each(d.schedules,function(n,v){
                $.schedules.loadedSchedules[v.name] = v
                html += $.ccio.tm('option',{
                    id: v.name,
                    name: v.name
                })
            })
            $.schedules.selector.find('optgroup').html(html)
            if(callback)callback()
        })
    }
    $.schedules.loadMonitorStates = function(){
        $.get($.ccio.init('location',$user) + $user.auth_token + '/monitorStates/' + $user.ke,function(d){
            var html = ''
            $.each(d.presets,function(n,v){
                $.schedules.loadedMonitorStates[v.name] = v
                html += $.ccio.tm('option',{
                    id: v.name,
                    name: v.name
                })
            })
            $.schedules.selectedStates.html(html)
        })
    }
    $.schedules.e.on('shown.bs.modal', function (e) {
        $.schedules.loadMonitorStates()
        $.schedules.loadSchedules()
    })
    $.schedules.e.on('click','.delete',function(e){
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Delete Monitor States Preset']);
        $.confirm.body.html(lang.deleteMonitorStateText1);
        $.confirm.click({title:'Delete',class:'btn-danger'},function(){
            var form = $.schedules.f.serializeObject()
            $.post($.ccio.init('location',$user) + $user.auth_token + '/schedule/' + $user.ke + '/' + form.name + '/delete',function(d){
                $.ccio.log(d)
                if(d.ok === true){
                    $.schedules.loadSchedules()
                    $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
                }
            })
        })
    })
    $.schedules.selector.change(function(e){
        var selected = $(this).val()
        var loaded = $.schedules.loadedSchedules[selected]
        var namespace = $.schedules.e.find('[name="name"]')
        var deleteButton = $.schedules.e.find('.delete')
        var tzEl = $.schedules.e.find('[name="timezone"]')
        $.schedules.selectedStates.find('option:selected').removeAttr('selected')
        $.schedules.selectedDays.find('option:selected').removeAttr('selected')
        if(loaded){
            namespace.val(loaded.name)
            var html = ''
            $.each(loaded,function(n,v){
                $.schedules.f.find('[name="' + n + '"]').val(v)
            })
            $.each(loaded.details.monitorStates,function(n,v){
                $.schedules.selectedStates.find('option[value="' + v + '"]').prop('selected',true)
            })
            $.each(loaded.details.days,function(n,v){
                $.schedules.selectedDays.find('option[value="' + v + '"]').prop('selected',true)
            })
            tzEl.val(loaded.details.timezone || '+0')
            deleteButton.show()
        }else{
            tzEl.val('+0')
            namespace.val('')
            deleteButton.hide()
        }
    })
    $.schedules.f.submit(function(e){
        e.preventDefault()
        var el = $(this)
        var form = el.serializeObject()
        var monitors = []
        var failedToParseAJson = false
        var rows = $.monitorStates.monitors.find('.state-monitor-row')
        if(form.name === ''){
            return $.ccio.init('note',{title:lang['Invalid Data'],text:lang['Name cannot be empty.'],type:'error'})
        }
        if(form.start === ''){
            return $.ccio.init('note',{title:lang['Invalid Data'],text:lang['Start Time cannot be empty.'],type:'error'})
        }
        if(form.monitorStates instanceof Array === false){
            form.monitorStates = [form.monitorStates]
        }
        if(!form.days || form.days === ''){
            form.days = null
        }else if(form.days instanceof Array === false){
            form.days = [form.days]
        }
        var data = {
            start: form.start,
            end: form.end,
            enabled: form.enabled,
            details: {
                monitorStates: form.monitorStates,
                days: form.days,
                timezone: form.timezone,
            }
        }
        $.post($.ccio.init('location',$user) + $user.auth_token + '/schedule/' + $user.ke + '/' + form.name + '/insert',{data:data},function(d){
            $.ccio.log(d)
            if(d.ok === true){
                $.schedules.loadSchedules(function(){
                    $.schedules.selector.val(form.name)
                })
                $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
            }
        })
        return false;
    })
})
