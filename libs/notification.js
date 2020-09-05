var fs = require("fs")
var Discord = require("discord.js")
var template = require("./notifications/emailTemplate.js")
module.exports = function(s,config,lang){
    const checkEmail = (email) => {
        if(email.toLowerCase().indexOf('@shinobi') > -1 && !config.allowSpammingViaEmail){
            console.log('CHANGE YOUR ACCOUNT EMAIL!')
            console.log(email + ' IS NOT ALLOWED TO BE USED')
            console.log('YOU CANNOT EMAIL TO THIS ADDRESS')
            return 'cannot@email.com'
        }
        return email
    }
    //discord bot
    if(config.discordBot === true){
        try{
            s.discordMsg = function(data,files,groupKey){
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
                // d = event object
                //discord bot
                if(filter.discord && s.group[d.ke].discordBot && d.mon.details.detector_discordbot === '1' && !s.group[d.ke].activeMonitors[d.id].detector_discordbot){
                    var detector_discordbot_timeout
                    if(!d.mon.details.detector_discordbot_timeout||d.mon.details.detector_discordbot_timeout===''){
                        detector_discordbot_timeout = 1000*60*10;
                    }else{
                        detector_discordbot_timeout = parseFloat(d.mon.details.detector_discordbot_timeout)*1000*60;
                    }
                    //lock mailer so you don't get emailed on EVERY trigger event.
                    s.group[d.ke].activeMonitors[d.id].detector_discordbot = setTimeout(function(){
                        clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_discordbot);
                        delete(s.group[d.ke].activeMonitors[d.id].detector_discordbot);
                    },detector_discordbot_timeout)
                    if(d.mon.details.detector_discordbot_send_video === '1'){
                        // change to function that captures on going video capture, waits, grabs new video file, slices portion (max for transmission) and prepares for delivery
                        s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                            s.discordMsg({
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
                    const {screenShot, isStaticFile} = await s.getRawSnapshotFromMonitor(d.mon,{
                        secondsInward: d.mon.details.snap_seconds_inward
                    })
                    if(screenShot[screenShot.length - 2] === 0xFF && screenShot[screenShot.length - 1] === 0xD9){
                        d.screenshotBuffer = screenShot
                        s.discordMsg({
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
                    s.discordMsg({
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
                    s.discordMsg({
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
            s.loadGroupAppExtender(loadDiscordBotForUser)
            s.unloadGroupAppExtender(unloadDiscordBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForDiscord)
            s.onEventTrigger(onEventTriggerForDiscord)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForDiscord)
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForDiscord)
        }catch(err){
            console.log(err)
            console.log('Could not start Discord bot, please run "npm install discord.js" inside the Shinobi folder.')
            s.discordMsg = function(){}
        }
    }
    // mailing with nodemailer
    try{
        if(config.mail){
            if(config.mail.from === undefined){config.mail.from = '"ShinobiCCTV" <no-reply@shinobi.video>'}
            s.nodemailer = require('nodemailer').createTransport(config.mail);
        }
        const onDetectorNoTriggerTimeoutForEmail = function(e){
            //e = monitor object
            if(config.mail && e.details.detector_notrigger_mail === '1'){
                s.knexQuery({
                    action: "select",
                    columns: "mail",
                    table: "Users",
                    where: [
                        ['ke','=',e.ke],
                        ['details','NOT LIKE','%"sub"%'],
                    ]
                },(err,r) => {
                    r = r[0]
                        var mailOptions = {
                            from: config.mail.from, // sender address
                            to: checkEmail(r.mail), // list of receivers
                            subject: lang.NoMotionEmailText1+' '+e.name+' ('+e.id+')', // Subject line
                            html: '<i>'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.</i>',
                        }
                        mailOptions.html+='<div><b>'+lang['Monitor Name']+' </b> : '+e.name+'</div>'
                        mailOptions.html+='<div><b>'+lang['Monitor ID']+' </b> : '+e.id+'</div>'
                        s.nodemailer.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                s.systemLog('detector:notrigger:sendMail',error)
                                s.tx({f:'error',ff:'detector_notrigger_mail',id:e.id,ke:e.ke,error:error},'GRP_'+e.ke);
                                return ;
                            }
                            s.tx({f:'detector_notrigger_mail',id:e.id,ke:e.ke,info:info},'GRP_'+e.ke);
                        })
                })
            }
        }
        const onTwoFactorAuthCodeNotificationForEmail = function(r){
            // r = user object
            if(r.details.factor_mail !== '0'){
                s.nodemailer.sendMail({
                    from: config.mail.from,
                    to: checkEmail(r.mail),
                    subject: r.lang['2-Factor Authentication'],
                    html: r.lang['Enter this code to proceed']+' <b>'+s.factorAuth[r.ke][r.uid].key+'</b>. '+r.lang.FactorAuthText1,
                }, (error, info) => {
                    if (error) {
                        s.systemLog(r.lang.MailError,error)
                        return
                    }
                })
            }
        }
        const onFilterEventForEmail = function(x,d){
            // x = filter function
            // d = filter event object
            if(x === 'email'){
                if(d.videos && d.videos.length > 0){
                    d.mailOptions = {
                        from: config.mail.from, // sender address
                        to: checkEmail(d.mail),
                        subject: lang['Filter Matches']+' : '+d.name, // Subject line
                        html: lang.FilterMatchesText1+' '+d.videos.length+' '+lang.FilterMatchesText2,
                    };
                    if(d.execute&&d.execute!==''){
                        d.mailOptions.html+='<div><b>'+lang.Executed+' :</b> '+d.execute+'</div>'
                    }
                    if(d.delete==='1'){
                        d.mailOptions.html+='<div><b>'+lang.Deleted+' :</b> '+lang.Yes+'</div>'
                    }
                    d.mailOptions.html+='<div><b>'+lang.Query+' :</b> '+d.query+'</div>'
                    d.mailOptions.html+='<div><b>'+lang['Filter ID']+' :</b> '+d.id+'</div>'
                    s.nodemailer.sendMail(d.mailOptions, (error, info) => {
                        if (error) {
                            s.tx({f:'error',ff:'filter_mail',ke:d.ke,error:error},'GRP_'+d.ke);
                            return ;
                        }
                        s.tx({f:'filter_mail',ke:d.ke,info:info},'GRP_'+d.ke);
                    })
                }
            }
        }
        const onEventTriggerBeforeFilterForEmail = function(d,filter){
            if(d.mon.details.detector_mail === '1'){
                filter.mail = true
            }else{
                filter.mail = false
            }
        }
        const onEventTriggerForEmail = async (d,filter) => {
            if(filter.mail && config.mail && !s.group[d.ke].activeMonitors[d.id].detector_mail){
                s.knexQuery({
                    action: "select",
                    columns: "mail",
                    table: "Users",
                    where: [
                        ['ke','=',d.ke],
                        ['details','NOT LIKE','%"sub"%'],
                    ]
                },async (err,r) => {
                    r = r[0];
                    var detector_mail_timeout
                    if(!d.mon.details.detector_mail_timeout||d.mon.details.detector_mail_timeout===''){
                        detector_mail_timeout = 1000*60*10;
                    }else{
                        detector_mail_timeout = parseFloat(d.mon.details.detector_mail_timeout)*1000*60;
                    }
                    //lock mailer so you don't get emailed on EVERY trigger event.
                    s.group[d.ke].activeMonitors[d.id].detector_mail = setTimeout(function(){
                        //unlock so you can mail again.
                        clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_mail);
                        delete(s.group[d.ke].activeMonitors[d.id].detector_mail);
                    },detector_mail_timeout);
                    const sendMail = function(files){
                        const infoRows = []
                        Object.keys(d.details).forEach(function(key){
                            var value = d.details[key]
                            var text = value
                            if(value instanceof Object){
                                text = JSON.stringify(value,null,3)
                            }
                            infoRows.push(template.createRow({
                                title: key,
                                text: text
                            }))
                        })
                        s.nodemailer.sendMail({
                            from: config.mail.from,
                            to: checkEmail(r.mail),
                            subject: lang.Event+' - '+d.screenshotName,
                            html: template.createFramework({
                                title: lang.EventText1 + ' ' + d.currentTimestamp,
                                subtitle: 'Shinobi Event',
                                body: infoRows.join(''),
                            }),
                            attachments: files || []
                        }, (error, info) => {
                            if (error) {
                                s.systemLog(lang.MailError,error)
                                return false;
                            }
                        })
                    }
                    if(d.mon.details.detector_mail_send_video === '1'){
                        // change to function that captures on going video capture, waits, grabs new video file, slices portion (max for transmission) and prepares for delivery
                        s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                            fs.readFile(mergedFilepath,function(err,buffer){
                                if(buffer){
                                    s.nodemailer.sendMail({
                                        from: config.mail.from,
                                        to: checkEmail(r.mail),
                                        subject: filename,
                                        html: '',
                                        attachments: [
                                            {
                                                filename: filename,
                                                content: buffer
                                            }
                                        ]
                                    }, (error, info) => {
                                        if (error) {
                                            s.systemLog(lang.MailError,error)
                                            return false;
                                        }
                                    })
                                }
                            })
                        })
                    }
                    if(!d.screenshotBuffer){
                        const {screenShot, isStaticFile} = await s.getRawSnapshotFromMonitor(d.mon,{
                            secondsInward: d.mon.details.snap_seconds_inward
                        })
                        d.screenshotBuffer = screenShot
                    }
                    sendMail([
                        {
                            filename: d.screenshotName + '.jpg',
                            content: d.screenshotBuffer
                        }
                    ])
                })
            }
        }
        s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForEmail)
        s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForEmail)
        s.onEventTrigger(onEventTriggerForEmail)
        s.onFilterEvent(onFilterEventForEmail)
        s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForEmail)
    }catch(err){
        console.log(err)
    }
}
