$(document).ready(function(e){
    //probe
    var probeWindow = $('#probe')
    var probeForm = probeWindow.find('form')
    var outputView = probeWindow.find('.output_data')
    var setAsLoading = function(appearance){
        if(appearance){
            probeWindow.find('._loading').show()
            outputView.empty()
            probeWindow.find('.stop').show()
            probeWindow.find('[type="submit"]').hide()
        }else{
            probeWindow.find('._loading').hide()
            outputView.append('<div><b>END</b></div>')
            probeWindow.find('.stop').hide()
            probeWindow.find('[type="submit"]').show()
        }
    }
    probeForm.submit(function(e){
        e.preventDefault()
        setAsLoading(true)
        var el = $(this)
        var form = el.serializeObject()
        var flags = ''
        var url = form.url.trim()
        switch(form.mode){
            case'json':
                flags = '-v quiet -print_format json -show_format -show_streams'
            break;
        }
    //    if(url.indexOf('{{JSON}}')>-1){
    //        url='-v quiet -print_format json -show_format -show_streams '+url
    //    }
        $.get(`${getApiPrefix()}/probe/${$user.ke}?url=${encodeURIComponent(`'${url}'`)}&flags=${flags}`,function(data){
            if(data.ok === true){
                var html
                try{
                    html = $.ccio.init('jsontoblock',JSON.parse(data.result))
                }catch(err){
                    html = data.result
                }
                outputView.append(html)
            }else{
                $.ccio.init('note',{title:'Failed to Probe',text:data.error,type:'error'});
            }
            setAsLoading(false)
        })
        return false;
    });
    probeWindow.on('hidden.bs.modal',function(){
        outputView.empty()
    })
    probeWindow.find('.stop').click(function(e){
        el = $(this)
       // $.ccio.cx({f:'ffprobe',ff:'stop'})
    })
    $.pB = {
        submit: function(url,show){
            probeWindow.find('[name="url"]').val(url)
            probeForm.submit()
            if(show)probeWindow.modal('show')
        },
        writeData: function(jsonString){
            outputView.append($.ccio.init('jsontoblock',JSON.parse(jsonString)))
        },
        setAsLoading: setAsLoading
    }
})
