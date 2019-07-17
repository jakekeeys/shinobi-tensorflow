console.log('This translation tool uses the `customautoload-samples` repository.')
var selectedModule = process.argv[2]
if(!selectedModule){
    console.log('You must input arguments.')
    console.log('# node downloadCustomAutoLoadModule.js <CUSTOM_AUTOLOAD_FILE_OR_FOLDER_NAME>')
    console.log('Example:')
    console.log('# node downloadCustomAutoLoadModule.js ExtraBlocks')
    return
}else{
    console.log('## Depending on your selected module you may need to set options in your `conf.json` file.')
}
var exec = require('child_process').exec
var request = require('request')
var homeDirectory = __dirname + '/../'
var customAutoLoadFolder = `${homeDirectory}libs/customAutoLoad/`
var tempFolder = `${__dirname}/customAutoLoad`
var moduleList = selectedModule.split(',')
var moveModule = function(myModule){
    exec(`mv ${tempFolder}/samples/${myModule} ${customAutoLoadFolder}${myModule}`,function(err){
        if(err){
            console.log(`# Module "${myModule}" already exists or there is no source data.`)
        }else{
            console.log(`# Getting Module "${myModule}"`)
        }
    })
}
exec(`git clone https://gitlab.com/Shinobi-Systems/customautoload-samples.git ${tempFolder}`,function(err){
    if(err)console.log('# customAutoLoad directory seems to already exist.')
    moduleList.forEach(function(myModule,number){
        moveModule(myModule)
        if(moduleList.length === number + 1){
            exec(`rm -rf ${tempFolder}`,function(err){
                console.log('# Clean up temporary data.')
            })
        }
    })
})
