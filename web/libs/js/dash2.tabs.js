$(document).ready(function(){
    $('body')
        .on('click','[tab-chooser]',function(){
            var el = $(this)
            var parent = el.parents('[tab-chooser-parent]')
            var tabName = el.attr('[tab-chooser]')
            var allTabChoosersInParent = parent.find('[tab-chooser]')
            var allTabsInParent = parent.find('[tab-section]')
            allTabsInParent.hide()
            allTabChoosersInParent.removeClass('active')
            el.addClass('active')
            parent.find(`[tab-section="${tabName}"]`).show()
        })
})
