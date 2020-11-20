const fs = require('fs');
const haltMessage = `This script has stopped and started too quickly. It has been suspended to prevent performance issues.`
const lastStartTimeLocation = `${process.cwd()}/lastStartTime.txt`
const timeStarted = (new Date()).getTime()
const setStartTime = () => {
    fs.writeFileSync(lastStartTimeLocation,timeStarted,'utf8')
}
const checkStartTime = () => {
    //is it too soon? if too soon, the script might be crashing. in which case it will be suspended and may appear to be "running" but will not operate.
    try{
        const lastTimeStarted = parseInt(fs.readFileSync(lastStartTimeLocation,'utf8'))
        if(lastTimeStarted < timeStarted - 3000){
            return true
        }
    }catch(err){
        return true
    }
    return false
}
module.exports = {
    haltMessage: haltMessage,
    setStartTime: setStartTime,
    checkStartTime: checkStartTime,
}
