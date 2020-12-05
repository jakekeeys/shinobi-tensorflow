const {
    getDeviceInformation,
    setHostname,
    setPotocols,
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
            const endData = {ok: true, responses: {}}
            try{
                const groupKey = req.params.ke
                const monitorId = req.params.id
                const onvifDevice = s.group[groupKey].activeMonitors[monitorId].onvifConnection
                const form = s.getPostData(req)
                if(form.setHostname){
                    responses.setHostname = await setHostname(onvifDevice,form.setHostname)
                }
                if(form.setPotocols){
                    responses.setPotocols = await setPotocols(onvifDevice,form.setPotocols)
                }
                if(form.setGateway){
                    responses.setGateway = await setGateway(onvifDevice,form.setGateway)
                }
                if(form.setDNS){
                    responses.setDNS = await setDNS(onvifDevice,form.setDNS)
                }
                if(form.setNTP){
                    responses.setNTP = await setNTP(onvifDevice,form.setNTP)
                }
                if(form.setDateAndTime){
                    responses.setDateAndTime = await setDateAndTime(onvifDevice,form.setDateAndTime)
                }
                if(form.setVideoConfiguration){
                    responses.setVideoConfiguration = await setVideoConfiguration(onvifDevice,form.setVideoConfiguration)
                }
                if(form.setImagingSettings){
                    responses.setImagingSettings = await setImagingSettings(onvifDevice,form.setImagingSettings)
                }
            }catch(err){
                endData.ok = false
                endData.err = err
                s.debugLog(err)
            }
            s.closeJsonResponse(res,endData)
        },res,req);
    })
}
