const fs = require('fs');
const calculateCPUPercentage = function(oldVals, newVals){
    var totalDiff = newVals.total - oldVals.total;
    var activeDiff = newVals.active - oldVals.active;
    return Math.ceil((activeDiff / totalDiff) * 100);
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
                // We'll count both idle and iowait as idle time
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
        fs.readFile("/proc/meminfo", function(err, data){
            const rows = data.toString().split('\n');
            const parsed = {}
            rows.forEach((row) => {
                const rowParts = row.split(':')
                const label = rowParts[0].trim()
                if(label === 'MemTotal' || label === 'MemFree' || label === 'MemAvailable'){
                    const memoryUsed = parseFloat(rowParts[1].trim().split(' ')[0]) / 1000
                    parsed[label] = memoryUsed
                }
            })
            const memFree = parsed.MemFree || parsed.MemAvailable
            const ramUsed = parsed.MemTotal - memFree
            const ramUsedPercent = parsed.MemTotal / memFree * 100 - 100
            resolve({
                used: ramUsed,
                percent: ramUsedPercent,
            });
        })
    })
}
