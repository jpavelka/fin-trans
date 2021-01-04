const d3 = require('d3');
const utils = require('./utils.js')

function renderPlot({traces, selections, plotElementId}){
    d3.select('#' + plotElementId).selectAll("*").remove();
    layout = {
        hovermode: 'closest',
        height: 500,
    }
    plotType = selections.plotType
    if (plotType == 'trend'){
        timeFrameStr = selections.timeFrame == 'Month' ? 'Monthly' : 'Yearly'
        transTypeStr = selections.txType == 'expense' ? 'Expenses' : 'Income'
        transCatStr = selections.cat == 'All' ? '' : ' - ' + selections.cat
        layout['title'] = timeFrameStr + ' Trends - ' + transTypeStr + transCatStr
        subtitle = utils.displayTime(selections.trendStartTime) + ' - ' + utils.displayTime(selections.trendEndTime)
        layout['title'] += '<br><sub>' + subtitle + '</sub>'
    } else if (plotType == 'singlePeriod') {
        transTypeStr = selections.txType == 'expense' ? 'Expenses' : 'Income'
        transCatStr = selections.cat == 'All' ? 'All' : selections.cat
        timeStr = utils.displayTime(selections.singlePeriodTime)
        layout['title'] = transCatStr + ' ' + transTypeStr + ' - ' + timeStr
    }
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
    new Plotly.newPlot(plotElementId, traces, layout)
}

function getPlotData({txs, selections}){
    const plotType = selections.plotType
    const timeFrame = selections.timeFrame
    const metaCategoryFilter = selections.cat
    catFilterKey = metaCategoryFilter == 'All' ? 'metaCategory' : 'category'
    let traces = []
    const colors = d3.schemeCategory10
    if (plotType == 'trend'){
        if (timeFrame == 'Month'){
            for (tx of txs){
                tx.xAxisVal = utils.getTransactionMonth(tx)
                tx.nameVal = tx[catFilterKey]
            }        
        } else if (timeFrame == 'Year'){
            for (tx of txs){
                tx.xAxisVal = utils.getTransactionYear(tx)
                tx.nameVal = tx[catFilterKey]
            }
        }
        const xAxisVals = utils.sortedUniqueArray(txs.map(t => t.xAxisVal))
        const nameVals = utils.sortedUniqueArray(txs.map(t => t.nameVal))
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
                trace.x.push(utils.displayTime(xVal))
                trace.y.push(yVal)
                yValTotal[xVal] = (yValTotal[xVal] || 0) + yVal
            }
            traces.push(trace)
        }
        traces = [{
            type: 'scatter',
            name: 'Total',
            x: xAxisVals.map(x => utils.displayTime(x)),
            y: xAxisVals.map(x => yValTotal[x])
        }].concat(traces)
        if (selections.includeAverages == 'Yes'){
            let avgTraces = []
            for ([i, trace] of traces.entries()){
                let colorInd = i % (colors.length)
                trace.line = {color: colors[colorInd]}
                trace.legendgroup = trace.name
                let yAvg = trace.y.reduce((a, b) => a + b, 0) / trace.y.length
                let avgTrace = {
                    type: 'scatter',
                    name: trace.name + ' Avg',
                    x: trace.x,
                    y: trace.y.map(y => yAvg),
                    legendgroup: trace.name,
                    showlegend: false,
                    line: {dash: 'dash', color: pSBC(0.2, colors[colorInd])}
                }
                avgTraces.push(avgTrace)
            }
            traces = traces.concat(avgTraces)
        }
    } else if (plotType == 'singlePeriod'){
        for (tx of txs){
            tx.xAxisVal = tx[catFilterKey]
        }
        const xAxisVals = utils.sortedUniqueArray(txs.map(t => t.xAxisVal))
        let trace = {
            type: 'bar',
            x: [],
            y: [],
        }
        for (xVal of xAxisVals){            
            xValTxs = txs.filter(tx => tx.xAxisVal == xVal)
            yVal = xValTxs.reduce((a, b) => a + b.amount, 0)
            trace.x.push(xVal)
            trace.y.push(yVal)
        }        
        traces.push(trace)
    }
    return traces
}

// Version 4.0
const pSBC=(p,c0,c1,l)=>{
    let r,g,b,P,f,t,h,i=parseInt,m=Math.round,a=typeof(c1)=="string";
    if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
    if(!this.pSBCr)this.pSBCr=(d)=>{
        let n=d.length,x={};
        if(n>9){
            [r,g,b,a]=d=d.split(","),n=d.length;
            if(n<3||n>4)return null;
            x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
        }else{
            if(n==8||n==6||n<4)return null;
            if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
            d=i(d.slice(1),16);
            if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=m((d&255)/0.255)/1000;
            else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
        }return x};
    h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=this.pSBCr(c0),P=p<0,t=c1&&c1!="c"?this.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
    if(!f||!t)return null;
    if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
    else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
    a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
    if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
    else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
}

module.exports = { renderPlot, getPlotData }