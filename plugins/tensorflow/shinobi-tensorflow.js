//
// Shinobi - Tensorflow Plugin
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
// Base Init >>
var fs = require('fs');
var config = require('./conf.json')
var s
try{
    s = require('../pluginBase.js')(__dirname,config)
}catch(err){
    console.log(err)
    try{
        s = require('./pluginBase.js')(__dirname,config)
    }catch(err){
        console.log(err)
        return console.log(config.plug,'Plugin start has failed. pluginBase.js was not found.')
    }
}
// Base Init />>

const ObjectDetectors = require('./ObjectDetectors.js')(config);

s.detectObject=function(buffer,d,tx,frameLocation){
    new ObjectDetectors(buffer).process().then((resp)=>{
        var results = resp.data
        if(results[0]){
            var mats = []
            results.forEach(function(v){
              // [xmin ymin xmax ymax]
              // [x y width height]
              // [xmin, ymin, xmax-xmin+1, ymax-ymin+1]
                // var width = v.bbox[2] - v.bbox[0]
                // var height = v.bbox[3] - v.bbox[1]
                mats.push({
                    x: v.bbox[0],
                    y: v.bbox[1],
                    width: v.bbox[2],
                    height: v.bbox[3],
                    tag: v.class,
                    confidence: v.score,
                })
            })
            var isObjectDetectionSeparate = d.mon.detector_pam === '1' && d.mon.detector_use_detect_object === '1'
            var width = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_y_object ? d.mon.detector_scale_y_object : d.mon.detector_scale_y)
            var height = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_x_object ? d.mon.detector_scale_x_object : d.mon.detector_scale_x)
            tx({
                f:'trigger',
                id:d.id,
                ke:d.ke,
                details:{
                    plug:config.plug,
                    name:'Tensorflow',
                    reason:'object',
                    matrices:mats,
                    imgHeight:width,
                    imgWidth:height,
                    time: resp.time
                }
            })
        }
    })
    // var detectStuff = function(frame,callback){
    //     detector.detect(frame)
    //          .then(detections => {
    //              matrices = []
    //              detections.forEach(function(v){
    //                  matrices.push({
    //                    x:v.box.x,
    //                    y:v.box.y,
    //                    width:v.box.w,
    //                    height:v.box.h,
    //                    tag:v.className,
    //                    confidence:v.probability,
    //                  })
    //              })
    //              if(matrices.length > 0){
    //                  tx({
    //                      f:'trigger',
    //                      id:d.id,
    //                      ke:d.ke,
    //                      details:{
    //                          plug:config.plug,
    //                          name:'yolo',
    //                          reason:'object',
    //                          matrices:matrices,
    //                          imgHeight:parseFloat(d.mon.detector_scale_y),
    //                          imgWidth:parseFloat(d.mon.detector_scale_x)
    //                      }
    //                  })
    //              }
    //              fs.unlink(frame,function(){
    //
    //              })
    //          })
    //          .catch(error => {
    //              console.log(error)
    //
    //            // here you can handle the errors. Ex: Out of memory
    //        })
    // }
    // if(frameLocation){
    //     detectStuff(frameLocation)
    // }else{
    //     d.tmpFile=s.gid(5)+'.jpg'
    //     if(!fs.existsSync(s.dir.streams)){
    //         fs.mkdirSync(s.dir.streams);
    //     }
    //     d.dir=s.dir.streams+d.ke+'/'
    //     if(!fs.existsSync(d.dir)){
    //         fs.mkdirSync(d.dir);
    //     }
    //     d.dir=s.dir.streams+d.ke+'/'+d.id+'/'
    //     if(!fs.existsSync(d.dir)){
    //         fs.mkdirSync(d.dir);
    //     }
    //     fs.writeFile(d.dir+d.tmpFile,buffer,function(err){
    //         if(err) return s.systemLog(err);
    //         try{
    //             detectStuff(d.dir+d.tmpFile)
    //         }catch(error){
    //             console.error('Catch: ' + error);
    //         }
    //     })
    // }
}
