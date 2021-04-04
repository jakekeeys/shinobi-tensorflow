$(document).ready(function(){
    $('#settings').on('click','.google-sign-in',function(){
        var signInWindow = window.open(getApiPrefix('loginTokenAddGoogle'),'popup','width=300,height=300,scrollbars=no,resizable=no');
        if(!signInWindow || signInWindow.closed || typeof signInWindow.closed=='undefined'){
            alert(`Your Popup Blocker is disabling this feature.`)
        }else{
            signInWindow.onbeforeunload = function(){
                drawAlternateLoginsToSettings()
            }
        }
        return false;
    })
})
