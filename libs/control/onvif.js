var os = require('os');
var exec = require('child_process').exec;
var onvif = require("node-onvif");
module.exports = function(s,config,lang,app,io){
    const createOnvifDevice = async (onvifAuth) => {
        var response = {ok: false}
        const monitorConfig = s.group[onvifAuth.ke].rawMonitorConfigurations[onvifAuth.id]
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        const controlURLOptions = s.cameraControlOptionsFromUrl(controlBaseUrl,monitorConfig)
        //create onvif connection
        const device = new onvif.OnvifDevice({
            xaddr : 'http://' + controlURLOptions.host + ':' + controlURLOptions.port + '/onvif/device_service',
            user : controlURLOptions.username,
            pass : controlURLOptions.password
        })
        s.group[onvifAuth.ke].activeMonitors[onvifAuth.id].onvifConnection = device
        try{
            const info = await device.init()
            response.ok = true
        }catch(err){
            response.msg = 'Device responded with an error'
            response.error = error
        }
        return response
    }
    const runOnvifMethod = (onvifOptions,callback) => {
        var onvifAuth = onvifOptions.auth
        var response = {ok: false}
        var errorMessage = function(msg,error){
            response.ok = false
            response.msg = msg
            response.error = error
            callback(response)
        }
        var actionCallback = function(onvifActionResponse){
            response.ok = true
            if(onvifActionResponse.data){
                response.responseFromDevice = onvifActionResponse.data
            }else{
                response.responseFromDevice = onvifActionResponse
            }
            if(onvifActionResponse.soap)response.soap = onvifActionResponse.soap
            callback(response)
        }
        var isEmpty = function(obj) {
            for(var key in obj) {
                if(obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        }
        var doAction = function(Camera){
            var completeAction = function(command){
                if(command && command.then){
                    command.then(actionCallback).catch(function(error){
                        errorMessage('Device Action responded with an error',error)
                    })
                }else if(command){
                    response.ok = true
                    response.repsonseFromDevice = command
                    callback(response)
                }else{
                    response.error = 'Big Errors, Please report it to Shinobi Development'
                    callback(response)
                }
            }
            var action
            if(onvifAuth.service){
                if(Camera.services[onvifAuth.service] === undefined){
                    return errorMessage('This is not an available service. Please use one of the following : '+Object.keys(Camera.services).join(', '))
                }
                if(Camera.services[onvifAuth.service] === null){
                    return errorMessage('This service is not activated. Maybe you are not connected through ONVIF. You can test by attempting to use the "Control" feature with ONVIF in Shinobi.')
                }
                action = Camera.services[onvifAuth.service][onvifAuth.action]
            }else{
                action = Camera[onvifAuth.action]
            }
            if(!action || typeof action !== 'function'){
                errorMessage(onvifAuth.action+' is not an available ONVIF function. See https://github.com/futomi/node-onvif for functions.')
            }else{
                var argNames = s.getFunctionParamNames(action)
                var options
                var command
                if(argNames[0] === 'options' || argNames[0] === 'params'){
                    options = onvifOptions.options || {}
                }
                if(onvifAuth.service){
                    command = Camera.services[onvifAuth.service][onvifAuth.action](options)
                }else{
                    command = Camera[onvifAuth.action](options)
                }
                completeAction(command)
            }
        }
        if(!s.group[onvifAuth.ke].activeMonitors[onvifAuth.id].onvifConnection){
            const response = createOnvifDevice(onvifAuth)
            if(response.ok){
                doAction(response.device)
            }else{
                errorMessage(response.msg,response.error)
            }
        }else{
            doAction(s.group[onvifAuth.ke].activeMonitors[onvifAuth.id].onvifConnection)
        }
    }
    /**
    * API : ONVIF Method Controller
     */
    app.all([
        config.webPaths.apiPrefix+':auth/onvif/:ke/:id/:action',
        config.webPaths.apiPrefix+':auth/onvif/:ke/:id/:service/:action'
    ],function (req,res){
        s.auth(req.params,function(user){
            runOnvifMethod({
                auth: {
                    ke: req.params.ke,
                    id: req.params.id,
                    auth: req.params.auth,
                    action: req.params.action,
                    service: req.params.service,
                },
                options: s.getPostData(req,'options',true) || s.getPostData(req,'params',true),
            },(endData) => {
                s.closeJsonResponse(res,endData)
            })
        },res,req);
    })
    s.createOnvifDevice = createOnvifDevice
    s.runOnvifMethod = runOnvifMethod
}
