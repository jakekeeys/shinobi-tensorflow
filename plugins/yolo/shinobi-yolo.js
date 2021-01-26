//
// Shinobi - Yolo Plugin
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
const {
  workerData
} = require('worker_threads');
if(workerData && workerData.ok === true){
    try{
        s = require('../pluginWorkerBase.js')(__dirname,config)
    }catch(err){
        console.log(err)
        try{
            s = require('./pluginWorkerBase.js')(__dirname,config)
        }catch(err){
            console.log(err)
            return console.log(config.plug,'WORKER : Plugin start has failed. pluginBase.js was not found.')
        }
    }
}else{
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
}
// Base Init />>
var yolo = require('node-yolo-shinobi');//this is @vapi/node-yolo@1.2.4 without the console output for detection speed
// var yolo = require('@vapi/node-yolo');
var detector = new yolo(__dirname + "/models", "cfg/coco.data", "cfg/yolov3.cfg", "yolov3.weights");
s.detectObject = async function(buffer,d,tx,frameLocation,callback){
    var timeStart = new Date()
    var detectStuff = async function(frame){
        try{
            const detections = await detector.detect(frame)
            matrices = []
            detections.forEach(function(v){
                matrices.push({
                  x:v.box.x,
                  y:v.box.y,
                  width:v.box.w,
                  height:v.box.h,
                  tag:v.className,
                  confidence:v.probability,
                })
            })
            if(matrices.length > 0){
                tx({
                    f:'trigger',
                    id:d.id,
                    ke:d.ke,
                    details:{
                        plug:config.plug,
                        name:'yolo',
                        reason:'object',
                        matrices:matrices,
                        imgHeight:parseFloat(d.mon.detector_scale_y),
                        imgWidth:parseFloat(d.mon.detector_scale_x),
                        time: (new Date()) - timeStart
                    }
                })
            }
            fs.unlink(frame,function(){

            })
        }catch(err){
            console.log(err)
        }
        callback()
    }
    if(frameLocation){
        detectStuff(frameLocation)
    }else{
        d.tmpFile=s.gid(5)+'.jpg'
        if(!fs.existsSync(s.dir.streams)){
            fs.mkdirSync(s.dir.streams);
        }
        d.dir=s.dir.streams+d.ke+'/'
        if(!fs.existsSync(d.dir)){
            fs.mkdirSync(d.dir);
        }
        d.dir=s.dir.streams+d.ke+'/'+d.id+'/'
        if(!fs.existsSync(d.dir)){
            fs.mkdirSync(d.dir);
        }
        fs.writeFile(d.dir+d.tmpFile,buffer,function(err){
            if(err) return s.systemLog(err);
            try{
                detectStuff(d.dir+d.tmpFile)
            }catch(error){
                console.error('Catch: ' + error);
            }
        })
    }
}
