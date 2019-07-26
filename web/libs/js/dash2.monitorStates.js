$(document).ready(function(){
    $.monitorStates = {
        e: $('#monitorStates'),
        selector: $('#monitorStatesSelector'),
        monitors: $('#monitorStatesMonitors'),
        loaded: {}
    }
    $.monitorStates.f = $.monitorStates.e.find('form')
    $.monitorStates.loadPresets = function(callback){
        $.get($.ccio.init('location',$user) + $user.auth_token + '/monitorStates/' + $user.ke,function(d){
            var html = ''
            $.each(d.presets,function(n,v){
                $.monitorStates.loaded[v.name] = v
                html += '<option value="' + v.name + '">' + v.name + '</option>'
            })
            $.monitorStates.selector.find('optgroup').html(html)
            if(callback)callback()
        })
    }
    $.monitorStates.e.on('shown.bs.modal', function (e) {
        if($.monitorStates.selector.val() === '')$.monitorStates.loadPresets()
    })
    var buildOptions = function(field,possiblities,fieldData){
        if(!field)console.error('field',field)
        var fieldElement = ''
        possiblities.forEach(function(option){
            if(option.optgroup){
                fieldElement += '<optgroup label="' + option.name + '">'
                fieldElement += buildOptions(field,option.optgroup,fieldData)
                fieldElement += '</optgroup>'
            }else{
                var selected = ''
                if(option.value === fieldData || option.value === field.default){
                    selected = 'selected'
                }
                fieldElement += '<option value="' + option.value + '" ' + selected + '>' + option.name + '</option>'
            }
        })
        return fieldElement
    }
    var drawBlock = function(monitorSettings,preloadedData){
        var html = ''
        var headerTitle = lang[monitorSettings.name]
        // if(monitorSettings.evaluation && !eval(monitorSettings.evaluation)){
        //   return
        // }
        if(monitorSettings.blocks){
          monitorSettings.blocks.forEach(function(settingsBlock){
              html += drawBlock(settingsBlock)
          })
        }
        if(monitorSettings.info){
         monitorSettings.info.forEach(function(field){
             if(field.isFormGroupGroup === true){
                 html += drawBlock(field)
             }else{
                 if(field.notForSubAccount === true){
                      var notForSubAccount = '!details.sub'
                      if(!field.evaluation){
                          field.evaluation = notForSubAccount
                      }else{
                          field.evaluation += ' && ' + notForSubAccount
                      }
                  }
                  if(!field.name || field.evaluation && !eval(field.evaluation)){
                      return
                  }
                  var attributes = []
                  var listGroupClass = []
                  var monitorRowFieldClass = []
                  if(preloadedData){
                      var isDetail = false
                      var name = field.name
                      var fieldData
                      if(name.indexOf('detail=') > -1){
                          isDetail = true
                          name = name.replace('detail=','')
                          if(preloadedData.details)fieldData = preloadedData.details[name]
                      }else{
                          fieldData = preloadedData[name]
                      }
                      if(fieldData){
                          listGroupClass.push('active')
                          if(fieldType !== 'select'){
                              attributes.push(`value="${fieldData}"`)
                          }
                      }else{
                          monitorRowFieldClass.push('display:none')
                      }
                  }else{
                      monitorRowFieldClass.push('display:none')
                  }
                  if(field.placeholder || field.default){
                      attributes.push(`placeholder="${field.placeholder || field.default}"`)
                  }else if(field.example){
                      attributes.push(`placeholder="Example : ${field.example}"`)
                  }
                  var possiblities = field.possible || []
                  var fieldType = field.fieldType || 'text'
                  var fieldElement = ''
                  switch(fieldType){
                      case'number':
                            if(field.numberMin){
                                attributes.push(`min="${field.numberMin}"`)
                            }
                            if(field.numberMax){
                                attributes.push(`max="${field.numberMax}"`)
                            }
                            fieldElement = '<div><input type="number" class="form-control" ' + attributes.join(' ') + '></div>'
                      break;
                      case'password':
                            fieldElement = '<div><input type="password" class="form-control" ' + attributes.join(' ') + '></div>'
                      break;
                      case'text':
                            fieldElement = `<div><input class="form-control" ${attributes.join(' ')}></div>`
                      break;
                      case'textarea':
                            fieldElement = '<div><textarea class="form-control" ' + attributes.join(' ') + '></textarea></div>'
                      break;
                      case'select':
                            fieldElement = '<div><select class="form-control" ' + attributes.join(' ') + '>'
                            fieldElement += buildOptions(field,possiblities,fieldData)
                            fieldElement += '</select></div>'
                      break;
                  }
                  if(fieldType === 'ul' || fieldType ===  'div' || fieldType ===  'btn' || field.name === 'mid'){

                  }else{
                      if(headerTitle){
                          html += `<div class="list-group-item ${listGroupClass.join(' ')}" data-name="${field.name}" data-value="${field.value || ""}">
                              <h4>${headerTitle} : ${field.field}</h4>
                              <div><small>${field.description}</small></div>
                              <div class="state-monitor-row-fields-field mt-4" style="${monitorRowFieldClass.join(' ')}">${fieldElement}</div>
                          </div>`
                      }
                  }
              }
          })
        }
        return html
    }
    $.monitorStates.drawMonitor = function(preloadedData){
        var MonitorSettings = $.ccio.definitions['Monitor Settings']
        var html = ''
        console.log(MonitorSettings)
        Object.keys(MonitorSettings.blocks).forEach(function(blockKey){
            var block = MonitorSettings.blocks[blockKey]
            html += drawBlock(block,preloadedData)
        })
        var monitorSelect = `<select class="state-monitor-row-select form-control">`
        $.each($.ccio.mon,function(n,monitor){
            monitorSelect += `<option value="${monitor.mid}">${monitor.name} (${monitor.mid})</option>`
        })
        monitorSelect += `</select>`
        var fullHtml = `<div class="form-group state-monitor-row">
            <div class="input-group state-monitor-row-select-container">
                ${monitorSelect}
                <div class="input-group-btn">
                    <a class="btn btn-danger delete-monitor">
                        &nbsp;<i class="fa fa-times"></i>&nbsp;
                    </a>
                </div>
            </div>
            <div class="list-group state-monitor-row-fields-container" style="height:300px;overflow: auto">
                ${html}
            </div>
        </div>`
        return fullHtml
    }
    $.monitorStates.e.on('click','.add-monitor',function(e){
        var el = $(this)
        var html = $.monitorStates.drawMonitor()
        $.monitorStates.monitors.append(html)
    })
    $.monitorStates.e.on('click','.state-monitor-row-fields-container .list-group-item',function(e){
        var el = $(this)
        var listGroupParent = el.parents('.list-group')
        var fieldContainer = el.find('.state-monitor-row-fields-field')
        var name = el.attr('data-name')
        var value = el.attr('data-value')
        if(el.hasClass('active')){
            el.removeClass('active')
            fieldContainer.hide()
        }else{
            el.addClass('active')
            fieldContainer.show()
        }
    })
    $.monitorStates.e.on('click','.state-monitor-row-fields-container .form-control',function(e){
        e.preventDefault()
        return false
    })
    $.monitorStates.e.on('change','.json',function(e){
        var el = $(this)
        var val = el.val()
        try{
            el.css('border-color','green')
            var parsed = JSON.parse(val)
            el.val(JSON.stringify(parsed,null,3))
        }catch(err){
            el.css('border-color','red')
            return $.ccio.init('note',{title:lang['Invalid JSON'],text:lang.InvalidJSONText,type:'error'})
        }
    })
    $.monitorStates.e.on('click','.delete',function(e){
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Delete Monitor States Preset']);
        $.confirm.body.html(lang.deleteMonitorStateText1);
        $.confirm.click({title:'Delete',class:'btn-danger'},function(){
            var form = $.monitorStates.f.serializeObject()
            $.post($.ccio.init('location',$user) + $user.auth_token + '/monitorStates/' + $user.ke + '/' + form.name + '/delete',function(d){
                $.ccio.log(d)
                if(d.ok === true){
                    $.monitorStates.loadPresets()
                    $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
                }
            })
        })
    })
    $.monitorStates.e.on('click','.delete-monitor',function(e){
        var el = $(this).parents('.state-monitor-row')
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Delete Monitor State']);
        $.confirm.body.html(lang.deleteMonitorStateText2)
        $.confirm.click({title:'Delete',class:'btn-danger'},function(){
            el.remove()
        })
    })
    $.monitorStates.selector.change(function(e){
        var selected = $(this).val()
        var loaded = $.monitorStates.loaded[selected]
        var namespace = $.monitorStates.e.find('[name="name"]')
        var deleteButton = $.monitorStates.e.find('.delete')
        if(loaded){
            namespace.val(loaded.name)
            var html = ''
            $.each(loaded.details.monitors,function(n,v){
                html += $.monitorStates.drawMonitor(v)
            })
            $.monitorStates.monitors.html(html)
            deleteButton.show()
        }else{
            namespace.val('')
            $.monitorStates.monitors.empty()
            deleteButton.hide()
        }
    })
    $.monitorStates.getFormValuesFromJson = function(){
        var rows = $.monitorStates.monitors.find('.state-monitor-row')
        var monitors = []
        rows.each(function(n,v){
            var el = $(v)
            var textarea = el.find('textarea')
            try{
                var json = JSON.parse(el.find('.json').val())
                textarea.css('border-color','green')
                if(json.mid)monitors.push(json)
            }catch(err){
                textarea.css('border-color','red')
                $.ccio.init('note',{title:lang['Invalid JSON'],text:lang.InvalidJSONText,type:'error'})
            }
        })
        return monitors
    }
    $.monitorStates.getFormValues = function(){
        var rows = $.monitorStates.monitors.find('.state-monitor-row')
        var monitors = []
        rows.each(function(n,v){
            var monitorJson = {
                details: {}
            }
            var el = $(v)
            var fieldsSelcted = el.find('.list-group-item.active')
            monitorJson.mid = el.find('.state-monitor-row-select').val()
            fieldsSelcted.each(function(nn,element){
                var field = $(element)
                var name = field.attr('data-name')
                var value = field.find('.form-control').val()
                var isDetail = false
                if(name.indexOf('detail=') > -1){
                    isDetail = true
                    name = name.replace('detail=','')
                    monitorJson.details[name] = value
                }else{
                    monitorJson[name] = value
                }
            })
            if(Object.keys(monitorJson).length > 2 || Object.keys(monitorJson.details).length > 2){
                monitors.push(monitorJson)
            }
        })
        return monitors
    }
    $.monitorStates.f.submit(function(e){
        e.preventDefault()
        var el = $(this)
        var form = el.serializeObject()
        var monitors = $.monitorStates.getFormValues()
        if(form.name === ''){
            return $.ccio.init('note',{title:lang['Invalid Data'],text:lang['Name cannot be empty.'],type:'error'})
        }
        if(monitors.length === 0){
            return $.ccio.init('note',{title:lang['Invalid Data'],text:lang['Must be atleast one row'],type:'error'})
        }
        var data = {
            monitors: monitors
        }
        $.post($.ccio.init('location',$user) + $user.auth_token + '/monitorStates/' + $user.ke + '/' + form.name + '/insert',{data:data},function(d){
            $.ccio.log(d)
            if(d.ok === true){
                $.monitorStates.loadPresets(function(){
                    $.monitorStates.selector.val(form.name)
                })
                $.ccio.init('note',{title:lang.Success,text:d.msg,type:'success'})
            }
        })
        return false;
    })
})
