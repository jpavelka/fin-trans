const firebase = require("firebase");
const d3 = require('d3');
const _ = require('lodash');
var db = firebase.default.firestore();
const generalSettingsRef = db.doc('settings/general');
const categoryChangesRef = db.doc('settings/categoryChanges');
const metaCategoriesRef = db.doc('settings/metaCategories');
let minMonth
let maxMonth
let loadMinMonth
let allMonths
let allLoadMonths
let categoryChanges
let metaCategoryOptions
let metaCategories
let usedMetaCats
let allTx = [];
let transformedTx
let filteredTx
let selections = {
    plotType: 'trend',
    cat: 'All',
    txType: 'expense',
    timeFrame: 'Month',
    trendStartTime: loadMinMonth,
    trendEndTime: maxMonth,
    singlePeriodTime: maxMonth
}
const monthRefs = [];
let monthTx = {}

function renderPage({clone=true, transform=true, filter=true}){
    let mainDiv = d3.select('#mainDiv');
    mainDiv.selectAll("*").remove();
    while (metaCategoryOptions == undefined || categoryChanges == undefined){
        console.log('waiting')
    }
    if (clone){
        for (m of allLoadMonths){
            let monthTxClone = _.cloneDeep(monthTx[m])
            allTx = allTx.concat(monthTxClone)
        }
    }
    metaCategories = metaCategoryOptions[selections.metaCat]
    if (transform){
        transformedTx = transformTransactions(allTx)
    }
    if (filter){
        filteredTx = filterTransactions(transformedTx)
    }
    usedMetaCats = ['All'].concat(sortedUniqueArray(filteredTx.map(tx => tx.metaCategory)))
    let plotTx = getPlotTx(filteredTx)
    let plotData = getPlotData(plotTx)
    addSelections({parentDiv: mainDiv})
    mainDiv.append('div').attr('id', 'txPlot')
    mainDiv.append('div').attr('id', 'txTable')
    renderPlot(plotData)
    renderTable(plotTx)
}

function addSelections({parentDiv}){
    let selSetup = [
        {
            id: 'metaCat',
            labelText: 'Category Groups',
            options: [
                {value: 'v1', text: 'v1'}
            ]
        }, {
            id: 'plotType',
            labelText: 'Plot Type',
            options: [
                {value: 'trend', text: 'Trend'},
                {value: 'singlePeriod', text: 'Single Period'}
            ]
        }, {
            id: 'txType',
            labelText: 'Transaction Type',
            options: [
                {value: 'expense', text: 'Expense'},
                {value: 'income', text: 'Income'}
            ]
        }, {
            id: 'cat',
            labelText: 'Category',
            options: usedMetaCats.map(x => {
                return {value: x, text: x}
            })
        }, {
            id: 'timeFrame',
            labelText: 'Time Frame',
            options: [
                {value: 'Month', text: 'Month'},
                {value: 'Year', text: 'Year'},
            ]
        }, {
            id: 'trendStartTime',
            condition: selections.plotType == 'trend',
            labelText: 'Start ' + selections.timeFrame,
            options: allMonths.map(m => {
                return {value: m, text: m}
            })
        }, {
            id: 'trendEndTime',
            condition: selections.plotType == 'trend',
            labelText: 'End ' + selections.timeFrame,
            options: allMonths.map(m => {
                return {value: m, text: m}
            })
        }, {
            id: 'singlePeriodTime',
            condition: selections.plotType == 'singlePeriod',
            labelText: selections.timeFrame,
            options: allMonths.map(m => {
                return {value: m, text: m}
            })
        }
    ]
    for (setup of selSetup){
        let id = setup.id + 'Sel'
        let condition= setup.condition
        if (condition == undefined){
            condition = true
        }
        if (condition){
            let selDiv = parentDiv.append('div')
            selDiv.append('label').attr('for', id).text(setup.labelText)
            let sel = selDiv.append('select').attr('id', id).on('change', () => {
                selChange()
            })
            for (op of setup.options){
                option = sel.append('option').attr('value', op.value).html(op.text)
                if (selections[setup.id] == op.value){
                    option.attr('selected', true)
                }
            }
        }
    }
}

function selChange(){
    for (sel of Object.keys(selections)){
        if (selections[sel] != d3.select('#' + sel + 'Sel').property('value')){
            selections[sel] = d3.select('#' + sel + 'Sel').property('value')
            if (sel == 'txType'){
                selections['cat'] = 'All'
            }
            let clone = ['metaCat', 'catChange'].includes(sel)
            let transform = clone 
            let filter = transform || ['txType'].includes(sel)
            renderPage({clone: clone, transform: transform, filter: filter})
            break
        }
    }
}

function renderPlot(traces){
    d3.select('#txPlot').selectAll("*").remove();
    layout = {
        hovermode: 'closest',
        height: 500,
    }
    // if (plotType == 'trend'){
    //     timeFrameStr = selVals.timeFrame == 'month' ? 'Monthly' : 'Yearly'
    //     transTypeStr = selVals.transType == 'expense' ? 'Expenses' : 'Income'
    //     transCatStr = selVals.transCat == 'All' ? '' : ' - ' + selVals.transCat
    //     layout['title'] = timeFrameStr + ' Trends - ' + transTypeStr + transCatStr
    //     subtitle = displayTime(selVals.startTime) + ' - ' + displayTime(selVals.endTime)
    //     layout['title'] += '<br><sub>' + subtitle + '</sub>'
    // } else if (plotType == 'singlePeriod') {
    //     transTypeStr = selVals.transType == 'expense' ? 'Expenses' : 'Income'
    //     transCatStr = selVals.transCat == 'All' ? 'All' : selVals.transCat
    //     timeStr = displayTime(selVals.time)
    //     layout['title'] = transCatStr + ' ' + transTypeStr + ' - ' + timeStr
    // }
    if (traces.length == 0){
        layout.annotations = [{
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.75,
            text: 'No data for current selection',
            font: {
                size: 32
            },
            showarrow: false,
        }]
        layout.xaxis = {
            showgrid: false,
            zeroline: false,
            showticklabels: false
        }
        layout.yaxis = {
            showgrid: false,
            zeroline: false,
            showticklabels: false
        }
    }
    new Plotly.newPlot('txPlot', traces, layout)
}

function filterTransactions(txs){
    const startDateFilter = minMonth + '-01'
    const endDateFilter = maxMonth + '-31'
    txs = txs.filter(tx => tx.type == selections.txType)    
    txs = txs.filter(tx => tx.date >= startDateFilter)    
    txs = txs.filter(tx => tx.date <= endDateFilter)    
    return txs
}

function getPlotTx(txs){    
    if (selections.cat != 'All'){
        txs = txs.filter(tx => tx.metaCategory == selections.cat)
    }
    return txs
}

function getPlotData(txs){
    const plotType = selections.plotType
    let traces = []
    if (plotType == 'trend'){
        const timeFrame = 'month'
        const metaCategoryFilter = selections.cat
        nameKey = metaCategoryFilter == 'All' ? 'metaCategory' : 'category'
        if (timeFrame == 'month'){
            for (tx of txs){
                tx.xAxisVal = getTransactionMonth(tx)
                tx.nameVal = tx[nameKey]
            }        
        }
        const xAxisVals = sortedUniqueArray(txs.map(t => t.xAxisVal))
        const nameVals = sortedUniqueArray(txs.map(t => t.nameVal))
        let yValTotal = {}
        for (nameVal of nameVals){
            let trace = {
                type: 'scatter',
                name: nameVal,
                x: [],
                y: [],
            }
            nameTxs = txs.filter(tx => tx.nameVal == nameVal)
            for (xVal of xAxisVals){
                xValTxs = nameTxs.filter(tx => tx.xAxisVal == xVal)
                yVal = xValTxs.reduce((a, b) => a + b.amount, 0)
                trace.x.push(xVal)
                trace.y.push(yVal)
                yValTotal[xVal] = (yValTotal[xVal] || 0) + yVal
            }
            traces.push(trace)
        }
        traces = [{
            type: 'scatter',
            name: 'Total',
            x: xAxisVals,
            y: xAxisVals.map(x => yValTotal[x])
        }].concat(traces)
    }
    return traces
}

function renderTable(tableTx){
    d3.select('#txTable').selectAll("*").remove();
    var tableFilterObjs = {
        'account': {values: {}},
        'category': {values: {}},
        'metaCategory': {values: {}}
    }
    for (x of Object.keys(tableFilterObjs)){
        let arr = sortedUniqueArray(tableTx.map(d => d[x]))
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
    var txTable = new Tabulator('#txTable', {
        data: tableTx,
        columns: tableColumns,
        initialSort: [{column: 'date', dir: 'desc'}],
        pagination: 'local',
        paginationSize: 15
    })
}

function transformTransactions(transactions){
    const categoriesToChange = Object.keys(categoryChanges)
    metaCatInverse = {}
    for (mc of Object.keys(metaCategories)){
        for (c of metaCategories[mc]){
            metaCatInverse[c] = mc
        }
    }
    for (tx of transactions){
        if (categoriesToChange.includes(tx.category)){
            tx.category = categoryChanges[tx.category]
        }
        tx.metaCategory = metaCatInverse[tx.category] || 'Misc'
        tx.type = tx.amount < 0 ? 'expense' : 'income'
        tx.amount = Math.abs(tx.amount)
    }
    return transactions.filter(tx => tx.metaCategory != 'Ignore')
}

function main(){
    generalSettingsRef.onSnapshot(doc => generalSettingsSnapshot(doc));
    metaCategoriesRef.onSnapshot(doc => metaCategoriesSnapshot(doc));
    categoryChangesRef.onSnapshot(doc => categoryChangesSnapshot(doc));
}

function generalSettingsSnapshot(doc) {
    let data = doc.data()
    minMonth = data.minMonth
    maxMonth = data.maxMonth
    loadMinMonth = monthAdd(maxMonth, -11)
    if (minMonth > loadMinMonth){
        loadMinMonth = minMonth
    }
    allMonths = getAllMonthsBetween(minMonth, maxMonth)
    allLoadMonths = getAllMonthsBetween(loadMinMonth, maxMonth)
    console.log(allLoadMonths)
    for (m of allLoadMonths){
        if (!Object.keys(monthTx).includes(m)){
            monthRefs[m] = db.doc('months/' + m)
            monthRefs[m].onSnapshot(doc => monthSnapshot(doc));
        }
    }
}

function monthSnapshot(doc){
    monthTx[doc.id] = doc.data().transactions
    for (m of allLoadMonths){
        if (!Object.keys(monthTx).includes(m)){
            return
        }
    }
    renderPage({})
}

function metaCategoriesSnapshot(doc){
    metaCategoryOptions = doc.data()
    selections.metaCat = metaCategoryOptions._default
}

function categoryChangesSnapshot(doc){
    categoryChanges = doc.data().v1
}

function getAllMonthsBetween(min, max){
    let allMonthsBetween = []
    let i = 0
    while (true){
        nextMonth = monthAdd(min, i)
        if (nextMonth <= max){
            allMonthsBetween.push(nextMonth)
        } else {
            break
        }
        i += 1
    }
    return allMonthsBetween
}

function monthAdd(month, n){
    m = new Date(month + '-15')
    m.setMonth(m.getMonth() + n)
    return m.toISOString().slice(0, 7)
}

function sortedUniqueArray(x, reverse){
    arr = Array.from(new Set(x)).sort()
    if (reverse){
        return arr.reverse()
    }
    return arr
}

function tagsFormatter(value){
    value = value || []
    return value.join(', ')
}

currencyFormatter = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2})

function getTransactionMonth(t){
    return t.date.slice(0, 7)
}

main()