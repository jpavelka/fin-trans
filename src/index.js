const firebase = require("firebase");
const d3 = require('d3');
const _ = require('lodash');
const plot = require('./plot.js')
const table = require('./table.js')
const utils = require('./utils.js');
const { selection } = require("d3");
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
            for ([i, tx] of monthTxClone.entries()){
                tx.id = m + '_' + i
            }
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
    addCatModal({parentElement: parentDiv})
    addTagModal({parentElement: parentDiv})
}

function addTagModal({parentElement}){ 
    parentElement.append('button').attr('id', 'tagModalBtn').html('Tag Detail')
    let modalElement = parentElement.append('div').attr('id', 'tagModal').classed('modal', true)
    let contentDiv = modalElement.append('div').classed('modal-content', true)
    contentDiv.append('span').classed('modal-close', true).attr('id', 'tagModalClose').html('&times')
    contentDiv.append('h2').html('Tag Detail')                              
    for (tag of usedTags){
        let id = utils.getIdFromCategory({name: tag, type: 'Tag', extra: 'Sel'})
        let selDiv = contentDiv.append('div')
        selDiv.append('label').attr('for', id).text(tag)
        let sel = selDiv.append('select').attr('id', id).attr('tag', tag).on('change', (e) => tagSelectChange(e))
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
    var modal = document.getElementById("tagModal");
    var btn = document.getElementById("tagModalBtn");
    var span = document.getElementById("tagModalClose");

    btn.onclick = function() {
        modal.style.display = "block";
    }
    span.onclick = function() {
        modal.style.display = "none";
        renderPage({clone: false, transform: false, filter: true})
    }    
}

function tagSelectChange(e){
    let id = e.target.id
    let element = d3.select('#' + id)
    let tag = element.attr('tag')
    let value = element.property('value')
    if (value == 'cannot'){
        selections.forbiddenTags.push(tag)
        selections.requiredTags = selections.requiredTags.filter(t => t != tag)
    } else if (value == 'must'){
        selections.forbiddenTags = selections.forbiddenTags.filter(t => t != tag)
        selections.requiredTags.push(tag)
    } else if (value == 'can'){
        selections.forbiddenTags = selections.forbiddenTags.filter(t => t != tag)
        selections.requiredTags = selections.requiredTags.filter(t => t != tag)
    }
}

function addCatModal({parentElement}){
    parentElement.append('button').attr('id', 'catModalBtn').html('Category Detail')
    let modalElement = parentElement.append('div').attr('id', 'catModal').classed('modal', true)
    let contentDiv = modalElement.append('div').classed('modal-content', true)
    contentDiv.append('span').classed('modal-close', true).attr('id', 'catModalClose').html('&times')
    contentDiv.append('h2').html('Category Detail')
    metaCatSelDiv = contentDiv.append('div')
    metaCatSelDiv.append('label').attr('for', 'metaCatSel').text('Category')
    metaCatSel = metaCatSelDiv.append('select').attr('id', 'metaCatDetailSel').on('change', () => metaCatSelChange())
    let firstMetaCat
    for (metaCat of usedMetaCats){
        if (metaCat != 'All'){
            firstMetaCat = firstMetaCat || metaCat
            metaCatSel.append('option').attr('value', metaCat).html(metaCat)
            let checkboxId = utils.getIdFromCategory({name: metaCat, type: 'metaCat', extra: 'Checkbox'})
            let boxDiv = contentDiv.append('div').attr('id', checkboxId + 'Div')
            boxDiv.append('input').attr('type', 'checkbox').attr('id', checkboxId).property('checked', !selections.ignoreMetaCats.includes(metaCat)).attr('metacat', metaCat)
                  .on('click', (e) => metaCatCheckboxChange(e))
            boxDiv.append('label').attr('for', checkboxId).html('&nbsp;' + metaCat)
            if (metaCat != firstMetaCat){
                boxDiv.style('display', 'none')
            }
        }        
    }
    for (cat of usedCats){
        let checkboxId = utils.getIdFromCategory({name: cat, type: 'cat', extra: 'Checkbox'})
        let boxDiv = contentDiv.append('div').attr('id', checkboxId + 'Div').style('margin-left', '15px')
        boxDiv.append('input').attr('type', 'checkbox').attr('id', checkboxId).property('checked', !selections.ignoreCats.includes(cat)).attr('cat', cat)
              .on('click', (e) => catCheckboxChange(e))
        boxDiv.append('label').attr('for', checkboxId).html('&nbsp;' + cat)
        if (!metaCategories[firstMetaCat].includes(cat)){
            boxDiv.style('display', 'none')
        }
    }
    var modal = document.getElementById("catModal");
    var btn = document.getElementById("catModalBtn");
    var span = document.getElementById("catModalClose");

    btn.onclick = function() {
        modal.style.display = "block";
    }
    span.onclick = function() {
        modal.style.display = "none";
        renderPage({clone: false, transform: false, filter: true})
    }
}

function metaCatSelChange(){
    let changedMetaCat = d3.select('#metaCatDetailSel').property('value')
    for (metaCat of usedMetaCats){
        let checkboxId = utils.getIdFromCategory({name: metaCat, type: 'metaCat', extra: 'Checkbox'})
        let boxDiv = d3.select('#' + checkboxId + 'Div')
        boxDiv.style('display', metaCat == changedMetaCat ? 'block' : 'none')
    }
    for (cat of usedCats){
        let checkboxId = utils.getIdFromCategory({name: cat, type: 'cat', extra: 'Checkbox'})
        let boxDiv = d3.select('#' + checkboxId + 'Div')
        boxDiv.style('display', metaCategories[changedMetaCat].includes(cat) ? 'block' : 'none')
    }
}

function metaCatCheckboxChange(e){
    let id = e.target.id
    let element = d3.select('#' + id)
    let metaCat = element.attr('metacat')
    let checked = element.property('checked')
    for (cat of metaCategories[metaCat]){
        d3.select('#' + utils.getIdFromCategory({name: cat, type: 'cat', extra: 'Checkbox'})).property('checked', checked)
        alterIgnoreCats(cat, !checked)
    }
    alterIgnoreMetaCats(metaCat, !checked)
}

function catCheckboxChange(e){
    let id = e.target.id
    let element = d3.select('#' + id)
    let cat = element.attr('cat')
    let checked = element.property('checked')
    alterIgnoreCats(cat, !checked)
}

function alterIgnoreCats(cat, add){
    selections.ignoreCats = selections.ignoreCats.filter(c => c != cat)
    if (add){
        selections.ignoreCats.push(cat)
    }
}

function alterIgnoreMetaCats(metaCat, add){
    selections.ignoreMetaCats = selections.ignoreMetaCats.filter(mc => mc != metaCat)
    if (add){
        selections.ignoreMetaCats.push(metaCat)
    }
}

function selChange(){
    for (sel of Object.keys(selections)){
        try {
            selections[sel] != d3.select('#' + sel + 'Sel').property('value')
        } catch {
            continue
        }
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
            let allLoadMonthsChanged = false
            if (sel == 'trendStartTime'){
                let newLoadMinMonthCandidate
                if (selections.timeFrame == 'Month'){
                    newLoadMinMonthCandidate = selections.trendStartTime
                } else if (selections.timeFrame == 'Year'){
                    newLoadMinMonthCandidate = selections.trendStartTime + '-01'
                }
                if (newLoadMinMonthCandidate < loadMinMonth){
                    loadMinMonth = newLoadMinMonthCandidate
                    allLoadMonths = utils.getAllMonthsBetween(loadMinMonth, maxMonth)
                    allLoadMonthsChanged = true
                    loadDataForAllLoadMonths()
                }
            }
            if (!allLoadMonthsChanged){
                let clone = ['metaCat', 'catChange'].includes(sel) || allLoadMonthsChanged
                let transform = clone 
                let filter = transform || ['txType', 'timeFrame', 'trendStartTime', 'trendEndTime', 'singlePeriodTime', 'plotType'].includes(sel)
                renderPage({clone: clone, transform: transform, filter: filter})
            }
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
    let catsInMetaCats = Object.values(metaCategories).reduce((a, b) => a.concat(b), [])
    metaCategories['Misc'] = usedCats.filter(cat => !catsInMetaCats.includes(cat))
    txs = txs.filter(tx => {
        return (tx.tags || []).filter(t => selections.forbiddenTags.includes(t)).length == 0
    })
    txs = txs.filter(tx => {
        let hasRequired = selections.requiredTags.map(t => ((tx.tags || []).includes(t) ? 1 : 0))
        hasRequired.push(1)
        return Math.min(...hasRequired) == 1
    })
    txs = txs.filter(tx => !selections.ignoreCats.includes(tx.category))
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
    loadDataForAllLoadMonths()
}

function loadDataForAllLoadMonths(){
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