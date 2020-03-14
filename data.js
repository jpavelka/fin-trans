function main(){
    var metaCatName = "Default"
    var metaCats = allMetaCats[metaCatName]

    var sels = ["hello", "goodbye"]

    var plotTypeSelect = d3.select('#selections')
        .append('select')
        .attr('class', 'select')

    var plotTypeSelectOptions = plotTypeSelect
        .selectAll('option')
        .data(sels).enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d)

    createPlot(transData, metaCats)
    createTable(transData)
}