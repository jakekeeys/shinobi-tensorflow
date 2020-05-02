$(document).ready(function(){
    var changeSuperPreferencesTab = $('#changeSuperPreferences')
    var changeSuperPreferencesForm = changeSuperPreferencesTab.find('form')
    changeSuperPreferencesTab.find('.submit').click(function(){
        changeSuperPreferencesForm.submit()
    })
    changeSuperPreferencesForm.submit(function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        // $.ccio.cx({f:'accounts',ff:'saveSuper',form:formValues})
        $.post(superApiPrefix + $user.sessionKey + '/accounts/saveSettings',{
            data: JSON.stringify(formValues)
        },function(data){
            console.log(data)
        })
        return false
    })
})
