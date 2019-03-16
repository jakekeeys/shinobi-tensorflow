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
// Face - Face Recognition Init >>
var weightLocation = __dirname + '/weights'
const tf = require('@tensorflow/tfjs')
canvas = require('canvas')
faceapi = require('face-api.js')
require('@tensorflow/tfjs-node-gpu')

const { createCanvas, Image, ImageData, Canvas } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
s.monitorLock = {}
// Face - Face Recognition Init />>
// SsdMobilenetv1Options
const minConfidence = 0.5

// TinyFaceDetectorOptions
const inputSize = 384
const scoreThreshold = 0.5

// MtcnnOptions
const minFaceSize = 50
const scaleFactor = 0.8

function getFaceDetectorOptions(net) {
  return net === faceapi.nets.ssdMobilenetv1
    ? new faceapi.SsdMobilenetv1Options({ minConfidence })
    : (net === faceapi.nets.tinyFaceDetector
      ? new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
      : new faceapi.MtcnnOptions({ minFaceSize, scaleFactor })
    )
}
var addAwaitStatements = async function(){
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(weightLocation)
    // faceapi.nets.tinyFaceDetector.loadFromDisk(weightLocation)
    await faceapi.nets.faceLandmark68Net.loadFromDisk(weightLocation)
    await faceapi.nets.faceRecognitionNet.loadFromDisk(weightLocation)
    const faceDetectionNet = faceapi.nets.ssdMobilenetv1
    // const faceDetectionNet = faceapi.nets.tinyFaceDetector
    // const faceDetectionNet = faceapi.nets.mtcnn
    var faceDetectionOptions = getFaceDetectorOptions(faceDetectionNet)
    if(!fs.existsSync('./faces')){
        fs.mkdirSync('./faces');
    }
    var faces = fs.readdirSync('./faces')
    const labeledDescriptors = [
  // new faceapi.LabeledFaceDescriptors(
  //   'obama',
  //   [descriptorObama1, descriptorObama2]
  // ),
  // new faceapi.LabeledFaceDescriptors(
  //   'trump',
  //   [descriptorTrump]
  // )
    ]
    var faceMatcher
    var facesLoaded = 0
    var startDetecting = function(){
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
                                        fd._detection.tag = bestMatch.toString()
                                    })
                                }
                                var endTime = new Date()
                                var matrices = []
                                var imgHeight = data[0]._detection._imageDims._height
                                var imgWidth = data[0]._detection._imageDims._width
                                data.forEach(function(box){
                                    var v = box._detection
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
                                      x:v._box.x,
                                      y:v._box.y,
                                      width:v._box.width,
                                      height:v._box.height,
                                      tag:tag,
                                      confidence:v._score,
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
    var checkComplete = function(){
        ++facesLoaded
        if(facesLoaded === faces.length){
            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors)
            startDetecting()
        }
    }
    if(faces.length === 0){
        startDetecting()
    }else{
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
}
addAwaitStatements()
