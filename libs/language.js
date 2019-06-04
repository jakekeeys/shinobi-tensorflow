var fs = require('fs')
module.exports = function(s,config){
    if(!config.language){
        config.language='en_CA'
    }
    try{
        var lang = require(s.location.languages+'/'+config.language+'.json');
    }catch(er){
        console.error(er)
        console.log('There was an error loading your language file.')
        var lang = require(s.location.languages+'/en_CA.json');
    }
    //load languages dynamically
    s.copySystemDefaultLanguage = function(){
        //en_CA
        return Object.assign(lang,{})
    }
    s.listOfPossibleLanguages = []
    fs.readdirSync(s.mainDirectory + '/languages').forEach(function(filename){
        var name = filename.replace('.json','')
        s.listOfPossibleLanguages.push({
            "name": name,
            "value": name,
        })
    })
    s.loadedLanguages={}
    s.loadedLanguages[config.language] = s.copySystemDefaultLanguage()
    s.getLanguageFile = function(rule){
        if(rule && rule !== ''){
            var file = s.loadedLanguages[file]
            if(!file){
                try{
                    s.loadedLanguages[rule] = require(s.location.languages+'/'+rule+'.json')
                    s.loadedLanguages[rule] = Object.assign(s.copySystemDefaultLanguage(),s.loadedLanguages[rule])
                    file = s.loadedLanguages[rule]
                }catch(err){
                    file = s.copySystemDefaultLanguage()
                }
            }
        }else{
            file = s.copySystemDefaultLanguage()
        }
        return file
    }
    return lang
}
