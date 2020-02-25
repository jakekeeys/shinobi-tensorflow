var fs = require('fs');
var request = require('request');
module.exports = function(s,config,lang){
      var doRequest = function(url,method,data,callback){
        var requestEndpoint = url
        request(requestEndpoint,{
            method: method,
            form: method !== 'GET' ? (data ? data : null) : null
        }, function(err,resp,body){
            var json = s.parseJSON(body)
            if(err)console.log(err,data)
            if(callback)callback(err,json)
        })
    }
    var httpApi = function(data,callback){
        var url = `https://api.pushover.net/1/messages.json`
        doRequest(url,'POST',data,callback)
    }
    s.pushoverMessage = function(data,files,groupKey){
        if(!data)data = {};
        // if(files[0]){
        //     var file = files[0]
        //     if(file.attachment && typeof file.attachment === 'string'){
        //         data.file = file.attachment
        //     }else if(file.attachment){
        //         data.file = {
        //             name: file.name,
        //             attachment: file.attachment
        //         }
        //     }else{
        //         data.file = files[0]
        //     }
        // }
        // const data = {
        //     message: 'omg node test',
        //     title: "Well - this is fantastic",
        //     sound: 'magic',
        // }
        data.user = s.group[groupKey].pushoverUserKey
        data.token = s.group[groupKey].pushoverToken
        httpApi(data,function(err,json){
            console.log(err)
            console.log(json)
        })
    }
    var onEventTriggerBeforeFilterForPushover = function(d,filter){
        filter.pushover = true
    }
    var onEventTriggerForPushover = function(d,filter){
        // d = event object
        if(filter.pushover && s.group[d.ke].pushover && d.mon.details.detector_pushover === '1' && !s.group[d.ke].activeMonitors[d.id].detector_pushover){
            var detector_pushover_timeout
            if(!d.mon.details.detector_pushover_timeout||d.mon.details.detector_pushover_timeout===''){
                detector_pushover_timeout = 1000*60*10;
            }else{
                detector_pushover_timeout = parseFloat(d.mon.details.detector_pushover_timeout)*1000*60;
            }
            //lock mailer so you don't get emailed on EVERY trigger event.
            s.group[d.ke].activeMonitors[d.id].detector_pushover = setTimeout(function(){
                //unlock so you can mail again.
                clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_pushover);
                delete(s.group[d.ke].activeMonitors[d.id].detector_pushover);
            },detector_pushover_timeout)
            var files = []
            var sendAlert = function(){
                s.pushoverMessage({
                    title: lang.Event+' - '+d.screenshotName,
                    message: lang.EventText1+' '+d.currentTimestamp,
                },files,d.ke)
            }
            if(d.mon.details.detector_pushover_send_video === '1'){
                s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                    s.pushoverMessage({
                        message: filename,
                    },[
                        {
                            attachment: mergedFilepath,
                            name: filename
                        }
                    ],d.ke)
                })
            }
            s.getRawSnapshotFromMonitor(d.mon,{
                secondsInward: d.mon.details.snap_seconds_inward
            },function(data){
                if(data[data.length - 2] === 0xFF && data[data.length - 1] === 0xD9){
                    d.screenshotBuffer = data
                    files.push({
                        attachment: d.screenshotBuffer,
                        name: d.screenshotName+'.jpg'
                    })
                }
                sendAlert()
            })
        }
    }
    var onTwoFactorAuthCodeNotificationForPushover = function(r){
        // r = user
        if(r.details.factor_pushover === '1'){
            s.pushoverMessage({
                title: r.lang['Enter this code to proceed'],
                message: '**'+s.factorAuth[r.ke][r.uid].key+'** '+r.lang.FactorAuthText1,
            },[],r.ke)
        }
    }
    var loadPushoverForUser = function(user){
        ar=JSON.parse(user.details);
        //pushover
        if(
           ar.pushover === '1' &&
           ar.pushover_user !== '' &&
           ar.pushover_token !== ''
          ){
            s.group[user.ke].pushoverUserKey = ar.pushover_user
            s.group[user.ke].pushoverToken = ar.pushover_token
        }
    }
    var unloadPushoverForUser = function(user){
        delete(s.group[user.ke].pushoverToken)
        delete(s.group[user.ke].pushoverUserKey)
    }
    var onDetectorNoTriggerTimeoutForPushover = function(e){
        //e = monitor object
        var currentTime = new Date()
        if(e.details.detector_notrigger_pushover === '1'){
            var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
            html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
            html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
            html += currentTime
            s.pushoverMessage({
                title: lang['\"No Motion"\ Detector'],
                message: html,
            },[],e.ke)
        }
    }
    s.loadGroupAppExtender(loadPushoverForUser)
    s.unloadGroupAppExtender(unloadPushoverForUser)
    s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForPushover)
    s.onEventTrigger(onEventTriggerForPushover)
    s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForPushover)
    s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForPushover)
}
