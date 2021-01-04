const firebase = require("firebase");
const d3 = require('d3');
const _ = require('lodash');
const plot = require('./plot.js')
const table = require('./table.js')
const utils = require('./utils.js')
const db = firebase.default.firestore();
const generalSettingsRef = db.doc('settings/general');
const categoryChangesRef = db.doc('settings/categoryChanges');
const metaCategoriesRef = db.doc('settings/metaCategories');
let minMonth
let maxMonth
let loadMinMonth
let allMonths
let allYears
let allLoadMonths
let categoryChanges
let metaCategoryOptions
let metaCategories
let usedMetaCats
let usedCats
let usedTags
let allTx = [];
let transformedTx
let filteredTx
let selections = {
    plotType: 'trend',
    cat: 'All',
    txType: 'expense',
    timeFrame: 'Month',
    includeAverages: 'Yes',
    ignoreMetaCats: [],
    ignoreCats: [],
    requiredTags: [],
    forbiddenTags: []
}
const monthRefs = [];
let monthTx = {}

function renderPage({clone=true, transform=true, filter=true}){
    let mainDiv = d3.select('#mainDiv');
    mainDiv.selectAll("*").remove();
    selections.trendStartTime = selections.trendStartTime || (selections.timeFrame == 'Month' ? loadMinMonth : allYears[0])
    selections.trendEndTime = selections.trendEndTime || (selections.timeFrame == 'Month' ? maxMonth : allYears[allYears.length - 1])
    selections.singlePeriodTime = selections.singlePeriodTime || (selections.timeFrame == 'Month' ? maxMonth : allYears[allYears.length - 1])
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
    let plotTx = getPlotTx(filteredTx)
    let plotData = plot.getPlotData({txs: plotTx, selections: selections})
    addSelections({parentDiv: mainDiv})
    mainDiv.append('div').attr('id', 'txPlot')
    mainDiv.append('div').attr('id', 'txTable')
    plot.renderPlot({traces: plotData, selections: selections, plotElementId: 'txPlot'})
    table.renderTable({tableTx: plotTx, selections: selections, tableElementId: 'txTable'})
}

function addSelections({parentDiv}){
    allTimeValues = selections.timeFrame == 'Month' ? allMonths : allYears
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
            options: allTimeValues.map(m => {
                return {value: m, text: m}
            })
        }, {
            id: 'trendEndTime',
            condition: selections.plotType == 'trend',
            labelText: 'End ' + selections.timeFrame,
            options: allTimeValues.map(m => {
                return {value: m, text: m}
            })
        }, {
            id: 'singlePeriodTime',
            condition: selections.plotType == 'singlePeriod',
            labelText: selections.timeFrame,
            options: allTimeValues.map(m => {
                return {value: m, text: m}
            })
        }, {
            id: 'includeAverages',
            condition: selections.plotType == 'trend',
            labelText: 'Include Averages',
            options: ['Yes', 'No'].map(x => {
                return {value: x, text: x}
            })
        }
    ]
    for (setup of selSetup){
        let id = setup.id + 'Sel'
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
        let condition = setup.condition
        if (condition == undefined){
            condition = true
        }
        if (!condition){
            selDiv.style('display', 'none')
        }
    }
    for (tag of usedTags){
        let id = tag + 'TagSel'
        let selDiv = parentDiv.append('div')
        selDiv.append('label').attr('for', id).text(tag)
        let sel = selDiv.append('select').attr('id', id)
        sel.append('option').attr('value', 'can').html('Can have')
        let cannotOpt = sel.append('option').attr('value', 'cannot').html("Can't have")
        if (selections.forbiddenTags.includes(tag)){
            cannotOpt.attr('selected', true)
        }
        let mustOpt = sel.append('option').attr('value', 'must').html('Must have')
        if (selections.requiredTags.includes(tag)){
            mustOpt.attr('selected', true)
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
            if (sel == 'timeFrame'){
                selections.trendStartTime = undefined
                selections.trendEndTime = undefined
                selections.singlePeriodTime = undefined
            }
            let clone = ['metaCat', 'catChange'].includes(sel)
            let transform = clone 
            let filter = transform || ['txType', 'timeFrame', 'trendStartTime', 'trendEndTime', 'singlePeriodTime'].includes(sel)
            renderPage({clone: clone, transform: transform, filter: filter})
            break
        }
    }
}

function filterTransactions(txs){
    txs = txs.filter(tx => tx.type == selections.txType)
    if (selections.plotType == 'trend'){
        const startDateFilter = selections.trendStartTime + (selections.timeFrame == 'Month' ? '-01' : '')
        const endDateFilter = selections.trendEndTime + (selections.timeFrame == 'Month' ? '-31' : '')
        txs = txs.filter(tx => tx.date >= startDateFilter) 
        txs = txs.filter(tx => tx.date <= endDateFilter)    
    } else if (selections.plotType == 'singlePeriod'){
        const dateFilter = selections.singlePeriodTime
        txs = txs.filter(tx => utils.getSinglePeriod(tx.date, selections.timeFrame) == dateFilter)    
    }    
    usedMetaCats = ['All'].concat(utils.sortedUniqueArray(txs.map(tx => tx.metaCategory)))
    usedCats = utils.sortedUniqueArray(txs.map(tx => tx.category))
    usedTags = utils.sortedUniqueArray(txs.reduce((a, b) => a.concat((b.tags || [])), []))
    txs = txs.filter(tx => {
        return (tx.tags || []).filter(t => selections.forbiddenTags.includes(t)).length == 0
    })
    txs = txs.filter(tx => {
        let hasRequired = selections.requiredTags.map(t => ((tx.tags || []).includes(t) ? 1 : 0))
        hasRequired.push(1)
        return Math.min(...hasRequired) == 1
    })
    return txs
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

function getPlotTx(txs){    
    if (selections.cat != 'All'){
        txs = txs.filter(tx => tx.metaCategory == selections.cat)
    }
    return txs
}

function generalSettingsSnapshot(doc) {
    let data = doc.data()
    minMonth = data.minMonth
    maxMonth = data.maxMonth
    loadMinMonth = utils.monthAdd(maxMonth, -11)
    if (minMonth > loadMinMonth){
        loadMinMonth = minMonth
    }
    allMonths = utils.getAllMonthsBetween(minMonth, maxMonth)
    allLoadMonths = utils.getAllMonthsBetween(loadMinMonth, maxMonth)
    allYears = utils.sortedUniqueArray(allMonths.map(m => m.slice(0, 4)))
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

function main(){
    generalSettingsRef.onSnapshot(doc => generalSettingsSnapshot(doc));
    metaCategoriesRef.onSnapshot(doc => metaCategoriesSnapshot(doc));
    categoryChangesRef.onSnapshot(doc => categoryChangesSnapshot(doc));
}

main()