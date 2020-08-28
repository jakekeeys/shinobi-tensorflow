// This file's contents were referenced from https://gist.github.com/sidwarkd/9578213
const fs = require('fs');
const calculateCPUPercentage = function(oldVals, newVals){
    var totalDiff = newVals.total - oldVals.total;
    var activeDiff = newVals.active - oldVals.active;
    return Math.ceil((activeDiff / totalDiff) * 100);
};
function getValFromLine(line){
  var match = line.match(/[0-9]+/gi);
  if(match !== null)
    return parseInt(match[0]);
  else
    return null;
};
const currentCPUInfo = {
    total: 0,
    active: 0
}
const lastCPUInfo = {
    total: 0,
    active: 0
}
exports.getCpuUsageOnLinux = () => {
    lastCPUInfo.active = currentCPUInfo.active;
    lastCPUInfo.idle = currentCPUInfo.idle;
    lastCPUInfo.total = currentCPUInfo.total;
    return new Promise((resolve,reject) => {
        const getUsage = function(callback){
            fs.readFile("/proc/stat" ,'utf8', function(err, data){
                var lines = data.split('\n');
                var cpuTimes = lines[0].match(/[0-9]+/gi);
                currentCPUInfo.total = 0;
                currentCPUInfo.idle = parseInt(cpuTimes[3]) + parseInt(cpuTimes[4]);
                for (var i = 0; i < cpuTimes.length; i++){
                  currentCPUInfo.total += parseInt(cpuTimes[i]);
                }
                currentCPUInfo.active = currentCPUInfo.total - currentCPUInfo.idle
                currentCPUInfo.percentUsed = calculateCPUPercentage(lastCPUInfo, currentCPUInfo);
                callback(currentCPUInfo.percentUsed)
            })
        }
        getUsage(function(percentage){
            setTimeout(function(){
                getUsage(function(percentage){
                    resolve(percentage);
                })
            }, 3000)
        })
    })
}
exports.getRamUsageOnLinux = () => {
    return new Promise((resolve,reject) => {
        fs.readFile("/proc/meminfo", 'utf8', function(err, data){
            const lines = data.split('\n');
            const total = Math.floor(getValFromLine(lines[0]) / 1024);
            const free = Math.floor(getValFromLine(lines[1]) / 1024);
            const cached = Math.floor(getValFromLine(lines[4]) / 1024);
            const used = total - free;
            const percentUsed = Math.ceil(((used - cached) / total) * 100);
            resolve({
                used: used,
                percent: percentUsed,
            });
        })
    })
}
