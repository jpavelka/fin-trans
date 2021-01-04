const d3 = require('d3');
const utils = require('./utils.js')

function renderTable({tableTx, tableElementId}){
    d3.select('#' + tableElementId).selectAll("*").remove();
    var tableFilterObjs = {
        'account': {values: {}},
        'category': {values: {}},
        'metaCategory': {values: {}}
    }
    for (x of Object.keys(tableFilterObjs)){
        let arr = utils.sortedUniqueArray(tableTx.map(d => d[x]))
        for (y of arr){
            tableFilterObjs[x].values[y] = y
        }
    }
    var tableColumns = [
        {title: 'Date', field: 'date', headerFilter: 'input', width: 100},
        {title: 'Amount', field: 'amount', align: 'right', formatter: cell => currencyFormatter.format(cell.getValue()), headerFilter: 'input', width: 100},
        {title: 'Description', field: 'description', headerFilter: 'input', width: 200},
        {title: 'Meta Category', field: 'metaCategory', headerFilter: 'select', headerFilterParams: tableFilterObjs['metaCategory'], width: 100},
        {title: 'Category', field: 'category', headerFilter: 'select', headerFilterParams: tableFilterObjs['category'], width: 100},
        {title: 'Comment', field: 'comment', headerFilter: 'input', width: 200},        
        {title: 'Tags', field: 'tags', formatter: cell => tagsFormatter(cell.getValue()), headerFilter: 'input', width: 100},
        {title: 'Account', field: 'account', headerFilter: 'input', width: 100, headerFilter: 'select', headerFilterParams: tableFilterObjs['account'], width: 100},
    ]
    var txTable = new Tabulator('#' + tableElementId, {
        data: tableTx,
        columns: tableColumns,
        initialSort: [{column: 'date', dir: 'desc'}],
        pagination: 'local',
        paginationSize: 15
    })
}

function tagsFormatter(value){
    value = value || []
    return value.join(', ')
}

currencyFormatter = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2})

module.exports = { renderTable }