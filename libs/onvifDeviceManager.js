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
        const protocols = await getDeviceInformation(onvifDevice,{protocols: true})
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
        const networkInterfaces = await getDeviceInformation(onvifDevice,{networkInterface: true})
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
        const gatewayAddress = await getDeviceInformation(onvifDevice,{gateway: true})
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
        const dnsInfo = await getDeviceInformation(onvifDevice,{dns: true})
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
        const ntpInfo = await getDeviceInformation(onvifDevice,{ntp: true})
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
        const hostname = options.name || await getDeviceInformation(onvifDevice,{hostname: true})
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
// const setVideoConfiguration = async (onvifDevice,options) => {
//     // const options = {
//     //     name: 'user1',
//     // }
//     const response = {
//         ok: false
//     }
//     try{
//         const onvifResponse = await onvifDevice.deleteUsers({
//             'User' : [
//                 {'Username': options.name}
//             ]
//         })
//         response.ok = true
//         response.onvifResponse = onvifResponse
//     }catch(err){
//         response.error = err
//     }
//     return response
// }
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
}
