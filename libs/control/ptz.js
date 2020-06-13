var os = require('os');
var exec = require('child_process').exec;
module.exports = function(s,config,lang,app,io){
    const moveCamera = function(options,callback){
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlStopTimeout = parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
        const device = s.group[options.ke].activeMonitors[options.id].onvifConnection
        var stopOptions = {ProfileToken : device.current_profile.token,'PanTilt': true,'Zoom': true}
        switch(options.direction){
            case'center':
                callback({type:'Center button inactive'})
            break;
            case'stopMove':
                callback({type:'Control Trigger Ended'})
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
                if(monitorConfig.details.control_stop === '1'){
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
                            if(controlUrlStopTimeout != '0'){
                                setTimeout(function(){
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
                                    callback({type: 'Control Triggered'})
                                },controlUrlStopTimeout)
                            }
                        }else{
                            s.debugLog(response)
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
                            callback({type: 'Control Triggered'})
                        }else{
                            s.debugLog(err)
                        }
                    })
                }
            break;
        }
    }
    const ptzControl = async function(e,callback){
        s.checkDetails(e)
        if(!s.group[e.ke] || !s.group[e.ke].activeMonitors[e.id]){return}
        const monitorConfig = s.group[e.ke].rawMonitorConfigurations[e.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        if(monitorConfig.details.control !== "1"){
            s.userLog(e,{type:lang['Control Error'],msg:lang.ControlErrorText1});
            return
        }
        if(monitorConfig.details.control_url_stop_timeout === '0' && monitorConfig.details.control_stop === '1' && s.group[e.ke].activeMonitors[e.id].ptzMoving === true){
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
                    const response = await s.createOnvifDevice({
                        ke: e.ke,
                        id: e.id,
                    })
                    if(response.ok){
                        moveCamera({
                            ke: e.ke,
                            id: e.id,
                            direction: e.direction,
                            axis: e.axis,
                        },callback)
                    }else{
                        s.userLog(e,{type:lang['Control Error'],msg:response.error})
                    }
                }else{
                    moveCamera({
                        ke: e.ke,
                        id: e.id,
                        direction: e.direction,
                        axis: e.axis,
                    },callback)
                }
            }catch(err){
                s.debugLog(err)
                callback({
                    type: lang['Control Error'],
                    msg: {
                        msg: lang.ControlErrorText2,
                        error: err,
                        direction: e.direction
                    }
                })
            }
        }else{
            const controlUrlStopTimeout = parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
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
                        var msg =  {ok:false,type:'Control Error',msg:err}
                    }else{
                        var msg =  {ok:true,type:'Control Trigger Ended'}
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
                        callback({ok:false,type:'Control Error',msg:err})
                        return
                    }
                    if(monitorConfig.details.control_stop == '1' && e.direction !== 'center' ){
                        s.userLog(e,{type:'Control Triggered Started'});
                        if(controlUrlStopTimeout > 0){
                            setTimeout(function(){
                                stopCamera()
                            },controlUrlStopTimeout)
                        }
                    }else{
                        callback({ok:true,type:'Control Triggered'})
                    }
                })
            }
        }
    }
    s.cameraControl = ptzControl
}
