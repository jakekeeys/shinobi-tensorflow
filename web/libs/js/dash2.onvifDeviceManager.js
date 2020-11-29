$(document).ready(function(){
    var blockWindow = $('#onvifDeviceManager')
    var blockWindow = $('#onvifDeviceManagerInfo')
    var blockForm = blockWindow.find('form')
    blockForm.submit(function(e){
        e.preventDefault()
        var formOptions = blockForm.serializeObject()
        console.log(formOptions)
        return false;
    })
})
