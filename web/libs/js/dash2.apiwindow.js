$(document).ready(function(e){
    //api window
    var theWindow = $('#apis')
    var apiKeyTable = $('#api_list tbody')
    var theWindowForm = theWindow.find('form');
    var permissionSelector = theWindowForm.find('[detail="permissions"]')
    var getHumanNamesForRowDetails = function(rowDetails){
        var newDetails = ``
        $.each(rowDetails,function(key,value){
            var foundOption = permissionSelector.find(`option[value="${key}"]`)
            var label = foundOption.text()
            newDetails += `<div><i class="fa fa-${value === `1` ? `check` : `times`} text-${value === `1` ? `success` : `default`}"></i> &nbsp; ${label}</div>`
        })
        return newDetails
    }
    window.drawApiKeyRow = function(row){
        var html = `<tr api_key="${row.code}">
            <td>
                <code class="code">${row.code}</code>
                <br>
                <pre clas="time">${moment(row.time).format(`DD-MM-YYYY hh:mm:ss A`)}</pre>
                <pre>${row.ip}</pre>
                <pre>${getHumanNamesForRowDetails(row.details || {})}</pre>
            </td>
            <td class="text-center">
                <a class="delete btn btn-sm btn-danger">&nbsp;<i class="fa fa-trash"></i>&nbsp;</a>
            </td>
        </tr>`;
        apiKeyTable.prepend(html)
    }
    var writePermissionsFromFieldsToString = function(){
        var detailsElement = theWindowForm.find('[name="details"]')
        var details = JSON.parse(detailsElement.val())
        var selected = permissionSelector.val()
        permissionSelector.find('option').each(function(n,option){
            var el = $(option)
            var permissionValue = el.attr('value')
            if(el.prop('selected')){
                details[permissionValue] = "1"
            }else{
                details[permissionValue] = "0"
            }
        })
        detailsElement.val(JSON.stringify(details))
    }
    var getApiKeys = function(callback){
        $.get(getApiPrefix('api') + '/list',function(data){
            callback(data.keys)
        })
    }
    var addApiKey = function(formValues){
        var errors = []
        if(!formValues.ip||formValues.ip.length<7){
            errors.push(lang['Enter at least one IP'])
        }
        if(errors.length > 0){
            $.ccio.init('note',{title:lang['API Key Action Failed'],text:errors.join('<br>'),type:'danger'});
            return
        }
        $.each(formValues,function(n,v){
            formValues[n] = v.trim()
        })
        $.post(getApiPrefix('api') + '/add',{
            data: JSON.stringify(formValues)
        },function(data){
            if(data.ok){
                $.ccio.init('note',{title:lang['API Key Added'],text:lang.FiltersUpdatedText,type:'success'});
                drawApiKeyRow(data.api)
            }
        })
    }
    var deleteApiKey = function(code){
        $.confirm.create({
            title: lang.deleteApiKey,
            body: lang.deleteApiKeyText + '\n' + `<b>${code}</b>`,
            clickOptions: {
                title: lang.Delete,
                class: 'btn-danger'
            },
            clickCallback: function(){
                $.post(getApiPrefix('api') + '/delete',{
                    code: code
                },function(data){
                    if(data.ok){
                        $.ccio.init('note',{title:lang['API Key Deleted'],text:lang.APIKeyDeletedText,type:'notice'});
                        apiKeyTable.find('[api_key="'+code+'"]').remove()
                    }
                })
            }
        })
    }
    theWindowForm.submit(function(e){
        e.preventDefault()
        writePermissionsFromFieldsToString()
        var formValues = theWindowForm.serializeObject()
        addApiKey(formValues)
        return false;
    })
    theWindow.on('click','.delete',function(e){
        var el = $(this).parents('[api_key]')
        var code = el.attr('api_key')
        deleteApiKey(code)
    })
    theWindow.on('shown.bs.modal',function(e){
        getApiKeys(function(apiKeys){
            apiKeyTable.empty()
            $.each(apiKeys,function(n,row){
                drawApiKeyRow(row)
            })
        })
    })
})
