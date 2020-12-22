//
// Shinobi - Tensorflow Plugin
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//


// ==============================================================
// IF THIS TEST FAILS REINSTALL THE FOLLOWING NPM MODULES
//  - tfjs-core@2.3.0
//  - tfjs-converter@2.3.0
// version 2.3.0 is selected for this example. Make it point to the version of tfjs-node(-gpu) in use.
// ==============================================================
// Not working still? You may need to run following inside this folder.
// npm rebuild @tensorflow/tfjs-node-gpu@1.7.3 build-addon-from-source --unsafe-perm
// ==============================================================


// Base Init >>
var fs = require('fs');
const fetch = require('node-fetch');
// Base Init />>


var tf = require('@tensorflow/tfjs-node-gpu')

  const cocossd = require('@tensorflow-models/coco-ssd');
  // const mobilenet = require('@tensorflow-models/mobilenet');


  async function loadCocoSsdModal() {
      const modal = await cocossd.load({
          base: 'mobilenet_v2', //lite_mobilenet_v2
          modelUrl: null,
      })
      return modal;
  }

  // async function loadMobileNetModal() {
  //     const modal = await mobilenet.load({
  //         version: 1,
  //         alpha: 0.25 | .50 | .75 | 1.0,
  //     })
  //     return modal;
  // }

  function getTensor3dObject(numOfChannels,imageArray) {

      const tensor3d = tf.node.decodeJpeg( imageArray, numOfChannels );

      return tensor3d;
  }
  // const mobileNetModel =  this.loadMobileNetModal();
  var loadCocoSsdModel = {
      detect: function(){
          return {data:[]}
      }
  }
  async function init() {
      loadCocoSsdModel =  await loadCocoSsdModal();
  }
  init()
  var ObjectDetectors = class ObjectDetectors {
      constructor(image, type) {
          this.startTime = new Date();
          this.inputImage = image;
          this.type = type;
      }

      async process() {
          const tensor3D = getTensor3dObject(3,(this.inputImage));
          let predictions = await loadCocoSsdModel.detect(tensor3D);

          tensor3D.dispose();

          return {
              data: predictions,
              type: this.type,
              time: new Date() - this.startTime
          }
      }
  }

const testImageUrl = `https://www.pexels.com/photo/860577/download/?search_query=indian&tracking_id=565gcyh45ry`
const testImageUrl2 = `https://upload.wikimedia.org/wikipedia/commons/7/71/2010-kodiak-bear-1.jpg`
const testImageUrl3 = `https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/carbon-fiber-shelby-mustang-1600685276.jpg?crop=0.9988636363636364xw:1xh;center,top&resize=480:*`
const runTest = async (imageUrl) => {
    console.log(`Loading ${imageUrl}`)
    const response = await fetch(imageUrl);
    const frameBuffer = await response.buffer();
    console.log(`Detecting upon ${imageUrl}`)
    const resp = await (new ObjectDetectors(frameBuffer).process())
    const results = resp.data
    console.log(resp)
    if(results[0]){
        var mats = []
        results.forEach(function(v){
            console.log({
                x: v.bbox[0],
                y: v.bbox[1],
                width: v.bbox[2],
                height: v.bbox[3],
                tag: v.class,
                confidence: v.score,
            })
        })
    }else{
        console.log('No Matrices...')
    }
    console.log(`Done ${imageUrl}`)
}
const allTests = async () => {
    await runTest(testImageUrl)
    await runTest(testImageUrl2)
    await runTest(testImageUrl3)
}
allTests()
