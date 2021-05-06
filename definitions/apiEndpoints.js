module.exports = (lang) => {
    return [
        {
            setName: lang.Monitors,
            apis: [
                {
                    schema: "/${API_KEY}/monitor/${GROUP_KEY}",
                    name: lang.getAllMonitors,
                    requestType: 'GET',
                },
                {
                    schema: "/${API_KEY}/monitor/${GROUP_KEY}/${MONITOR_ID}",
                    name: lang.getAMonitor,
                    requestType: 'GET',
                },
            ]
        },
        {
            setName: lang.Videos,
            apis: [
                {
                    schema: "/${API_KEY}/videos/${GROUP_KEY}",
                    name: lang.getVideos,
                    requestType: 'GET',
                },
                {
                    schema: "/${API_KEY}/videos/${GROUP_KEY}/${MONITOR_ID}",
                    name: lang.getVideosForMonitor,
                    requestType: 'GET',
                },
                {
                    schema: "/${API_KEY}/videos/${GROUP_KEY}/${MONITOR_ID}/${FILENAME}",
                    name: lang["Get a Monitor"],
                    requestType: 'GET',
                },
            ]
        },
        {
            setName: lang.Streams,
            apis: [
                {
                    schema: "/${API_KEY}/tvChannels/${GROUP_KEY}",
                    name: lang.getAllTvChannels,
                    description: lang.getAllTvChannelsText,
                    requestType: 'GET',
                },
                {
                    schema: "/${API_KEY}/tvChannels/${GROUP_KEY}/${MONITOR_ID}",
                    name: lang.getATvChannel,
                    description: lang.getATvChannelText,
                    requestType: 'GET',
                },
            ]
        },
    ]
}
