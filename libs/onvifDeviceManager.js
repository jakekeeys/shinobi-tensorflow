const {
    getDeviceInformation,
    setHostname,
    setProtocols,
    setGateway,
    setDNS,
    setNTP,
    rebootCamera,
    setDateAndTime,
    createUser,
    deleteUser,
    setVideoConfiguration,
    setNetworkInterface,
    setImagingSettings,
    setDiscoveryMode,
    getUIFieldValues,
} = require('./onvifDeviceManager/utils.js')

module.exports = function(s,config,lang,app,io){
    /**
    * API : Get ONVIF Data from Camera
     */
    app.get(config.webPaths.apiPrefix+':auth/onvifDeviceManager/:ke/:id',function (req,res){
        s.auth(req.params,async (user) => {
            const endData = {ok: true}
            try{
                const groupKey = req.params.ke
                const monitorId = req.params.id
                const onvifDevice = s.group[groupKey].activeMonitors[monitorId].onvifConnection
                const cameraInfo = await getUIFieldValues(onvifDevice)
                endData.onvifData = cameraInfo
            }catch(err){
                endData.ok = false
                endData.err = err
                s.debugLog(err)
            }
            s.closeJsonResponse(res,endData)
        },res,req);
    })
    /**
    * API : Save ONVIF Data to Camera
     */
    app.post(config.webPaths.apiPrefix+':auth/onvifDeviceManager/:ke/:id/save',function (req,res){
        s.auth(req.params,async (user) => {
            const endData = {ok: true}
            const responses = {}
            try{
                const groupKey = req.params.ke
                const monitorId = req.params.id
                const onvifDevice = s.group[groupKey].activeMonitors[monitorId].onvifConnection
                const form = s.getPostData(req)
                const videoToken = form.VideoConfiguration && form.VideoConfiguration.videoToken ? form.VideoConfiguration.videoToken : null
                if(form.DateandTime){
                    const dateAndTime = form.DateandTime
                    if(dateAndTime.setNTP){
                        responses.setNTP = await setNTP(onvifDevice,dateAndTime.setNTP)
                    }
                    responses.setDateAndTime = await setDateAndTime(onvifDevice,dateAndTime)
                }
                if(form.Imaging){
                    responses.setImagingSettings = await setImagingSettings(onvifDevice,Object.assign({videoToken: videoToken},form.Imaging))
                }
                if(form.Network){
                    const network = form.Network
                    if(network.setHostname){
                        responses.setHostname = await setHostname(onvifDevice,network.setHostname)
                    }
                    if(network.setProtocols){
                        responses.setProtocols = await setProtocols(onvifDevice,network.setProtocols)
                    }
                    if(network.setGateway){
                        responses.setGateway = await setGateway(onvifDevice,network.setGateway)
                    }
                    if(network.setDNS){
                        responses.setDNS = await setDNS(onvifDevice,network.setDNS)
                    }
                    if(network.setNetworkInterface){
                        responses.setNetworkInterface = await setNetworkInterface(onvifDevice,network.setNetworkInterface)
                    }
                }
                if(form.VideoConfiguration){
                    responses.VideoConfiguration = await setVideoConfiguration(onvifDevice,form.VideoConfiguration)
                }
            }catch(err){
                endData.ok = false
                endData.err = err
                s.debugLog(err)
                s.debugLog(responses)
            }
            endData.responses = responses
            s.closeJsonResponse(res,endData)
        },res,req);
    })
    /**
    * API : Reboot Camera
     */
    app.get(config.webPaths.apiPrefix+':auth/onvifDeviceManager/:ke/:id/reboot',function (req,res){
        s.auth(req.params,async (user) => {
            const endData = {ok: true}
            try{
                const groupKey = req.params.ke
                const monitorId = req.params.id
                const onvifDevice = s.group[groupKey].activeMonitors[monitorId].onvifConnection
                const cameraInfo = await rebootCamera(onvifDevice)
                endData.onvifData = cameraInfo
            }catch(err){
                endData.ok = false
                endData.err = err
                s.debugLog(err)
            }
            s.closeJsonResponse(res,endData)
        },res,req);
    })
}
