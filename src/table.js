const d3 = require('d3');
const utils = require('./utils.js')

function renderTable({tableTx, tableElementId}){
    d3.select('#' + tableElementId).selectAll("*").remove();
    var tableFilterObjs = {
        'account': {values: {}},
        'category': {values: {}},
        'metaCategory': {values: {}},
        'tags': {values: {}}
    }
    for (x of Object.keys(tableFilterObjs)){
        if (tableTx.length > 0){
            let arr = tableTx.filter(d => d[x] != undefined).map(d => d[x])
            if (typeof tableTx[0][x] != 'string') {
                arr = arr.reduce((a, b) => a.concat(b), [])
            }
            arr = utils.sortedUniqueArray(arr)
            for (y of arr){
                tableFilterObjs[x].values[y] = y
            }
        }   
    }
    var tableColumns = [
        {title: 'Date', field: 'date', headerFilter: 'input', width: 100},
        {title: 'Amount', field: 'amount', align: 'right', formatter: cell => utils.currencyFormatter.format(cell.getValue()), headerFilter: 'input', width: 100},
        {title: 'Description', field: 'description', headerFilter: 'input', width: 200},
        {title: 'Meta Category', field: 'metaCategory', headerFilter: 'select', headerFilterParams: tableFilterObjs['metaCategory'], width: 100},
        {title: 'Category', field: 'category', headerFilter: 'select', headerFilterParams: tableFilterObjs['category'], width: 100},
        {title: 'Comment', field: 'comment', headerFilter: 'input', width: 200},        
        {title: 'Tags', field: 'tags', formatter: cell => tagsFormatter(cell.getValue()), headerFilter: 'input', headerFilterParams: tableFilterObjs['tags'], width: 100},
        {title: 'Account', field: 'account', headerFilter: 'input', width: 100, headerFilter: 'select', headerFilterParams: tableFilterObjs['account'], width: 100},
    ]
    var txTable = new Tabulator('#' + tableElementId, {
        data: tableTx,
        columns: tableColumns,
        initialSort: [{column: 'date', dir: 'desc'}],
        pagination: 'local',
        paginationSize: 15,
        // cellEdited: function(cell){
        //     console.log(cell)
        // }
    })
}

function tagsFormatter(value){
    value = value || []
    return value.join(', ')
}

module.exports = { renderTable }