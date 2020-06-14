var os = require('os');
var exec = require('child_process').exec;
module.exports = function(s,config,lang,app,io){
    const moveLock = {}
    const startMove = async function(options,callback){
        const device = s.group[options.ke].activeMonitors[options.id].onvifConnection
        if(!device){
            const response = await s.createOnvifDevice({
                ke: options.ke,
                id: options.id,
            })
            const device = s.group[options.ke].activeMonitors[options.id].onvifConnection
        }
        options.controlOptions.ProfileToken = device.current_profile.token
        s.runOnvifMethod({
            auth: {
                ke: options.ke,
                id: options.id,
                action: 'continuousMove',
                service: 'ptz',
            },
            options: options.controlOptions,
        },callback)
    }
    const stopMove = function(options,callback){
        const device = s.group[options.ke].activeMonitors[options.id].onvifConnection
        s.runOnvifMethod({
            auth: {
                ke: options.ke,
                id: options.id,
                action: 'stop',
                service: 'ptz',
            },
            options: {
                'PanTilt': true,
                'Zoom': true,
                ProfileToken: device.current_profile.token
            },
        },callback)
    }
    const moveOnvifCamera = function(options,callback){
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlStopTimeout = parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
        switch(options.direction){
            case'center':
                callback({type:'Center button inactive'})
            break;
            case'stopMove':
                callback({type:'Control Trigger Ended'})
                stopMove({
                    ke: options.ke,
                    id: options.id,
                },(response) => {

                })
            break;
            default:
            try{
                var controlOptions = {
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
                    controlOptions.Velocity[direction[1]] = direction[0]
                }
                (['x','y','z']).forEach(function(axis){
                    if(!controlOptions.Velocity[axis])
                        controlOptions.Velocity[axis] = 0
                })
                if(monitorConfig.details.control_stop === '1'){
                    startMove({
                        ke: options.ke,
                        id: options.id,
                        controlOptions: controlOptions
                    },(response) => {
                        if(response.ok){
                            if(controlUrlStopTimeout != '0'){
                                setTimeout(function(){
                                    stopMove({
                                        ke: options.ke,
                                        id: options.id,
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
                            ke: options.ke,
                            id: options.id,
                            action: 'relativeMove',
                            service: 'ptz',
                        },
                        options: controlOptions,
                    },(response) => {
                        if(response.ok){
                            callback({type: 'Control Triggered'})
                        }else{
                            callback({type: 'Control Triggered', error: response.error})
                        }
                    })
                }
            }catch(err){
                console.log(err)
                console.log(new Error())
            }
            break;
        }
    }
    const ptzControl = async function(options,callback){
        if(!s.group[options.ke] || !s.group[options.ke].activeMonitors[options.id]){return}
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        if(monitorConfig.details.control !== "1"){
            s.userLog(e,{type:lang['Control Error'],msg:lang.ControlErrorText1});
            return
        }
        if(monitorConfig.details.control_url_stop_timeout === '0' && monitorConfig.details.control_stop === '1' && s.group[options.ke].activeMonitors[options.id].ptzMoving === true){
            options.direction = 'stopMove'
            s.group[options.ke].activeMonitors[options.id].ptzMoving = false
        }else{
            s.group[options.ke].activeMonitors[options.id].ptzMoving = true
        }
        if(controlUrlMethod === 'ONVIF'){
            try{
                //create onvif connection
                if(
                    !s.group[options.ke].activeMonitors[options.id].onvifConnection ||
                    !s.group[options.ke].activeMonitors[options.id].onvifConnection.current_profile ||
                    !s.group[options.ke].activeMonitors[options.id].onvifConnection.current_profile.token
                ){
                    const response = await s.createOnvifDevice({
                        ke: options.ke,
                        id: options.id,
                    })
                    if(response.ok){
                        moveOnvifCamera({
                            ke: options.ke,
                            id: options.id,
                            direction: options.direction,
                            axis: options.axis,
                        },(msg) => {
                            msg.msg = options.direction
                            callback(msg)
                        })
                    }else{
                        s.userLog(e,{type:lang['Control Error'],msg:response.error})
                    }
                }else{
                    moveOnvifCamera({
                        ke: options.ke,
                        id: options.id,
                        direction: options.direction,
                        axis: options.axis,
                    },(msg) => {
                        if(!msg.msg)msg.msg = {direction: options.direction}
                        callback(msg)
                    })
                }
            }catch(err){
                s.debugLog(err)
                callback({
                    type: lang['Control Error'],
                    msg: {
                        msg: lang.ControlErrorText2,
                        error: err,
                        direction: options.direction
                    }
                })
            }
        }else{
            const controlUrlStopTimeout = parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
            var stopCamera = function(){
                var stopURL = controlBaseUrl + monitorConfig.details[`control_url_${options.direction}_stop`]
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
            if(options.direction === 'stopMove'){
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
                    if(monitorConfig.details.control_stop == '1' && options.direction !== 'center' ){
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
    return {
        control: ptzControl,
        startMove: startMove,
        stopMove: stopMove,
    }
}
