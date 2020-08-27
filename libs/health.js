var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
const { getCpuUsageOnLinux, getRamUsageOnLinux } = require('./health/utils.js')
module.exports = function(s,config,lang,io){
    s.heartBeat = function(){
        setTimeout(s.heartBeat, 8000);
        io.sockets.emit('ping',{beat:1});
    }
    s.heartBeat()
    let hasProcStat = false
    try{
        fs.statSync("/proc/stat")
        hasProcStat = true
    }catch(err){

    }
    if(hasProcStat){
        s.cpuUsage = async () => {
            const percent = await getCpuUsageOnLinux()
            return percent
        }
    }else{
        s.cpuUsage = () => {
            return new Promise((resolve, reject) => {
                var k = {}
                switch(s.platform){
                    case'win32':
                        k.cmd = "@for /f \"skip=1\" %p in ('wmic cpu get loadpercentage') do @echo %p%"
                    break;
                    case'darwin':
                        k.cmd = "ps -A -o %cpu | awk '{s+=$1} END {print s}'";
                    break;
                    case'linux':
                        k.cmd = 'top -b -n 2 | awk \'toupper($0) ~ /^.?CPU/ {gsub("id,","100",$8); gsub("%","",$8); print 100-$8}\' | tail -n 1';
                    break;
                    case'freebsd':
                        k.cmd = 'vmstat 1 2 | awk \'END{print 100-$19}\''
                    break;
                    case'openbsd':
                        k.cmd = 'vmstat 1 2 | awk \'END{print 100-$18}\''
                    break;
                }
                if(config.customCpuCommand){
                  exec(config.customCpuCommand,{encoding:'utf8',detached: true},function(err,d){
                      if(s.isWin===true) {
                          d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
                      }
                      resolve(d)
                      s.onGetCpuUsageExtensions.forEach(function(extender){
                          extender(d)
                      })
                  })
                } else if(k.cmd){
                     exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                         if(s.isWin===true){
                             d=d.replace(/(\r\n|\n|\r)/gm,"").replace(/%/g,"")
                         }
                         resolve(d)
                         s.onGetCpuUsageExtensions.forEach(function(extender){
                             extender(d)
                         })
                     })
                } else {
                    resolve(0)
                }
            })
        }
    }
    let hasProcMeminfo = false
    try{
        fs.statSync("/proc/meminfo")
        hasProcMeminfo = true
    }catch(err){

    }
    if(hasProcMeminfo){
        s.ramUsage = async () => {
            const used = await getRamUsageOnLinux()
            return used
        }
    }else{
        s.ramUsage = () => {
            return new Promise((resolve, reject) => {
                k={}
                switch(s.platform){
                    case'win32':
                        k.cmd = "wmic OS get FreePhysicalMemory /Value"
                    break;
                    case'darwin':
                        k.cmd = "vm_stat | awk '/^Pages free: /{f=substr($3,1,length($3)-1)} /^Pages active: /{a=substr($3,1,length($3-1))} /^Pages inactive: /{i=substr($3,1,length($3-1))} /^Pages speculative: /{s=substr($3,1,length($3-1))} /^Pages wired down: /{w=substr($4,1,length($4-1))} /^Pages occupied by compressor: /{c=substr($5,1,length($5-1)); print ((a+w)/(f+a+i+w+s+c))*100;}'"
                    break;
                    case'freebsd':
                	    k.cmd = "echo \"scale=4; $(vmstat -H | awk 'END{print $5}')*1024*100/$(sysctl -n hw.physmem)\" | bc"
                    break;
        	        case'openbsd':
                        k.cmd = "echo \"scale=4; $(vmstat | awk 'END{ gsub(\"M\",\"\",$4); print $4 }')*104857600/$(sysctl -n hw.physmem)\" | bc"
                    break;
                    default:
                        k.cmd = "LANG=C free | grep Mem | awk '{print $7/$2 * 100.0}'";
                    break;
                }
                if(k.cmd){
                     exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                         if(s.isWin===true){
                             d=(parseInt(d.split('=')[1])/(s.totalmem/1000))*100
                         }
                         resolve(d)
                         s.onGetRamUsageExtensions.forEach(function(extender){
                             extender(d)
                         })
                     })
                }else{
                    resolve(0)
                }
            })
        }
    }
    if(config.childNodes.mode !== 'child'){
        setInterval(async () => {
            const cpu = await s.cpuUsage()
            const ram = await s.ramUsage()
            s.tx({
                f: 'os',
                cpu: cpu,
                ram: ram
            },'CPU')
        },10000)
    }
}
