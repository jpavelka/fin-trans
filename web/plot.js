function createPlot(transData, selVals, otherPlotData, includeAverages) {
    includeAverages = includeAverages || true
    var plotType = selVals.plotType
    var plotData = transData.map(d => getPlotData(d, selVals.plotType, selVals.transCat, selVals.timeFrame))
    var traceNames = sortedUniqueArray(plotData.map(d => d.traceName))
    var colors = d3.schemeCategory20
    if (plotType == 'trend'){
        traceNames = ['Total'].concat(traceNames)
    }
    var xVals
    if (plotType == 'trend'){
        xVals = sortedUniqueArray(otherPlotData.timeSelections.filter(x => {
            return x >= selVals.startTime && x <= selVals.endTime
        }))
    } else {
        xVals = sortedUniqueArray(plotData.map(d => d.x))
    }
    plotlyDataObj = {}
    traceNames.map(t => {
        plotlyDataObj[t] = {
            name: t,
            legendgroup: t,
            hoverinfo: 'text',
            text: [],
            _selVals: selVals,
            y: {},
        }
        if (plotType == 'trend'){
            plotlyDataObj[t].type = 'scatter'
            plotlyDataObj[t].x = xVals.map(x => displayTime(x, 'yaxis'))
            plotlyDataObj[t]._cat = t
            plotlyDataObj[t]._xOrig = xVals
        } else if (plotType == 'singlePeriod'){
            plotlyDataObj[t].type =  'bar'
            plotlyDataObj[t].x = [t]
        }
        (plotType == 'trend' ? xVals : [t]).map(x => {
            plotlyDataObj[t].y[x] = 0
        })
    })
    plotData.map(d => {
        plotlyDataObj[d.traceName].y[d.x] += d.y
        if (Object.keys(plotlyDataObj).includes('Total')){
            plotlyDataObj['Total'].y[d.x] += d.y
        }
    })
    plotlyData = traceNames.map(t => {
        plotlyDataObj[t].y = Object.values(plotlyDataObj[t].y)
        return plotlyDataObj[t]
    })
    var traceSums = {}
    plotlyData.map(d => {
        traceSums[d.name] = d.y.reduce((a, b) => a + b, 0)
    })
    plotlyData = plotlyData.filter(d => traceSums[d.name] > 0)
    plotlyData.map((d, i) => {
        d._colorInd = getColorInd(i, colors)
        d._yAvg = traceSums[d.legendgroup] / d.y.length
        var colorObj = plotType == 'trend' ? 'line' : 'marker'
        d[colorObj] = d[colorObj] || {}
        d[colorObj].color = colors[d._colorInd]
        d.x.map((x, j) => {
            s = d.name + '<br>'
            if (plotType == 'trend'){
                s += x + '<br>'
            }
            s += currencyFormatter.format(d.y[j])
            d.text[j] = s
        })
        d.name += ' - ' + currencyFormatter.format(traceSums[d.name])
    })
    if (plotType == 'trend' && includeAverages){
        var averages = plotlyData.map(d => {
            return {
                type: 'scatter',
                legendgroup: d.legendgroup,
                x: d.x,
                y: d.y.map(y => d._yAvg),
                showlegend: false,
                hoverinfo: 'text',
                text: d.text.map(t => 'Avg. ' + d.legendgroup + '<br>' + currencyFormatter.format(d._yAvg)),
                line: {dash: 'dash', color: colors[d._colorInd + 1]}
            }
        })
        plotlyData = plotlyData.concat(averages)
    }

    layout = {
        hovermode: 'closest',
        height: 500,
    }
    if (plotType == 'trend'){
        timeFrameStr = selVals.timeFrame == 'month' ? 'Monthly' : 'Yearly'
        transTypeStr = selVals.transType == 'expense' ? 'Expenses' : 'Income'
        transCatStr = selVals.transCat == 'all' ? '' : ' - ' + selVals.transCat
        layout['title'] = timeFrameStr + ' Trends - ' + transTypeStr + transCatStr
        subtitle = displayTime(selVals.startTime) + ' - ' + displayTime(selVals.endTime)
        layout['title'] += '<br><sub>' + subtitle + '</sub>'
    } else if (plotType == 'singlePeriod') {
        transTypeStr = selVals.transType == 'expense' ? 'Expenses' : 'Income'
        transCatStr = selVals.transCat == 'all' ? 'All' : selVals.transCat
        timeStr = displayTime(selVals.time)
        layout['title'] = transCatStr + ' ' + transTypeStr + ' - ' + timeStr
    }
    if (plotlyData.length == 0){
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
    new Plotly.newPlot('transPlot', plotlyData, layout)
    document.getElementById('transPlot').on('plotly_click', data => {
        var d = data.points[0]
        var selVals = d.data._selVals
        if (plotType == 'trend'){
            tableData = transData.filter(x => {
                var clickTime = d.data._xOrig[d.pointIndex]
                var clickCat = d.data._cat
                correctTime = getTime(x, selVals.timeFrame) == clickTime
                correctCat = clickCat == 'Total' || getCat(x, selVals.transCat) == clickCat
                return correctTime && correctCat
            })
        } else if (plotType == 'singlePeriod') {
            tableData = transData.filter(x => getCat(x, selVals.transCat) == d.x)
        }
        createTable(tableData)
    })
}

function sortedUniqueArray(x, reverse){
    arr = Array.from(new Set(x)).sort()
    if (reverse){
        return arr.reverse()
    }
    return arr
}

function getPlotData(d, plotType, transCat, timeFrame){
    var plotData = {}
    if (plotType == 'trend'){
        plotData.x = getTime(d, timeFrame)
        plotData.y = d.amount
        plotData.traceName = getCat(d, transCat)
    } else if (plotType == 'singlePeriod'){
        plotData.x = getCat(d, transCat)
        plotData.y = d.amount
        plotData.traceName = getCat(d, transCat)
    }
    return plotData
}

function getTime(d, timeFrame){
    if (timeFrame == 'month'){
        return d.date.slice(0, 7)
    } else if (timeFrame == 'year'){
        return d.date.slice(0, 4)
    }
}

function displayTime(d, loc){
    if (d.length == 7){
        return moment(d).format("MMM YYYY")
    } else if (d.length == 4){
        return loc == 'yaxis' ? "Year<br>" + d : d
    }
}

function getCat(d, transCat){
    if (transCat == 'all'){
        return d.metaCat
    } else {
        return d.category
    }
}

function getColorInd(i, colors, colorType){
    colorType = colorType || 'primary'
    i = i % (colors.length / 2)
    return 2 * i + (colorType == 'primary' ? 0 : 1)
}
