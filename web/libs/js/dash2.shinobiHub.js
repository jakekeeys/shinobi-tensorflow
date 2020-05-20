$(document).ready(function(){
    var loadedConfigs = {}
    var shinobiHubWindow = $('#shinobihub_viewer')
    var shinobiHubWindowTableBody = shinobiHubWindow.find('tbody')
    // var shinobiHubWindowSearch = $('#shinobihub-search')
    var shinobiHubWindowSortBy = $('#shinobihub-sort-by')
    var shinobiHubWindowSortDirection = $('#shinobihub-sort-direction')
    var shinobiHubWindowPages = $('#shinobihub-pages')

    var getConfigurationsFromHub = function(rowLimit,skipOver,explore,callback){
        $.get(getApiPrefix() + `/getShinobiHubConfigurations/${$user.ke}/cam?rowLimit=${rowLimit}&skipOver=${skipOver}&explore=${explore ? explore : "0"}`,callback)
    }
    var buildConfigRow = function(row){
        return `<tr drawn-id="${row.id}">
            <td>${row.name}</td>
            <td>${row.brand}</td>
            <td>${row.description}</td>
            <td><i class="fa fa-${row.private == 1 ? 'check text-success' : 'cross text-danger'}"></i></td>
            <td><a class="copy btn btn-sm btn-primary"><i class="fa fa-copy"></i></a></td>
        </tr>`
    }
    var loadRows = function(skipOver,rowLimit,explore){
        shinobiHubWindowTableBody.empty()
        if(!skipOver)skipOver = 0
        if(!rowLimit)rowLimit = 10
        if(!explore)explore = '0'
        // var searchQuery = shinobiHubWindowSearch.val()
        getConfigurationsFromHub(rowLimit,skipOver,explore,function(data){
            var html = ''
            $.each(data.configs,function(n,row){
                loadedConfigs[row.id] = row
                try{
                    html += buildConfigRow(row)
                }catch(err){
                    console.log(err,row)
                }
            })
            shinobiHubWindowTableBody.html(html)
            html = ''
            if(data.pages > 10){
                for (i = 1; i < 3 + 1; i++) {
                    html += `<button type="button" class="page-select btn btn-default btn-sm ${i === data.currentPage ? 'active' : ''}" page="${i}">${i}</button>`
                }
                html += `<input class="page-number-input form-control form-control-sm mr-2 text-center" type=number min=3 max=${data.pages - 4} value="${data.currentPage}" style="width:55px;display:inline-block">`
                for (i = data.pages - 2; i < data.pages + 1; i++) {
                    html += `<button type="button" class="page-select btn btn-default btn-sm ${i === data.currentPage ? 'active' : ''}" page="${i}">${i}</button>`
                }
            }else{
                for (i = 1; i < data.pages + 1; i++) {
                    html += `<button type="button" class="page-select btn btn-default btn-sm ${i === data.currentPage ? 'active' : ''}" page="${i}">${i}</button>`
                }
            }
            shinobiHubWindowPages.html(html)
        })
    }
    shinobiHubWindow.on('shown.bs.modal',function(){
        loadRows()
    })
    shinobiHubWindow.on('click','.copy',function(){
        var configId = $(this).parents(`[drawn-id]`).attr('drawn-id')
        var json = loadedConfigs[configId].json
        $.aM.import({
            values: mergeDeep($.aM.generateDefaultMonitorSettings(),json)
        })
        $.aM.e.find('[name="mode"]').val('start').change()
        shinobiHubWindow.modal('hide')
        $.aM.e.modal('show')
    })
    shinobiHubWindowPages.on('click','.page-select',function(){
        var pageSelect = parseInt($(this).attr('page')) - 1
        var pageLimit = 10
        loadRows(pageSelect * pageLimit, pageLimit,'0')
    })
    shinobiHubWindow.on('change','.page-number-input',function(){
        var pageSelect = parseInt($(this).val()) - 1
        var pageLimit = 10
        loadRows(pageSelect * pageLimit, pageLimit,'0')
    })
})
