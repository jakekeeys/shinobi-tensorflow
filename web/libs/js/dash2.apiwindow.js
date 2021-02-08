$(document).ready(function(e){
    //api window
    var theWindow = $('#apis')
    var apiKeyTable = $('#api_list')
    var theWindowForm = theWindow.find('form');
    window.drawApiKeyRow = function(row){
        var html = '<tr api_key="'+row.code+'"><td class="code">'+row.code+'</td><td class="ip">'+row.ip+'</td><td class="time">'+row.time+'</td><td class="text-right"><a class="delete btn btn-xs btn-danger">&nbsp;<i class="fa fa-trash"></i>&nbsp;</a></td></tr>';
        apiKeyTable.prepend(html)
    }
    var getApiKeys = function(callback){
        $.get(getApiPrefix('api') + '/list',function(data){
            callback(data.keys)
        })
    }
    theWindowForm.find('[detail]').change($.ccio.form.details).first().change();
    theWindowForm.submit(function(e){
        e.preventDefault();
        var el = $(this)
        var formValues = el.serializeObject();
        var errors = []
        if(!formValues.ip||formValues.ip.length<7){
            errors.push(lang['Enter at least one IP'])
        }
        if(errors.length > 0){
            theWindow.find('.msg').html(errors.join('<br>'));
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
    });
    theWindow.on('click','.delete',function(e){
        var el = $(this).parents('[api_key]')
        var code = el.attr('api_key');
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
    })
    theWindow.on('shown.bs.modal',function(e){
        getApiKeys(function(apiKeys){
            $.each(apiKeys,function(n,row){
                drawApiKeyRow(row)
            })
        })
    })
})
