var fs = require("fs")
module.exports = function(s,config,lang){
    //telegram bot
    if(config.telegramBot === true){
        const TelegramBot = require('node-telegram-bot-api');
        try{
            const sendMessage = async function(sendBody,files,groupKey){
                var bot = s.group[groupKey].telegramBot
                if(!bot){
                    s.userLog({ke:groupKey,mid:'$USER'},{type:lang.NotifyErrorText,msg:lang.DiscordNotEnabledText})
                    return
                }
                const chatId = s.group[groupKey].init.telegrambot_channel
                if(bot && bot.sendMessage){
                    try{
                        await bot.sendMessage(chatId, `${sendBody.title}${sendBody.description ? '\n' + sendBody.description : ''}`)
                        if(files){
                            files.forEach(async (file) => {
                                switch(file.type){
                                    case'video':
                                        await bot.sendVideo(chatId, file.attachment)
                                    break;
                                    case'photo':
                                        await bot.sendPhoto(chatId, file.attachment)
                                    break;
                                }
                            })
                        }
                    }catch(err){
                        s.userLog({ke:groupKey,mid:'$USER'},{type:lang.NotifyErrorText,msg:err})
                    }
                }else{
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: lang.NotifyErrorText,
                        msg: lang["Check the Recipient ID"]
                    })
                }
            }
            const onEventTriggerBeforeFilterForTelegram = function(d,filter){
                filter.telegram = true
            }
            const onEventTriggerForTelegram = async (d,filter) => {
                const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
                // d = event object
                //telegram bot
                if(filter.telegram && s.group[d.ke].telegramBot && monitorConfig.details.notify_telegram === '1' && !s.group[d.ke].activeMonitors[d.id].detector_telegrambot){
                    var detector_telegrambot_timeout
                    if(!monitorConfig.details.detector_telegrambot_timeout||monitorConfig.details.detector_telegrambot_timeout===''){
                        detector_telegrambot_timeout = 1000 * 60 * 10;
                    }else{
                        detector_telegrambot_timeout = parseFloat(monitorConfig.details.detector_telegrambot_timeout) * 1000 * 60;
                    }
                    s.group[d.ke].activeMonitors[d.id].detector_telegrambot = setTimeout(function(){
                        clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_telegrambot);
                        s.group[d.ke].activeMonitors[d.id].detector_telegrambot = null
                    },detector_telegrambot_timeout)
                    if(monitorConfig.details.detector_telegrambot_send_video === '1'){
                        // change to function that captures on going video capture, waits, grabs new video file, slices portion (max for transmission) and prepares for delivery
                        s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                            sendMessage({
                                title: filename,
                            },[
                                {
                                    type: 'video',
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
                            title: lang.Event+' - '+d.screenshotName,
                            description: lang.EventText1+' '+d.currentTimestamp,
                        },[
                            {
                                type: 'photo',
                                attachment: screenShot,
                                name: d.screenshotName+'.jpg'
                            }
                        ],d.ke)
                    }
                }
            }
            const onTwoFactorAuthCodeNotificationForTelegram = function(r){
                // r = user
                if(r.details.factor_telegram === '1'){
                    sendMessage({
                        title: r.lang['Enter this code to proceed'],
                        description: '**'+s.factorAuth[r.ke][r.uid].key+'** '+r.lang.FactorAuthText1,
                    },[],r.ke)
                }
            }
            const loadTelegramBotForUser = function(user){
                const userDetails = s.parseJSON(user.details);
                //telegrambot
                if(!s.group[user.ke].telegramBot &&
                   config.telegramBot === true &&
                   userDetails.telegrambot === '1' &&
                   userDetails.telegrambot_token !== ''
                  ){
                    s.group[user.ke].telegramBot = new TelegramBot(userDetails.telegrambot_token, {polling: false});
                }
            }
            const unloadTelegramBotForUser = function(user){
                if(s.group[user.ke].telegramBot && s.group[user.ke].telegramBot.destroy){
                    s.group[user.ke].telegramBot.destroy()
                }
                delete(s.group[user.ke].telegramBot)
            }
            const onDetectorNoTriggerTimeoutForTelegram = function(e){
                //e = monitor object
                var currentTime = new Date()
                if(e.details.detector_notrigger_telegram === '1'){
                    var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
                    html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
                    html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
                    html += currentTime
                    sendMessage({
                        title: lang['\"No Motion"\ Detector'],
                        description: html,
                    },[],e.ke)
                }
            }
            const onMonitorUnexpectedExitForTelegram = (monitorConfig) => {
                if(monitorConfig.details.notify_telegram === '1' && monitorConfig.details.notify_onUnexpectedExit === '1'){
                    const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                    const description = lang['Process Crashed for Monitor'] + '\n' + ffmpegCommand
                    const currentTime = new Date()
                    sendMessage({
                        title: lang['Process Unexpected Exit'] + ' : ' + monitorConfig.name,
                        description: description,
                    },[],monitorConfig.ke)
                }
            }
            s.loadGroupAppExtender(loadTelegramBotForUser)
            s.unloadGroupAppExtender(unloadTelegramBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForTelegram)
            s.onEventTrigger(onEventTriggerForTelegram)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForTelegram)
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForTelegram)
            s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForTelegram)
            s.definitions["Monitor Settings"].blocks["Notifications"].info[0].info.push(
                {
                   "name": "detail=notify_telegram",
                   "field": "Telegram",
                   "description": "",
                   "default": "0",
                   "example": "",
                   "selector": "h_det_telegram",
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
            )
            s.definitions["Monitor Settings"].blocks["Notifications"].info.push({
               "evaluation": "$user.details.use_telegrambot !== '0'",
               isFormGroupGroup: true,
               "name": "Telegram",
               "color": "blue",
               "section-class": "h_det_telegram_input h_det_telegram_1",
               "info": [
                   {
                      "name": "detail=detector_telegrambot_send_video",
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
                      "name": "detail=detector_telegrambot_timeout",
                      "field": lang['Allow Next Alert'] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "10",
                      "example": "",
                      "possible": ""
                   },
               ]
            })
            s.definitions["Account Settings"].blocks["2-Factor Authentication"].info.push({
                "name": "detail=factor_telegram",
                "field": 'Telegram',
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
            s.definitions["Account Settings"].blocks["Telegram"] = {
               "evaluation": "$user.details.use_telegrambot !== '0'",
               "name": "Telegram",
               "color": "blue",
               "info": [
                   {
                      "name": "detail=telegrambot",
                      "selector":"u_telegram_bot",
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
                      "name": "detail=telegrambot_token",
                      "fieldType": "password",
                      "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXXX",
                      "field": lang.Token,
                      "form-group-class":"u_telegram_bot_input u_telegram_bot_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                   {
                       hidden: true,
                      "name": "detail=telegrambot_channel",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["Recipient ID"],
                      "form-group-class":"u_telegram_bot_input u_telegram_bot_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                   }
               ]
            }
        }catch(err){
            console.log(err)
            console.log('Could not start Telegram bot, please run "npm install node-telegram-bot-api" inside the Shinobi folder.')
        }
    }
}
