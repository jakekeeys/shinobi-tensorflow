//
// Shinobi - OpenALPR Plugin
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
var exec = require('child_process').exec;
var openalpr = {
    us: require ("node-openalpr-shinobi"),
    eu: require ("node-openalpr-shinobi"),
};
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
// OpenALPR Init >>
if(config.alprConfig === undefined){
    config.alprConfig = __dirname + '/openalpr.conf'
}
Object.keys(openalpr).forEach(function(region){
    openalpr[region].Start(config.alprConfig, null, null, true, region)
})
var convertResultsToMatrices = function(results){
    var mats = []
    var plates = []
    results.forEach(function(v){
        v.candidates.forEach(function(g,n){
            if(v.candidates[n].matches_template){
                delete(v.candidates[n].matches_template)
            }
        })
        plates.push({
            coordinates: v.coordinates,
            candidates: v.candidates,
            confidence: v.confidence,
            plate: v.plate
        })
        var width = Math.sqrt( Math.pow(v.coordinates[1].x - v.coordinates[0].x, 2) + Math.pow(v.coordinates[1].y - v.coordinates[0].y, 2));
        var height = Math.sqrt( Math.pow(v.coordinates[2].x - v.coordinates[1].x, 2) + Math.pow(v.coordinates[2].y - v.coordinates[1].y, 2))
        mats.push({
            x: v.coordinates[0].x,
            y: v.coordinates[0].y,
            width: width,
            height: height,
            tag: v.plate
        })
    })
    return mats
}
// OpenALPR Init />>
s.detectObject = function(buffer,d,tx,frameLocation,callback){
    try{
        var region = d.mon.detector_lisence_plate_country || 'us'
        openalpr[region].IdentifyLicense(buffer, {}, function (error, output){
            var results = output.results
            if(results.length > 0){
                var matrices = convertResultsToMatrices(results)
                tx({
                    f: 'trigger',
                    id:  d.id,
                    ke: d.ke,
                    details: {
                        plug: config.plug,
                        name: 'licensePlate',
                        reason: 'object',
                        matrices: matrices,
                        imgHeight: d.mon.detector_scale_y,
                        imgWidth: d.mon.detector_scale_x,
                        frame: d.base64
                    }
                })
            }
            callback()
        })
    }catch(err){
        console.log(err)
    }
}
