const request = require('request')
const { newFrameChecker, grabFrames} = require('./opencv-motion-detector')
// const connectUrl = `http://66.76.193.12:8000/mjpg/video.mjpg`
const connectUrl = `rtsp://10.1.103.248:554/1/h264major`
const checkFrame = newFrameChecker({
    skipFrames: 30,
    minimumArea: 4000,
})
function startProcessing(){
    grabFrames(connectUrl, 10, async (frame) => {
        console.log('New Frame!')
        const timeNow = new Date()
        checkFrame(frame).then((matrices) => {
            if(matrices.length > 0){
                console.log('Motion Found!',matrices.length,'Matrices')
                matrices.forEach(function(mat){
                    mat.tag = 'person'
                    mat.confidence = 100
                })
                console.log()
                const jsonString = {
                    plug: 'testOpenCV',
                    name :'testOpenCV',
                    reason: 'object',
                    matrices: matrices,
                    imgHeight: `1944`,
                    imgWidth: `2592`,
                    time: (new Date()) - timeNow
                }
                request(`http://172.16.100.238:8080/SA9Iw5MB6UhPtPkVI6Du8BtJ8L5baG/motion/q3KoBHh3eb/jEyQTlH1AM8999?data=${JSON.stringify(jsonString)}`,function(err,response,body){
                    console.log(body)
                })
            }
        })
    }, () => {
        //on done
        console.log('Crashed, Starting again...')
        startProcessing()
    })
}
startProcessing()
