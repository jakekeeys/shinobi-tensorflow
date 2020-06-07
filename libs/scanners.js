var os = require('os');
var exec = require('child_process').exec;
var onvif = require("node-onvif");
module.exports = function(s,config,lang,app,io){
    const activeProbes = {}
    const runFFprobe = (url,auth,callback) => {
        var endData = {ok: false}
        if(!url){
            endData.error = 'Missing URL'
            callback(endData)
            return
        }
        if(activeProbes[auth]){
            endData.error = 'Account is already probing'
            callback(endData)
            return
        }
        activeProbes[auth] = 1
        const probeCommand = s.splitForFFPMEG(`-v quiet -print_format json -show_format -show_streams -i "${url}"`).join(' ')
        exec('ffprobe ' + probeCommand,function(err,stdout,stderr){
            delete(activeProbes[auth])
            if(err){
                endData.error = (err)
            }else{
                endData.ok = true
                endData.result = s.parseJSON(stdout)
            }
            endData.probe = probeCommand
            callback(endData)
        })
    }
    const runOnvifScanner = (options,foundCameraCallback) => {
        var ip = options.ip.replace(/ /g,'')
        var ports = options.port.replace(/ /g,'')
        if(options.ip === ''){
            var interfaces = os.networkInterfaces()
            var addresses = []
            for (var k in interfaces) {
                for (var k2 in interfaces[k]) {
                    var address = interfaces[k][k2]
                    if (address.family === 'IPv4' && !address.internal) {
                        addresses.push(address.address)
                    }
                }
            }
            const addressRange = []
            addresses.forEach(function(address){
                if(address.indexOf('0.0.0')>-1){return false}
                var addressPrefix = address.split('.')
                delete(addressPrefix[3]);
                addressPrefix = addressPrefix.join('.')
                addressRange.push(`${addressPrefix}1-${addressPrefix}254`)
            })
            ip = addressRange.join(',')
        }
        if(ports === ''){
            ports = '80,8080,8000,7575,8081,9080'
        }
        if(ports.indexOf('-') > -1){
            ports = ports.split('-')
            var portRangeStart = ports[0]
            var portRangeEnd = ports[1]
            ports = s.portRange(portRangeStart,portRangeEnd);
        }else{
            ports = ports.split(',')
        }
        var ipList = options.ipList
        var onvifUsername = options.user || ''
        var onvifPassword = options.pass || ''
        ip.split(',').forEach(function(addressRange){
            var ipRangeStart = addressRange[0]
            var ipRangeEnd = addressRange[1]
            if(addressRange.indexOf('-')>-1){
                addressRange = addressRange.split('-');
                ipRangeStart = addressRange[0]
                ipRangeEnd = addressRange[1]
            }else{
                ipRangeStart = addressRange
                ipRangeEnd = addressRange
            }
            if(!ipList){
                ipList = s.ipRange(ipRangeStart,ipRangeEnd);
            }else{
                ipList = ipList.concat(s.ipRange(ipRangeStart,ipRangeEnd))
            }
        })
        var hitList = []
        ipList.forEach((ipEntry,n) => {
            ports.forEach((portEntry,nn) => {
                hitList.push({
                    xaddr : 'http://' + ipEntry + ':' + portEntry + '/onvif/device_service',
                    user : onvifUsername,
                    pass : onvifPassword,
                    ip: ipEntry,
                    port: portEntry,
                })
            })
        })
        var responseList = []
        hitList.forEach(async (camera) => {
            try{
                var device = new onvif.OnvifDevice(camera)
                var info = await device.init()
                var date = await device.services.device.getSystemDateAndTime()
                var stream = await device.services.media.getStreamUri({
                    ProfileToken : device.current_profile.token,
                    Protocol : 'RTSP'
                })
                var cameraResponse = {
                    ip: camera.ip,
                    port: camera.port,
                    info: info,
                    date: date,
                    uri: stream.data.GetStreamUriResponse.MediaUri.Uri
                }
                responseList.push(cameraResponse)
                if(foundCameraCallback)foundCameraCallback(Object.assign(cameraResponse,{f: 'onvif'}))
            }catch(err){
                const searchError = (find) => {
                    return s.stringContains(find,err.message,true)
                }
                var foundDevice = false
                var errorMessage = ''
                switch(true){
                    //ONVIF camera found but denied access
                    case searchError('400'): //Bad Request - Sender not Authorized
                        foundDevice = true
                        errorMessage = lang.ONVIFErr400
                    break;
                    case searchError('405'): //Method Not Allowed
                        foundDevice = true
                        errorMessage = lang.ONVIFErr405
                    break;
                    //Webserver exists but undetermined if IP Camera
                    case searchError('404'): //Not Found
                        foundDevice = true
                        errorMessage = lang.ONVIFErr404
                    break;
                }
                if(foundDevice && foundCameraCallback)foundCameraCallback({
                    f: 'onvif',
                    ff: 'failed_capture',
                    ip: camera.ip,
                    port: camera.port,
                    error: errorMessage
                });
                s.debugLog(err)
            }
        })
        return responseList
    }
    const runOnvifMethod = (onvifOptions,callback) => {
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
            if(onvifOptions.auth.service){
                if(Camera.services[onvifOptions.auth.service] === undefined){
                    return errorMessage('This is not an available service. Please use one of the following : '+Object.keys(Camera.services).join(', '))
                }
                if(Camera.services[onvifOptions.auth.service] === null){
                    return errorMessage('This service is not activated. Maybe you are not connected through ONVIF. You can test by attempting to use the "Control" feature with ONVIF in Shinobi.')
                }
                action = Camera.services[onvifOptions.auth.service][onvifOptions.auth.action]
            }else{
                action = Camera[onvifOptions.auth.action]
            }
            if(!action || typeof action !== 'function'){
                errorMessage(onvifOptions.auth.action+' is not an available ONVIF function. See https://github.com/futomi/node-onvif for functions.')
            }else{
                var argNames = s.getFunctionParamNames(action)
                var options
                var command
                if(argNames[0] === 'options' || argNames[0] === 'params'){
                    options = onvifOptions.options || {}
                }
                if(onvifOptions.auth.service){
                    command = Camera.services[onvifOptions.auth.service][onvifOptions.auth.action](options)
                }else{
                    command = Camera[onvifOptions.auth.action](options)
                }
                completeAction(command)
            }
        }
        if(!s.group[onvifOptions.auth.ke].activeMonitors[onvifOptions.auth.id].onvifConnection){
            //prepeare onvif connection
            var controlURL
            var monitorConfig = s.group[onvifOptions.auth.ke].rawMonitorConfigurations[onvifOptions.auth.id]
            if(!monitorConfig.details.control_base_url||monitorConfig.details.control_base_url===''){
                controlURL = s.buildMonitorUrl(monitorConfig, true)
            }else{
                controlURL = monitorConfig.details.control_base_url
            }
            var controlURLOptions = s.cameraControlOptionsFromUrl(controlURL,monitorConfig)
            //create onvif connection
            s.group[onvifOptions.auth.ke].activeMonitors[onvifOptions.auth.id].onvifConnection = new onvif.OnvifDevice({
                xaddr : 'http://' + controlURLOptions.host + ':' + controlURLOptions.port + '/onvif/device_service',
                user : controlURLOptions.username,
                pass : controlURLOptions.password
            })
            var device = s.group[onvifOptions.auth.ke].activeMonitors[onvifOptions.auth.id].onvifConnection
            device.init().then((info) => {
                if(info)doAction(device)
            }).catch(function(error){
                return errorMessage('Device responded with an error',error)
            })
        }else{
            doAction(s.group[onvifOptions.auth.ke].activeMonitors[onvifOptions.auth.id].onvifConnection)
        }
    }
    const onWebSocketConnection = async (cn) => {
        const tx = function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
        cn.on('f',(d) => {
            switch(d.f){
                case'onvif':
                    runOnvifScanner(d,tx)
                break;
            }
        })
    }
    s.onWebSocketConnection(onWebSocketConnection)
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
    /**
    * API : FFprobe
     */
    app.get(config.webPaths.apiPrefix+':auth/probe/:ke',function (req,res){
        s.auth(req.params,function(user){
            runFFprobe(req.query.url,req.params.auth,(endData) => {
                s.closeJsonResponse(res,endData)
            })
        },res,req);
    })
}
