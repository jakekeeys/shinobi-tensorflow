var fs = require('fs');
module.exports = function(s,config,lang){
    //Wasabi Hot Cloud Storage
    var beforeAccountSaveForWasabiHotCloudStorage = function(d){
        //d = save event
        d.form.details.whcs_use_global=d.d.whcs_use_global
        d.form.details.use_whcs=d.d.use_whcs
    }
    var cloudDiskUseStartupForWasabiHotCloudStorage = function(group,userDetails){
        group.cloudDiskUse['whcs'].name = 'Wasabi Hot Cloud Storage'
        group.cloudDiskUse['whcs'].sizeLimitCheck = (userDetails.use_whcs_size_limit === '1')
        if(!userDetails.whcs_size_limit || userDetails.whcs_size_limit === ''){
            group.cloudDiskUse['whcs'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['whcs'].sizeLimit = parseFloat(userDetails.whcs_size_limit)
        }
    }
    var loadWasabiHotCloudStorageForUser = function(e){
        // e = user
        var userDetails = JSON.parse(e.details)
        if(userDetails.whcs_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WasabiHotCloudStorage){
            // {
            //     whcs_accessKeyId: "",
            //     whcs_secretAccessKey: "",
            //     whcs_region: "",
            //     whcs_bucket: "",
            //     whcs_dir: "",
            // }
            userDetails = Object.assign(userDetails,config.cloudUploaders.WasabiHotCloudStorage)
        }
        //Wasabi Hot Cloud Storage
        if(!s.group[e.ke].whcs &&
           userDetails.whcs !== '0' &&
           userDetails.whcs_accessKeyId !== ''&&
           userDetails.whcs_secretAccessKey &&
           userDetails.whcs_secretAccessKey !== ''&&
           userDetails.whcs_bucket !== ''
          ){
            if(!userDetails.whcs_dir || userDetails.whcs_dir === '/'){
                userDetails.whcs_dir = ''
            }
            if(userDetails.whcs_dir !== ''){
                userDetails.whcs_dir = s.checkCorrectPathEnding(userDetails.whcs_dir)
            }
            if(userDetails.use_whcs_endpoint_select && userDetails.use_whcs_endpoint_select !== ''){
                userDetails.whcs_endpoint = userDetails.use_whcs_endpoint_select
            }
            if(!userDetails.whcs_endpoint || userDetails.whcs_endpoint === ''){
                userDetails.whcs_endpoint = 's3.wasabisys.com'
            }
            var whcs_region = null
            if(userDetails.whcs_region && userDetails.whcs_region !== ''){
                whcs_region = userDetails.whcs_region
            }
            var endpointSplit = userDetails.whcs_endpoint.split('.')
            if(endpointSplit.length > 2){
                endpointSplit.shift()
            }
            var locationUrl = endpointSplit.join('.')
            var AWS = new require("aws-sdk")
            s.group[e.ke].whcs = AWS
            var wasabiEndpoint = new AWS.Endpoint(userDetails.whcs_endpoint)
            s.group[e.ke].whcs.config = new s.group[e.ke].whcs.Config({
                endpoint: wasabiEndpoint,
                accessKeyId: userDetails.whcs_accessKeyId,
                secretAccessKey: userDetails.whcs_secretAccessKey,
                region: whcs_region
            })
            s.group[e.ke].whcs = new s.group[e.ke].whcs.S3();
        }
    }
    var unloadWasabiHotCloudStorageForUser = function(user){
        s.group[user.ke].whcs = null
    }
    var deleteVideoFromWasabiHotCloudStorage = function(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(!videoDetails.location){
            videoDetails.location = video.href.split(locationUrl)[1]
        }
        s.group[e.ke].whcs.deleteObject({
            Bucket: s.group[e.ke].init.whcs_bucket,
            Key: videoDetails.location,
        }, function(err, data) {
            if (err) console.log(err);
            callback()
        });
    }
    var uploadVideoToWasabiHotCloudStorage = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Wasabi Hot Cloud Storage
        if(s.group[e.ke].whcs && s.group[e.ke].init.use_whcs !== '0' && s.group[e.ke].init.whcs_save === '1'){
            var ext = k.filename.split('.')
            ext = ext[ext.length - 1]
            var fileStream = fs.createReadStream(k.dir+k.filename);
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var bucketName = s.group[e.ke].init.whcs_bucket
            var saveLocation = s.group[e.ke].init.whcs_dir+e.ke+'/'+e.mid+'/'+k.filename
            s.group[e.ke].whcs.upload({
                Bucket: bucketName,
                Key: saveLocation,
                Body:fileStream,
                ACL:'public-read',
                ContentType:'video/'+ext
            },function(err,data){
                if(err){
                    s.userLog(e,{type:lang['Wasabi Hot Cloud Storage Upload Error'],msg:err})
                }
                if(s.group[e.ke].init.whcs_log === '1' && data && data.Location){
                    var cloudLink = data.Location
                    cloudLink = fixCloudianUrl(e,cloudLink)
                    var save = [
                        e.mid,
                        e.ke,
                        k.startTime,
                        1,
                        s.s({
                            type : 'whcs',
                            location : saveLocation
                        }),
                        k.filesize,
                        k.endTime,
                        cloudLink
                    ]
                    s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                    s.setCloudDiskUsedForGroup(e,{
                        amount : k.filesizeMB,
                        storageType : 'whcs'
                    })
                    s.purgeCloudDiskForGroup(e,'whcs')
                }
            })
        }
    }
    var onInsertTimelapseFrame = function(monitorObject,queryInfo,filePath){
        var e = monitorObject
        if(s.group[e.ke].whcs && s.group[e.ke].init.use_whcs !== '0' && s.group[e.ke].init.whcs_save === '1'){
            var fileStream = fs.createReadStream(filePath)
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.whcs_dir + e.ke + '/' + e.mid + '_timelapse/' + queryInfo.filename
            s.group[e.ke].whcs.upload({
                Bucket: s.group[e.ke].init.whcs_bucket,
                Key: saveLocation,
                Body: fileStream,
                ACL:'public-read',
                ContentType:'image/jpeg'
            },function(err,data){
                if(err){
                    s.userLog(e,{type:lang['Wasabi Hot Cloud Storage Upload Error'],msg:err})
                }
                if(s.group[e.ke].init.whcs_log === '1' && data && data.Location){
                    var save = [
                        queryInfo.mid,
                        queryInfo.ke,
                        queryInfo.time,
                        s.s({
                            type : 'whcs',
                            location : saveLocation,
                        }),
                        queryInfo.size,
                        data.Location
                    ]
                    s.sqlQuery('INSERT INTO `Cloud Timelapse Frames` (mid,ke,time,details,size,href) VALUES (?,?,?,?,?,?)',save)
                    s.setCloudDiskUsedForGroup(e,{
                        amount : s.kilobyteToMegabyte(queryInfo.size),
                        storageType : 'whcs'
                    },'timelapseFrames')
                    s.purgeCloudDiskForGroup(e,'whcs','timelapseFrames')
                }
            })
        }
    }
    var onDeleteTimelapseFrameFromCloud = function(e,frame,callback){
        // e = user
        try{
            var frameDetails = JSON.parse(frame.details)
        }catch(err){
            var frameDetails = frame.details
        }
        if(frameDetails.type !== 'whcs'){
            return
        }
        if(!frameDetails.location){
            frameDetails.location = frame.href.split(locationUrl)[1]
        }
        s.group[e.ke].whcs.deleteObject({
            Bucket: s.group[e.ke].init.whcs_bucket,
            Key: frameDetails.location,
        }, function(err, data) {
            if (err) console.log(err);
            callback()
        });
    }
    var fixCloudianUrl = function(e,cloudLink){
        if(cloudLink.indexOf('http') === -1){
            var bucketName = s.group[e.ke].init.whcs_bucket
            var endPointSplit = s.group[e.ke].init.whcs_endpoint.split('://')
            endPoint = endPointSplit[1] || endPointSplit[0]
            var protocol = `https`
            if(endPointSplit[1])protocol = endPointSplit[0]
            var cloudLinkPrefix = `${protocol}://${bucketName}.${endPoint}`
            var truncatedLink = cloudLink.substring(0, bucketName.length + 3)
            if(truncatedLink.indexOf(`${bucketName}/`) > -1){
                cloudLink = cloudLink.replace(`${bucketName}/`,'')
            }
            cloudLink = s.checkCorrectPathEnding(cloudLinkPrefix) + cloudLink
        }
        return cloudLink
    }
    //wasabi
    s.addCloudUploader({
        name: 'whcs',
        loadGroupAppExtender: loadWasabiHotCloudStorageForUser,
        unloadGroupAppExtender: unloadWasabiHotCloudStorageForUser,
        insertCompletedVideoExtender: uploadVideoToWasabiHotCloudStorage,
        deleteVideoFromCloudExtensions: deleteVideoFromWasabiHotCloudStorage,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForWasabiHotCloudStorage,
        beforeAccountSave: beforeAccountSaveForWasabiHotCloudStorage,
        onAccountSave: cloudDiskUseStartupForWasabiHotCloudStorage,
        onInsertTimelapseFrame: onInsertTimelapseFrame,
        onDeleteTimelapseFrameFromCloud: onDeleteTimelapseFrameFromCloud
    })
    return {
       "evaluation": "details.use_whcs !== '0'",
       "name": lang["S3-Based Network Storage"],
       "color": "forestgreen",
       "info": [
           {
              "name": "detail=whcs_save",
              "selector":"autosave_whcs",
              "field": lang.Autosave,
              "description": "",
              "default": lang.No,
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
               "hidden": true,
              "name": "detail=use_whcs_endpoint_select",
              "selector":"h_whcs_endpoint",
              "field": lang.Endpoint,
              "description": "",
              "default": "",
              "example": "",
              "fieldType": "select",
              "possible": [
                  {
                     "name": "Custom Endpoint",
                     "value": ""
                  },
                  {
                     "name": lang['Wasabi Hot Cloud Storage'],
                     "value": "s3.wasabisys.com"
                  }
              ]
           },
           {
              "hidden": true,
              "field": lang['Endpoint Address'],
              "name": "detail=whcs_endpoint",
              "placeholder": "s3.wasabisys.com",
              "form-group-class": "autosave_whcs_input autosave_whcs_1",
              "form-group-class-pre-layer":"h_whcs_endpoint_input h_whcs_endpoint_",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
              "hidden": true,
              "field": lang.Bucket,
              "name": "detail=whcs_bucket",
              "placeholder": "Example : slippery-seal",
              "form-group-class": "autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "field": lang.aws_accessKeyId,
              "name": "detail=whcs_accessKeyId",
              "form-group-class": "autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "name": "detail=whcs_secretAccessKey",
              "fieldType":"password",
              "placeholder": "",
              "field": lang.aws_secretAccessKey,
              "form-group-class":"autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "name": "detail=whcs_region",
              "field": lang.Region,
              "fieldType": "select",
              "form-group-class":"autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": [
                   {
                      "name": lang['No Region'],
                      "value": ""
                   },
                   {
                      "name": "US West 1",
                      "value": "us-west-1"
                   },
                   {
                      "name": "US West 2)",
                      "value": "us-west-2"
                   },
                   {
                      "name": "US East 1",
                      "value": "us-east-2"
                   },
                   {
                      "name": "US East 2",
                      "value": "us-east-1"
                   },
                   {
                      "name": "Asia Pacific 1",
                      "value": "ap-south-1"
                   },
                   {
                      "name": "Asia Pacific 2",
                      "value": "ap-northeast-2"
                   },
                   {
                      "name": "Asia Pacific 3",
                      "value": "ap-northeast-3"
                   },
                   {
                      "name": "Asia Pacific 4",
                      "value": "ap-southeast-1"
                   },
                   {
                      "name": "Asia Pacific 5",
                      "value": "ap-southeast-2"
                   },
                   {
                      "name": "Asia Pacific 6",
                      "value": "ap-northeast-1"
                   },
                   {
                      "name": "Canada 1",
                      "value": "ca-central-1"
                   },
                   {
                      "name": "China 1",
                      "value": "cn-north-1"
                   },
                   {
                      "name": "China 1",
                      "value": "cn-northwest-1"
                   },
                   {
                      "name": "EU 1",
                      "value": "eu-central-1"
                   },
                   {
                      "name": "EU 2",
                      "value": "eu-west-1"
                   },
                   {
                      "name": "EU 3",
                      "value": "eu-west-2"
                   },
                   {
                      "name": "EU 4",
                      "value": "eu-west-3"
                   },
                   {
                      "name": "South America 1",
                      "value": "sa-east-1"
                   }
                ]
          },
          {
              "hidden": true,
             "name": "detail=whcs_log",
             "field": lang['Save Links to Database'],
             "fieldType": "select",
             "selector": "h_whcssld",
             "form-group-class":"autosave_whcs_input autosave_whcs_1",
             "description": "",
             "default": "",
             "example": "",
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
             "hidden": true,
            "name": "detail=use_whcs_size_limit",
            "field": lang['Use Max Storage Amount'],
            "fieldType": "select",
            "selector": "h_whcszl",
            "form-group-class":"autosave_whcs_input autosave_whcs_1",
            "form-group-class-pre-layer":"h_whcssld_input h_whcssld_1",
            "description": "",
            "default": "",
            "example": "",
            "possible":  [
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
             "hidden": true,
            "name": "detail=whcs_size_limit",
            "field": lang['Max Storage Amount'],
            "form-group-class":"autosave_whcs_input autosave_whcs_1",
            "form-group-class-pre-layer":"h_whcssld_input h_whcssld_1",
            "description": "",
            "default": "10000",
            "example": "",
            "possible": ""
         },
         {
             "hidden": true,
            "name": "detail=whcs_dir",
            "field": lang['Save Directory'],
            "form-group-class":"autosave_whcs_input autosave_whcs_1",
            "description": "",
            "default": "/",
            "example": "",
            "possible": ""
         },
       ]
    }
}
