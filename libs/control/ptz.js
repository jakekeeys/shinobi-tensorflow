var os = require('os');
var exec = require('child_process').exec;
module.exports = function(s,config,lang,app,io){
    const moveCamera = function(options){
        const device = s.group[options.ke].activeMonitors[options.id].onvifConnection
        var stopOptions = {ProfileToken : device.current_profile.token,'PanTilt': true,'Zoom': true}
        switch(options.direction){
            case'center':
                const msg =  {type:'Center button inactive'}
                s.userLog(options,msg)
                callback(msg)
            break;
            case'stopMove':
                const msg =  {type:'Control Trigger Ended'}
                s.userLog(options,msg)
                callback(msg)
                s.runOnvifMethod({
                    auth: {
                        ke: options.ke,
                        id: options.id,
                        action: 'stop',
                        service: 'ptz',
                    },
                    options: stopOptions,
                },(response) => {

                })
            break;
            default:
                var controlOptions = {
                    ProfileToken : device.current_profile.token,
                    Velocity : {}
                }
                if(options.axis){
                    options.axis.forEach((axis) => {
                        controlOptions.Velocity[axis.direction] = axis.amount
                    })
                }else{
                    var onvifDirections = {
                        "left": [-1.0,'x'],
                        "right": [1.0,'x'],
                        "down": [-1.0,'y'],
                        "up": [1.0,'y'],
                        "zoom_in": [1.0,'z'],
                        "zoom_out": [-1.0,'z']
                    }
                    var direction = onvifDirections[options.direction]
                    controlOptions.Velocity[direction[1]] = direction[0];
                }
                (['x','y','z']).forEach(function(axis){
                    if(!controlOptions.Velocity[axis])
                        controlOptions.Velocity[axis] = 0
                })
                if(monitorConfig.details.control_stop == '1'){
                    s.runOnvifMethod({
                        auth: {
                            ke: options.ke,
                            id: options.id,
                            action: 'continuousMove',
                            service: 'ptz',
                        },
                        options: controlOptions,
                    },(response) => {
                        if(response.ok){
                            s.userLog(e,{type: 'Control Trigger Started'})
                            if(controlUrlStopTimeout !== '0'){
                                setTimeout(function(){
                                    const msg =  {type: 'Control Trigger Ended'}
                                    s.userLog(e,msg)
                                    s.runOnvifMethod({
                                        auth: {
                                            ke: options.ke,
                                            id: options.id,
                                            action: 'stop',
                                            service: 'ptz',
                                        },
                                        options: stopOptions,
                                    },(response) => {
                                        if(!response.ok){
                                            console.log(error)
                                        }
                                    })
                                    callback(msg)
                                },controlUrlStopTimeout)
                            }
                        }else{
                            console.log(response)
                        }
                    })
                }else{
                    controlOptions.Speed = {'x': 1, 'y': 1, 'z': 1}
                    controlOptions.Translation = Object.assign(controlOptions.Velocity,{})
                    delete(controlOptions.Velocity)
                    s.runOnvifMethod({
                        auth: {
                            ke: e.ke,
                            id: e.id,
                            action: 'relativeMove',
                            service: 'ptz',
                        },
                        options: controlOptions,
                    },(response) => {
                        if(response.ok){
                            const msg =  {type: 'Control Triggered'}
                            s.userLog(e,msg)
                            callback(msg)
                        }else{
                            console.log(err)
                        }
                    })
                }
            break;
        }
    }
    const ptzControl = function(e,callback){
        s.checkDetails(e)
        if(!s.group[e.ke] || !s.group[e.ke].activeMonitors[e.id]){return}
        const monitorConfig = s.group[e.ke].rawMonitorConfigurations[e.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        const controlUrlStopTimeout = parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        if(monitorConfig.details.control !== "1"){
            s.userLog(e,{type:lang['Control Error'],msg:lang.ControlErrorText1});
            return
        }
        if(controlUrlStopTimeout === '0' && monitorConfig.details.control_stop === '1' && s.group[e.ke].activeMonitors[e.id].ptzMoving === true){
            e.direction = 'stopMove'
            s.group[e.ke].activeMonitors[e.id].ptzMoving = false
        }else{
            s.group[e.ke].activeMonitors[e.id].ptzMoving = true
        }
        if(controlUrlMethod === 'ONVIF'){
            try{
                //create onvif connection
                if(
                    !s.group[e.ke].activeMonitors[e.id].onvifConnection ||
                    !s.group[e.ke].activeMonitors[e.id].onvifConnection.current_profile ||
                    !s.group[e.ke].activeMonitors[e.id].onvifConnection.current_profile.token
                ){
                    const response = s.createOnvifDevice({
                        ke: e.ke,
                        id: e.id,
                    })
                    if(response.ok){
                        moveCamera({
                            ke: e.ke,
                            id: e.id,
                            direction: e.direction,
                            axis: e.axis,
                        })
                    }else{
                        s.userLog(e,{type:lang['Control Error'],msg:error})
                        console.log(error)
                    }
                }else{
                    moveCamera({
                        ke: e.ke,
                        id: e.id,
                        direction: e.direction,
                        axis: e.axis,
                    })
                }
            }catch(err){
                console.log(err)
                const msg = {type:lang['Control Error'],msg:{msg:lang.ControlErrorText2,error:err,direction:e.direction}}
                s.userLog(e,msg)
                callback(msg)
            }
        }else{
            var stopCamera = function(){
                var stopURL = controlBaseUrl + monitorConfig.details['control_url_'+e.direction+'_stop']
                var options = s.cameraControlOptionsFromUrl(stopURL,monitorConfig)
                var requestOptions = {
                    url : stopURL,
                    method : options.method,
                    auth : {
                        user : options.username,
                        pass : options.password
                    }
                }
                if(monitorConfig.details.control_digest_auth === '1'){
                    requestOptions.sendImmediately = true
                }
                request(requestOptions,function(err,data){
                    if(err){
                        const msg =  {ok:false,type:'Control Error',msg:err}
                    }else{
                        const msg =  {ok:true,type:'Control Trigger Ended'}
                    }
                    callback(msg)
                    s.userLog(e,msg);
                })
            }
            if(e.direction === 'stopMove'){
                stopCamera()
            }else{
                var requestOptions = {
                    url: controlURL,
                    method: controlURLOptions.method,
                    auth: {
                        user: controlURLOptions.username,
                        pass: controlURLOptions.password
                    }
                }
                if(monitorConfig.details.control_digest_auth === '1'){
                    requestOptions.sendImmediately = true
                }
                request(requestOptions,function(err,data){
                    if(err){
                        const msg =  {ok:false,type:'Control Error',msg:err};
                        callback(msg)
                        s.userLog(e,msg);
                        return
                    }
                    if(monitorConfig.details.control_stop=='1'&&e.direction!=='center'){
                        s.userLog(e,{type:'Control Triggered Started'});
                        if(controlUrlStopTimeout > 0){
                            setTimeout(function(){
                                stopCamera()
                            },controlUrlStopTimeout)
                        }
                    }else{
                        const msg =  {ok:true,type:'Control Triggered'};
                        callback(msg)
                        s.userLog(e,msg);
                    }
                })
            }
        }
    }
    s.cameraControl = ptzControl
}
