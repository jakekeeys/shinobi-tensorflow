const tou8 = require('buffer-to-uint8array')
try{
    const tf = require('@tensorflow/tfjs-node-gpu');
}catch(err){
    const tf = require('@tensorflow/tfjs-node');
}

const cocossd = require('@tensorflow-models/coco-ssd');
// const mobilenet = require('@tensorflow-models/mobilenet');


async function loadCocoSsdModal() {
    const modal = await cocossd.load({
        base: 'mobilenet_v2'
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
var loadCocoSsdModel

async function init() {
  loadCocoSsdModel =  await loadCocoSsdModal();
}
init()
module.exports = class ObjectDetectors {

    constructor(image, type) {
        this.startTime = new Date();
        this.inputImage = image;
        this.type = type;
    }



    async process() {

        let predictions = null;
        const tensor3D = getTensor3dObject(3,tou8(this.inputImage));
        //
        // if(this.type === "imagenet") {
        //
        //     predictions = await mobileNetModel.classify(tensor3D);
        //
        // } else {

            predictions = await loadCocoSsdModel.detect(tensor3D);
        // }

        tensor3D.dispose();

       return {data: predictions, type: this.type, time: new Date() - this.startTime};
    }
}
