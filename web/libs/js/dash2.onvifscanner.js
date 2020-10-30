$(document).ready(function(e){
    //onvif probe
    var onvifScannerWindow = $('#onvif_probe')
    var scanForm = onvifScannerWindow.find('form');
    var outputBlock = onvifScannerWindow.find('.onvif_result');
    var checkTimeout
    var setAsLoading = function(appearance){
        if(appearance){
            onvifScannerWindow.find('._loading').show()
            onvifScannerWindow.find('[type="submit"]').prop('disabled',true)
        }else{
            onvifScannerWindow.find('._loading').hide()
            onvifScannerWindow.find('[type="submit"]').prop('disabled',false)
        }
    }
    var drawProbeResult = function(options){
        var tempID = $.ccio.gid()
        $.oB.foundMonitors[tempID] = Object.assign({},options);
        onvifScannerWindow.find('._notfound').remove()
        setAsLoading(false)
        var info = options.error ? options.error : options.info ? $.ccio.init('jsontoblock',options.info) : ''
        var streamUrl = options.error ? '' : 'No Stream URL Found'
        var launchWebPage = `target="_blank" href="http${options.port == 443 ? 's' : ''}://${options.ip}:${options.port}"`
        if(options.uri){
            streamUrl = options.uri
        }
        $('#onvif_probe .onvif_result')[options.error ? 'append' : 'prepend'](`
            <div class="col-md-4" onvif_row="${tempID}">
                <div style="display:block" ${options.error ? launchWebPage : ''} class="card bg-default ${options.error ? '' : 'copy'}">
                    <div class="preview-image card-header" style="background-image:url(${options.snapShot ? 'data:image/png;base64,' + options.snapShot : placeholder.getData(placeholder.plcimg({text: ' ', fsize: 25, bgcolor:'#1f80f9'}))})"></div>
                    <div class="card-body" ${options.error ? '' : 'style="min-height:190px"'}>
                        <div>${info}</div>
                        <div class="url">${streamUrl}</div>
                    </div>
                    <div class="card-footer">${options.ip}:${options.port}</div>
                </div>
            </div>
        `)
    }
    scanForm.submit(function(e){
        e.preventDefault();
        $.oB.foundMonitors = {}
        var el = $(this)
        var form = el.serializeObject();
        outputBlock.empty();
        setAsLoading(true)
        $.ccio.cx({
            f: 'onvif',
            ip: form.ip,
            port: form.port,
            user: form.user,
            pass: form.pass
        });
        clearTimeout(checkTimeout)
        checkTimeout = setTimeout(function(){
            if(outputBlock.find('.card').length === 0){
                setAsLoading(false)
                outputBlock.append(`<td style="padding: 10px;" class="text-center _notfound text-white epic-text">${lang.sorryNothingWasFound}</td>`)
            }
        },5000)
        return false;
    });
    onvifScannerWindow.on('click','.copy',function(){
        $('.hidden-xs [monitor="edit"]').click();
        el = $(this).parents('[onvif_row]');
        var id = el.attr('onvif_row');
        var onvifRecord = $.oB.foundMonitors[id];
        var streamURL = onvifRecord.uri;
        if(onvifScannerWindow.find('[name="user"]').val()!==''){
            streamURL = streamURL.split('://')
            streamURL = streamURL[0]+'://'+onvifScannerWindow.find('[name="user"]').val()+':'+onvifScannerWindow.find('[name="pass"]').val()+'@'+streamURL[1];
        }
        $.aM.e.find('[detail="auto_host"]').val(streamURL).change()
        $.aM.e.find('[name="mode"]').val('start')
        onvifScannerWindow.modal('hide')
    })

    var currentOptions = $.ccio.op()
    $.each(['ip','port','user'],function(n,key){
        onvifScannerWindow.find(`[name="${key}"]`).change(function(e){
            var value = $(this).val()
            $.ccio.op(`onvif_probe_${key}`,value,{x: value ? null : 0})
        })
        if(currentOptions[`onvif_probe_${key}`]){
            onvifScannerWindow.find(`[name="${key}"]`).val(currentOptions[`onvif_probe_${key}`])
        }
    })
    delete(currentOptions)

    $.oB = {}
    $.oB.drawProbeResult = drawProbeResult
    $.oB.e = onvifScannerWindow
})
