const {
    mergeDeep
} = require('./common.js')
const getDeviceInformation = async (onvifDevice,options) => {
    // const options = {
    //     protocols: true,
    //     networkInterface: true,
    //     gateway: true,
    //     dns: true,
    //     ntp: true,
    // }
    const response = {
        ok: true,
    }
    try{
        if(options.protocols){
            response.protocols = await onvifDevice.getNetworkProtocols().GetNetworkProtocolsResponse.NetworkProtocols
        }
        if(options.networkInterface){
            response.networkInterface = await onvifDevice.getNetworkInterfaces().GetNetworkInterfacesResponse.NetworkInterfaces
        }
        if(options.gatewayAddress){
            response.gateway = await onvifDevice.getNetworkDefaultGateway().GetNetworkDefaultGatewayResponse.NetworkGateway.IPv4Address
        }
        if(options.dns){
            response.dns = await onvifDevice.getDNS().GetDNSResponse.DNSInformation
        }
        if(options.ntp){
            response.ntp = await onvifDevice.getNTP().GetNTPResponse.NTPInformation
        }
        if(options.date){
            response.date = await onvifDevice.getSystemDateAndTime().GetSystemDateAndTimeResponse.SystemDateAndTime
        }
        if(options.users){
            response.users = await onvifDevice.getUsers().GetUsersResponse.User
        }
        if(options.hostname){
            response.hostname = await onvifDevice.getHostname().GetHostnameResponse.HostnameInformation.Name
        }
        if(options.videoEncoders){
            response.videoEncoders = await onvifDevice.getVideoEncoderConfigurations().GetVideoEncoderConfigurationsResponse.Configurations
        }
        if(options.videoEncoderOptions){
            response.videoEncoderOptions = await onvifDevice.getVideoEncoderConfigurationOptions().GetVideoEncoderConfigurationOptionsResponse.Options
        }
    }catch(err){
        response.ok = false
        response.error = err
    }
    return response
}
const setPotocols = async (onvifDevice,saveSet) => {
    // const saveSet = [
    //     {'Name': 'HTTP', 'Enabled': true, 'Port': 80},
    //     {'Name': 'RTSP', 'Enabled': true, 'Port': 554},
    //   ]
    const response = {
        ok: false
    }
    try{
        const protocols = await getDeviceInformation(onvifDevice,{protocols: true}).protocols
        protocols.forEach((item) => {
            saveSet.forEach((saveItem) => {
                if(item.Name === saveItem.Name.toUpperCase()){
                    item.Port = `${saveItem.Port}`
                    item.Enabled = `${saveItem.Enabled ? 'true' : 'false'}`
                }
            })
        })
        const onvifResponse = await onvifDevice.setNetworkProtocols({
            NetworkProtocols: protocols
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const setNetworkInterface = async (onvifDevice,options) => {
    // const options = {
    //     interface: 'eth0',
    //     ipv4: '10.1.103.158',
    //     dhcp: false,
    // }
    const response = {
        ok: false
    }
    try{
        const networkInterfaces = await getDeviceInformation(onvifDevice,{networkInterface: true}).networkInterface
        const onvifResponse = await onvifDevice.setNetworkInterfaces ({
            SetNetworkInterfaces: {
                InterfaceToken: options.interface || networkInterfaces.$.token,
                NetworkInterface: {
                    Enabled: true,
                    IPv4: {
                        Enabled: true,
                        Manual: {
                            Address: options.ipv4 || networkInterfaces.IPv4.Config.Manual.Address,
                            PrefixLength: '24',
                        },
                        'DHCP': options.dhcp === undefined || options.dhcp === null ? networkInterfaces.IPv4.Config.DHCP === 'true' ? true : false : options.dhcp,
                    }
                }
            }
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const setGateway = async (onvifDevice,options) => {
    // const options = {
    //     ipv4: '1.1.1.1,8.8.8.8',
    // }
    const response = {
        ok: false
    }
    try{
        const gatewayAddress = await getDeviceInformation(onvifDevice,{gateway: true}).gateway
        const onvifResponse = await onvifDevice.setNetworkDefaultGateway({
            'NetworkGateway': [
              {'IPv4Address': options.ipv4 || gatewayAddress}
            ]
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const setDNS = async (onvifDevice,options) => {
    // const options = {
    //     dns: '1.1.1.1,8.8.8.8',
    //     searchDomain: '',
    //     dhcp: false,
    // }
    const response = {
        ok: false
    }
    try{
        const dnsArray = []
        const searchDomain = (options.searchDomain || '').split(',')
        const dnsList = (options.dns || '1.1.1.1').split(',')
        dnsList.forEach((item) => {
            dnsArray.push({
                Type: 'IPv4',
                IPv4Address: item,
            })
        })
        const dnsInfo = await getDeviceInformation(onvifDevice,{dns: true}).dns
        const onvifResponse = await onvifDevice.setDNS({
          'FromDHCP'    : !options.dhcp ? false : true,
          'SearchDomain': searchDomain,
          'DNSManual'   : dnsArray
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const setNTP = async (onvifDevice,options) => {
    // const options = {
    //     ipv4: '1.1.1.1,8.8.8.8',
    //     dhcp: false,
    // }
    const response = {
        ok: false
    }
    try{
        const ntpInfo = await getDeviceInformation(onvifDevice,{ntp: true}).ntp
        const ipv4 = options.ipv4 || ntpInfo.NTPManual.IPv4Address
        const onvifResponse = await onvifDevice.setNTP({
            FromDHCP: !options.dhcp ? false : true,
            NTPManual: {'Type': "IPv4", 'IPv4Address': ipv4}
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const setHostname = async (onvifDevice,options) => {
    // const options = {
    //     name: 'hostname',
    // }
    const response = {
        ok: false
    }
    try{
        const hostname = options.name || await getDeviceInformation(onvifDevice,{hostname: true}).hostname
        const onvifResponse = await onvifDevice.setHostname({
            Name: hostname
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const rebootCamera = async (onvifDevice,options) => {
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.reboot()
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const setDateAndTime = async (onvifDevice,options) => {
    // const options = {
    //     ntp: false,
    //     daylightSavings: false,
    // }
    const response = {
        ok: false
    }
    try{
        // const dateInfo = await onvifDevice.getSystemDateAndTime().GetSystemDateAndTimeResponse.SystemDateAndTime
        const onvifResponse = await onvifDevice.setSystemDateAndTime ({
            DateTimeType: options.ntp ? "NTP" : "Manual",
            DaylightSavings: !options.daylightSavings ? false : true,
            TimeZone: options.timezone,
            UTCDateTime: options.utcDateTime,
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const createUser = async (onvifDevice,options) => {
    // const options = {
    //     name: 'user1',
    //     password: '123',
    //     level: 'Administrator' || 'Operator' || 'User',
    // }
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.createUsers({
            'User' : [
                {'Username': options.name, 'Password' : options.password, 'UserLevel': options.level}
            ]
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const deleteUser = async (onvifDevice,options) => {
    // const options = {
    //     name: 'user1',
    // }
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.deleteUsers({
            'User' : [
                {'Username': options.name}
            ]
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
const validateEncoderOptions = (chosenOptions, videoEncoderOptions) => {
    const resolutions = []
    const minQuality = parseInt(videoEncoderOptions.QualityRange.Min) || 1
    const maxQuality = parseInt(videoEncoderOptions.QualityRange.Max) || 6
    const quality = !isNaN(chosenOptions.quality) ? parseInt(chosenOptions.quality) : 1
    const minGovLength = parseInt(videoEncoderOptions.H264.GovLengthRange.Min) || 0
    const maxGovLength = parseInt(videoEncoderOptions.H264.GovLengthRange.Max) || 100
    const govLength = !isNaN(chosenOptions.h264.govLength) ? parseInt(chosenOptions.h264.govLength) : 10
    const minFrameRateLimit = parseInt(videoEncoderOptions.H264.FrameRateRange.Min) || 1
    const maxFrameRateLimit = parseInt(videoEncoderOptions.H264.FrameRateRange.Max) || 30
    const frameRateLimit = !isNaN(chosenOptions.rateControl.frameRateLimit) ? parseInt(chosenOptions.rateControl.frameRateLimit) : 15
    const minEncodingInterval = parseInt(videoEncoderOptions.H264.EncodingIntervalRange.Min) || 1
    const maxEncodingInterval = parseInt(videoEncoderOptions.H264.EncodingIntervalRange.Max) || 30
    const encodingInterval = !isNaN(chosenOptions.rateControl.encodingInterval) ? parseInt(chosenOptions.rateControl.encodingInterval) : 1
    videoEncoderOptions.H264.ResolutionsAvailable.forEach((resolution) => {
        resolutions.push(`${resolution.Width}x${resolution.Height}`)
    })
    if(resolutions.indexOf(`${chosenOptions.resolution.width}x${chosenOptions.resolution.height}`) > -1){
        chosenOptions.resolution.width = resolution[0].Width
        chosenOptions.resolution.height = resolution[0].Height
    }
    if(quality < minQuality || quality > maxQuality){
        chosenOptions.quality = 1
    }
    if(govLength < minGovLength || govLength > maxGovLength){
        chosenOptions.h264.govLength = 10
    }
    if(frameRateLimit < minFrameRateLimit || frameRateLimit > maxFrameRateLimit){
        chosenOptions.rateControl.frameRateLimit = 15
    }
    if(encodingInterval < minEncodingInterval || encodingInterval > maxEncodingInterval){
        chosenOptions.rateControl.encodingInterval = 1
    }
}
const setVideoConfiguration = async (onvifDevice,options) => {
    const response = {
        ok: false
    }
    try{
        const {
            videoEncoders,
            videoEncoderOptions
        } = await getDeviceInformation(onvifDevice,{
            videoEncoders: true,
            videoEncoderOptions: true
        })
        const videoEncoderIndex = {}
        videoEncoders.forEach((encoder) => {videoEncoderIndex[encoder.$.token] = encoder})
        const chosenToken = `${options.token || videoEncoders[0].$.token}`
        const videoEncoder = videoEncoderIndex[chosenToken]
        const onvifParams = mergeDeep({
            name: videoEncoder.Name,
            encoding: videoEncoder.Encoding,
            resolution: {
                width: videoEncoder.Resolution.Width,
                height: videoEncoder.Resolution.Height,
            },
            quality: videoEncoder.Quality,
            rateControl: {
                frameRateLimit: videoEncoder.RateControl.FrameRateLimit,
                encodingInterval: videoEncoder.RateControl.EncodingInterval,
                bitrateLimit: videoEncoder.RateControl.BitrateLimit,
            },
            multicast: {
                address: {
                    type: videoEncoder.Multicast.Address.Type,
                    ipv4Address: videoEncoder.Multicast.Address.IPv4Address,
                },
                port: videoEncoder.Multicast.Port,
                ttl: videoEncoder.Multicast.TTL,
                autoStart: videoEncoder.Multicast.AutoStart,
            },
            sessionTimeout: videoEncoder.SessionTimeout,
            h264: {
                govLength: videoEncoder.H264.GovLength,
                h264Profile: videoEncoder.H264.H264Profile,
            }
        },options,{
            multicast: {
                autoStart: !options.multicast.autoStart ? 'false' : 'true'
            },
            token: undefined
        })
        const validatedEncoderOptions = validateEncoderOptions(onvifParams, videoEncoderOptions)
        const onvifResponse = await onvifDevice.setVideoEncoderConfiguration(chosenToken, onvifParams)
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err
    }
    return response
}
module.exports = {
    getDeviceInformation: getDeviceInformation,
    setHostname: setHostname,
    setPotocols: setPotocols,
    setGateway: setGateway,
    setDNS: setDNS,
    setNTP: setNTP,
    rebootCamera: rebootCamera,
    setDateAndTime: setDateAndTime,
    createUser: createUser,
    deleteUser: deleteUser,
    setVideoConfiguration: setVideoConfiguration,
}
