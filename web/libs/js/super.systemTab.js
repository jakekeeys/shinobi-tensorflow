$(document).ready(function(){
    var systemsControlsTab = $('#system')
    systemsControlsTab.find('[system]').click(function(e){
        switch($(this).attr('system')){
            case'deleteLogs':
                var html = 'Do you want to delete these logs? User logs will <b>not</b> be deleted.'
                $.confirm.create({
                    title: `${lang['Delete Logs']}`,
                    body: html,
                    clickOptions: {
                        class: 'btn-danger',
                        title: lang.Delete,
                    },
                    clickCallback: function(){
                        $.get(superApiPrefix + $user.sessionKey + '/logs/delete',function(data){
                            console.log(data)
                        })
                        $.logs.e.find('table').empty()
                    }
                })
            break;
            case'update':
                var html = lang.updateNotice1
                $.confirm.create({
                    title: `${lang.Update} Shinobi?`,
                    body: html,
                    clickOptions: {
                        class: 'btn-danger',
                        title: lang.Update,
                    },
                    clickCallback: function(){
                        $.get(superApiPrefix + $user.sessionKey + '/system/update',function(data){
                            console.log(data)
                        })
                    }
                })
            break;
        }
    })
    systemsControlsTab.find('[restart]').click(function(e){
        var html = ''
        var target = $(this).attr('restart').split(',')
        target.forEach(function(v){
            switch(v){
                case'system':
                    html += '<p>Do you want to restart the core (camera.js)? plugins will not be restarted. They will reconnect when Shinobi is back online.</p>'
                break;
                case'cron':
                    html += '<p>Do you want to restart the CRON (cron.js)?</p>'
                break;
                case'logs':
                    html += '<p>Flush PM2 console logs? The logs saved in the database will <b>not</b> be deleted.</p>'
                break;
            }
        })
        $.confirm.create({
            title: `${lang.Restart}?`,
            body: html,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Restart,
            },
            clickCallback: function(){
                $.get(superApiPrefix + $user.sessionKey + '/system/restart/'+encodeURIComponent(target),function(data){
                    console.log(data)
                })
            }
        })
    })
})
