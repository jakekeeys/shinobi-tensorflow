var fs = require('fs')
var express = require('express')
module.exports = function(s,config,lang,app,io){
    s.location.definitions = s.mainDirectory+'/definitions'
    try{
        var definitions = require(s.location.definitions+'/'+config.language+'.js')(s,config,lang)
    }catch(er){
        console.error(er)
        console.log('There was an error loading your definition file.')
        try{
            var definitions = require(s.location.definitions+'/en_CA.js')(s,config,lang)
        }catch(er){
            console.error(er)
            console.log('There was an error loading your definition file.')
            var definitions = require(s.location.definitions+'/en_CA.json');
        }
    }
    //load defintions dynamically
    s.definitions = definitions
    s.copySystemDefaultDefinitions = function(){
        //en_CA
        return Object.assign(s.definitions,{})
    }
    s.loadedDefinitons={}
    s.loadedDefinitons[config.language] = s.copySystemDefaultDefinitions()
    s.getDefinitonFile = function(rule){
        if(rule && rule !== ''){
            var file = s.loadedDefinitons[rule]
            if(!file){
                try{
                    s.loadedDefinitons[rule] = require(s.location.definitions+'/'+rule+'.js')(s,config,lang)
                    s.loadedDefinitons[rule] = Object.assign(s.copySystemDefaultDefinitions(),s.loadedDefinitons[rule])
                    file = s.loadedDefinitons[rule]
                }catch(err){
                    file = s.copySystemDefaultDefinitions()
                }
            }
        }else{
            file = s.copySystemDefaultDefinitions()
        }
        return file
    }
    return definitions
}
