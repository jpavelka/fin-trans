function createTable(transData) {
    var tableFilterObjs = {
        'account': {values: {}},
        'category': {values: {}},
        'metaCat': {values: {}}
    }
    Object.keys(tableFilterObjs).map(x => {
        sortedUniqueArray(transData.map(d => d[x])).map(y => {
            tableFilterObjs[x].values[y] = y
        })
    })
    var tableColumns = [
        {title: 'Date', field: 'date', headerFilter: 'input', width: 100},
        {title: 'Account', field: 'account', headerFilter: 'input', width: 100, headerFilter: 'select', headerFilterParams: tableFilterObjs['account'], width: 100},
        {title: 'Description', field: 'description', headerFilter: 'input', width: 200},
        {title: 'Meta Category', field: 'metaCat', headerFilter: 'select', headerFilterParams: tableFilterObjs['metaCat'], width: 100},
        {title: 'Category', field: 'category', headerFilter: 'select', headerFilterParams: tableFilterObjs['category'], width: 100},
        {title: 'Comment', field: 'comment', headerFilter: 'input', width: 200},
        {title: 'Amount', field: 'amount', align: 'right', formatter: cell => currencyFormatter.format(cell.getValue()),
            headerFilter: 'input', width: 100}
    ]
    var skuTable = new Tabulator('#transTable', {
        data: transData,
        columns: tableColumns,
        initialSort: [{column: 'date', dir: 'desc'}],
        pagination: 'local',
        paginationSize: 15
    })
}