var fs = require("fs")
var Discord = require("discord.js")
module.exports = function(s,config,lang){
    //discord bot
    if(config.discordBot === true){
        try{
            const sendMessage = function(data,files,groupKey){
                if(!data)data = {};
                var bot = s.group[groupKey].discordBot
                if(!bot){
                    s.userLog({ke:groupKey,mid:'$USER'},{type:lang.DiscordFailedText,msg:lang.DiscordNotEnabledText})
                    return
                }
                const sendBody = Object.assign({
                    color: 3447003,
                    title: 'Alert from Shinobi',
                    description: "",
                    fields: [],
                    timestamp: new Date(),
                    footer: {
                      icon_url: config.iconURL,
                      text: "Shinobi Systems"
                    }
                },data)
                const discordChannel = bot.channels.cache.get(s.group[groupKey].init.discordbot_channel)
                if(discordChannel && discordChannel.send){
                    discordChannel.send({
                        embed: sendBody,
                        files: files
                    }).catch(err => {
                        if(err){
                            s.userLog({ke:groupKey,mid:'$USER'},{type:lang.DiscordErrorText,msg:err})
                            s.group[groupKey].discordBot = null
                            s.loadGroupApps({ke:groupKey})
                        }
                    })
                }else{
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: lang.DiscordErrorText,
                        msg: 'Check the Channel ID'
                    })
                }
            }
            const onEventTriggerBeforeFilterForDiscord = function(d,filter){
                filter.discord = true
            }
            const onEventTriggerForDiscord = async (d,filter) => {
                const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
                // d = event object
                //discord bot
                const isEnabled = monitorConfig.details.detector_discordbot === '1' || monitorConfig.details.notify_discord === '1'
                if(filter.discord && s.group[d.ke].discordBot && isEnabled && !s.group[d.ke].activeMonitors[d.id].detector_discordbot){
                    var detector_discordbot_timeout
                    if(!monitorConfig.details.detector_discordbot_timeout||monitorConfig.details.detector_discordbot_timeout===''){
                        detector_discordbot_timeout = 1000 * 60 * 10;
                    }else{
                        detector_discordbot_timeout = parseFloat(monitorConfig.details.detector_discordbot_timeout) * 1000 * 60;
                    }
                    s.group[d.ke].activeMonitors[d.id].detector_discordbot = setTimeout(function(){
                        clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_discordbot);
                        s.group[d.ke].activeMonitors[d.id].detector_discordbot = null
                    },detector_discordbot_timeout)
                    if(monitorConfig.details.detector_discordbot_send_video === '1'){
                        // change to function that captures on going video capture, waits, grabs new video file, slices portion (max for transmission) and prepares for delivery
                        s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                            sendMessage({
                                author: {
                                  name: s.group[d.ke].rawMonitorConfigurations[d.id].name,
                                  icon_url: config.iconURL
                                },
                                title: filename,
                                fields: [],
                                timestamp: d.currentTime,
                                footer: {
                                  icon_url: config.iconURL,
                                  text: "Shinobi Systems"
                                }
                            },[
                                {
                                    attachment: mergedFilepath,
                                    name: filename
                                }
                            ],d.ke)
                        })
                    }
                    const {screenShot, isStaticFile} = await s.getRawSnapshotFromMonitor(monitorConfig,{
                        secondsInward: monitorConfig.details.snap_seconds_inward
                    })
                    if(screenShot){
                        d.screenshotBuffer = screenShot
                        sendMessage({
                            author: {
                              name: s.group[d.ke].rawMonitorConfigurations[d.id].name,
                              icon_url: config.iconURL
                            },
                            title: lang.Event+' - '+d.screenshotName,
                            description: lang.EventText1+' '+d.currentTimestamp,
                            fields: [],
                            timestamp: d.currentTime,
                            footer: {
                              icon_url: config.iconURL,
                              text: "Shinobi Systems"
                            }
                        },[
                            {
                                attachment: screenShot,
                                name: d.screenshotName+'.jpg'
                            }
                        ],d.ke)
                    }
                }
            }
            const onTwoFactorAuthCodeNotificationForDiscord = function(r){
                // r = user
                if(r.details.factor_discord === '1'){
                    sendMessage({
                        author: {
                          name: r.lang['2-Factor Authentication'],
                          icon_url: config.iconURL
                        },
                        title: r.lang['Enter this code to proceed'],
                        description: '**'+s.factorAuth[r.ke][r.uid].key+'** '+r.lang.FactorAuthText1,
                        fields: [],
                        timestamp: new Date(),
                        footer: {
                          icon_url: config.iconURL,
                          text: "Shinobi Systems"
                        }
                    },[],r.ke)
                }
            }
            const loadDiscordBotForUser = function(user){
                const userDetails = s.parseJSON(user.details);
                //discordbot
                if(!s.group[user.ke].discordBot &&
                   config.discordBot === true &&
                   userDetails.discordbot === '1' &&
                   userDetails.discordbot_token !== ''
                  ){
                    s.group[user.ke].discordBot = new Discord.Client()
                    s.group[user.ke].discordBot.on('ready', () => {
                        s.userLog({
                            ke: user.ke,
                            mid: '$USER'
                        },{
                            type: lang.DiscordLoggedIn,
                            msg: s.group[user.ke].discordBot.user.tag
                        })
                    })
                    s.group[user.ke].discordBot.login(userDetails.discordbot_token)
                }
            }
            const unloadDiscordBotForUser = function(user){
                if(s.group[user.ke].discordBot && s.group[user.ke].discordBot.destroy){
                    s.group[user.ke].discordBot.destroy()
                    delete(s.group[user.ke].discordBot)
                }
            }
            const onDetectorNoTriggerTimeoutForDiscord = function(e){
                //e = monitor object
                var currentTime = new Date()
                if(e.details.detector_notrigger_discord === '1'){
                    var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
                    html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
                    html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
                    html += currentTime
                    sendMessage({
                        author: {
                          name: s.group[e.ke].rawMonitorConfigurations[e.id].name,
                          icon_url: config.iconURL
                        },
                        title: lang['\"No Motion"\ Detector'],
                        description: html,
                        fields: [],
                        timestamp: currentTime,
                        footer: {
                          icon_url: config.iconURL,
                          text: "Shinobi Systems"
                        }
                    },[],e.ke)
                }
            }
            const onMonitorUnexpectedExitForDiscord = (monitorConfig) => {
                if(monitorConfig.details.notify_discord === '1' && monitorConfig.details.notify_onUnexpectedExit === '1'){
                    const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                    const description = lang['Process Crashed for Monitor'] + '\n' + ffmpegCommand
                    const currentTime = new Date()
                    sendMessage({
                        author: {
                          name: monitorConfig.name + ' : ' + monitorConfig.mid,
                          icon_url: config.iconURL
                        },
                        title: lang['Process Unexpected Exit'] + ' : ' + monitorConfig.name,
                        description: description,
                        fields: [],
                        timestamp: currentTime,
                        footer: {
                          icon_url: config.iconURL,
                          text: "Shinobi Systems"
                        }
                    },[],monitorConfig.ke)
                }
            }
            s.loadGroupAppExtender(loadDiscordBotForUser)
            s.unloadGroupAppExtender(unloadDiscordBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForDiscord)
            s.onEventTrigger(onEventTriggerForDiscord)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForDiscord)
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForDiscord)
            s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForDiscord)
            s.definitions["Monitor Settings"].blocks["Notifications"].info[0].info.push(
                {
                   "name": "detail=notify_discord",
                   "field": "Discord",
                   "description": "",
                   "default": "0",
                   "example": "",
                   "selector": "h_det_discord",
                   "fieldType": "select",
                   "possible": [
                      {
                         "name": lang.No,
                         "value": "0"
                      },
                      {
                         "name": lang.Yes,
                         "value": "1"
                      }
                   ]
                }
            )
            s.definitions["Monitor Settings"].blocks["Notifications"].info.push({
               "evaluation": "$user.details.use_discordbot !== '0'",
               isFormGroupGroup: true,
               "name": "Discord",
               "color": "purple",
               "section-class": "h_det_discord_input h_det_discord_1",
               "info": [
                   {
                      "name": "detail=detector_discordbot_send_video",
                      "field": lang["Attach Video Clip"] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_discordbot_timeout",
                      "field": lang['Allow Next Alert'] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "10",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_notrigger_discord",
                      "field": lang['No Trigger'],
                      "description": lang.noTriggerText,
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
               ]
            })
            s.definitions["Account Settings"].blocks["2-Factor Authentication"].info.push({
                "name": "detail=factor_discord",
                "field": 'Discord',
                "default": "1",
                "example": "",
                "fieldType": "select",
                "possible": [
                   {
                      "name": lang.No,
                      "value": "0"
                   },
                   {
                      "name": lang.Yes,
                      "value": "1"
                   }
                ]
            })
            s.definitions["Account Settings"].blocks["Discord"] = {
               "evaluation": "$user.details.use_discordbot !== '0'",
               "name": "Discord",
               "color": "purple",
               "info": [
                   {
                      "name": "detail=discordbot",
                      "selector":"u_discord_bot",
                      "field": lang.Enabled,
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=discordbot_token",
                      "fieldType": "password",
                      "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXXX",
                      "field": lang.Token,
                      "form-group-class":"u_discord_bot_input u_discord_bot_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                   {
                       hidden: true,
                      "name": "detail=discordbot_channel",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["Recipient ID"],
                      "form-group-class":"u_discord_bot_input u_discord_bot_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                   }
               ]
            }
        }catch(err){
            console.log(err)
            console.log('Could not start Discord bot, please run "npm install discord.js" inside the Shinobi folder.')
        }
    }
}
