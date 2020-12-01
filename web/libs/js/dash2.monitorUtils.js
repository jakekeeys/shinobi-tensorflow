var popOutMonitor = function(monitorId){
    var monitor = $.ccio.mon[$user.ke + monitorId + $user.auth_token]
    var finish = function(img){
        if(monitor.popOut){
            monitor.popOut.close()
        }
        monitor.popOut = window.open(getApiPrefix() + '/embed/' + $user.ke + '/' + monitorId + '/fullscreen|jquery|relative|gui','pop_' + monitorId + $user.auth_token,'height='+img.height+',width='+img.width);
    }
    if(monitor.watch === 1){
        $.ccio.snapshot(monitor,function(url){
            $('#temp').html('<img>')
            var img=$('#temp img')[0]
            img.onload=function(){
                finish(img)
            }
            img.src=url
        })
    }else{
        var img={
            height: 720,
            width: 1280
        }
        finish(img)
    }
}
