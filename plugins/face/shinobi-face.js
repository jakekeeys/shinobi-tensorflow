//
// Shinobi - Face Plugin
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
var dotenv = require('dotenv').config()
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
// Face - Face Recognition Init >>
var weightLocation = __dirname + '/weights'
const canvas = require('canvas')
var tfjsSuffix = ''
switch(config.tfjsBuild){
    case'gpu':
        tfjsSuffix = '-gpu'
    break;
    case'cpu':
    break;
    default:
        try{
            require(`@tensorflow/tfjs-node`)
        }catch(err){
            console.log(err)
        }
    break;
}
var tf = require(`@tensorflow/tfjs-node${tfjsSuffix}`)
faceapi = require('face-api.js')

const { createCanvas, Image, ImageData, Canvas } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
s.monitorLock = {}
// Face - Face Recognition Init />>
// SsdMobilenetv1Options
const minConfidence = 0.5
var addAwaitStatements = async function(){
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(weightLocation)
    await faceapi.nets.faceLandmark68Net.loadFromDisk(weightLocation)
    await faceapi.nets.faceRecognitionNet.loadFromDisk(weightLocation)
    const faceDetectionNet = faceapi.nets.ssdMobilenetv1
    var faceDetectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence });
    if(!fs.existsSync('./faces')){
        fs.mkdirSync('./faces');
    }
    var faces = fs.readdirSync('./faces')
    var labeledDescriptors = []
    var faceMatcher
    var facesLoaded = 0
    const createAllFaceDescriptors = (faces) => {
        s.detectObject = function(){}
        faceMatcher = null
        facesLoaded = 0
        labeledDescriptors = []
        const checkComplete = () => {
            ++facesLoaded
            if(facesLoaded === faces.length){
                faceMatcher = new faceapi.FaceMatcher(labeledDescriptors)
                startDetecting()
            }
        }
        faces.forEach(function(personName){
            var descriptors = []
            var faceFolder = './faces/' + personName + '/'
            var imageList = fs.readdirSync(faceFolder)
            var foundImages = []
            var faceResults = []
            imageList.forEach(function(imageFile,number){
                if(imageFile.indexOf('.jpg') > -1 || imageFile.indexOf('.jpeg') > -1){
                    foundImages.push(imageFile)
                }
            })
            if(foundImages.length === 0){
                checkComplete(facesLoaded,faces.length)
            }else{
                console.log('Loading : ' + personName)
                foundImages.forEach(function(imageFile,number){
                    var image = new Image;
                    image.onload = function() {
                        faceapi
                          .detectSingleFace(image)
                          .withFaceLandmarks()
                          .withFaceDescriptor()
                          .then((singleResult) => {
                              if (!singleResult) {
                                  return console.log('no faces',imageFile)
                              }
                              descriptors.push(singleResult.descriptor)
                              faceResults.push(singleResult)
                              if(number === foundImages.length - 1){
                                  console.log('Loaded : ' + personName)
                                  labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(
                                      personName,
                                      descriptors
                                  ))
                                  checkComplete()
                              }
                          })
                          .catch((error) => {
                              console.log(error)
                          })
                    }
                    image.src = fs.readFileSync(faceFolder + imageFile)
                })
            }
        })
    }
    var startDetecting = function(){
        console.log('Ready to Detect Faces')
        s.detectObject = function(buffer,d,tx,frameLocation){
            var detectStuff = function(frameBuffer,callback){
                try{
                    var startTime = new Date()
                    var image = new Image;
                    image.onload = async function() {
                        faceapi.detectAllFaces(image, faceDetectionOptions)
                        .withFaceLandmarks()
                        .withFaceDescriptors()
                        .then((data) => {
                            if(data && data[0]){
                                if(faceMatcher){
                                    data.forEach(fd => {
                                        var bestMatch = faceMatcher.findBestMatch(fd.descriptor)
                                        fd.detection.tag = bestMatch.toString()
                                    })
                                }
                                var endTime = new Date()
                                var matrices = []
                                try{
                                    var imgHeight = data[0].detection._imageDims._height
                                    var imgWidth = data[0].detection._imageDims._width
                                }catch(err){
                                    var imgHeight = data[0]._detection._imageDims._height
                                    var imgWidth = data[0]._detection._imageDims._width
                                }
                                data.forEach(function(box){
                                    var v = box.detection || box._detection
                                    var tag,confidence
                                    if(v.tag){
                                        var split = v.tag.split('(')
                                        tag = split[0].trim()
                                        if(tag === 'unknown')tag = 'UNKNOWN FACE'
                                        if(split[1]){
                                            confidence = split[1].replace(')','')
                                        }else{
                                            confidence = v._score
                                        }
                                    }else{
                                        tag = 'UNKNOWN FACE'
                                        confidence = v._score
                                    }
                                    matrices.push({
                                      id: tag,
                                      x: v._box.x,
                                      y: v._box.y,
                                      width: v._box.width,
                                      height: v._box.height,
                                      tag: tag,
                                      confidence: v._score,
                                    })
                                })
                                if(matrices.length > 0){
                                    tx({
                                        f:'trigger',
                                        id:d.id,
                                        ke:d.ke,
                                        details:{
                                            plug:config.plug,
                                            name:'face',
                                            reason:'object',
                                            matrices:matrices,
                                            imgHeight: imgHeight,
                                            imgWidth: imgWidth,
                                            ms: endTime - startTime
                                        },
                                    })
                                }
                            }
                        })
                        .catch((err) => {
                            console.log(err)
                        })
                    }
                    image.src = frameBuffer;
                }catch(err){
                    s.monitorLock[d.ke+d.id] = false
                    console.log(err)
                }
            }
            if(frameLocation){
                fs.readFile(frameLocation,function(err,buffer){
                    if(!err){
                        detectStuff(buffer)
                    }
                    fs.unlink(frameLocation,function(){

                    })
                })
            }else{
                detectStuff(buffer)
            }
        }
    }
    if(faces.length === 0){
        startDetecting()
    }else{
        createAllFaceDescriptors(faces)
    }
    // add websocket handlers
    const io = s.getWebsocket()
    var faceDescriptorRefreshTimeout
    const onSocketEvent = (d) => {
        switch(d.f){
            case'recompileFaceDescriptors':
                if(faceDescriptorRefreshTimeout)console.log('Cancelling previous recompilation request...')
                console.log('Recompiling Face Descriptors...')
                clearTimeout(faceDescriptorRefreshTimeout)
                faceDescriptorRefreshTimeout = setTimeout(()=>{
                    delete(faceDescriptorRefreshTimeout)
                    createAllFaceDescriptors(d.faces)
                },10000)
            break;
        }
    }
    if(config.mode === 'host'){
        io.on('connection', function (cn) {
            cn.on('f',onSocketEvent)
        })
    }else{
        io.on('f',onSocketEvent)
    }
}
addAwaitStatements()
