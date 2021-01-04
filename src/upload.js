const firebase = require("firebase");
const d3 = require('d3');
const csv = require('csvtojson')
const loginCheck = require('./login-check');
const { tsv } = require("d3");
const db = firebase.default.firestore();
const monthsRef = db.collection("months");
const generalSettingsRef = db.doc('settings/general');
let minMonth
let maxMonth

function main(){
    d3.select('body').append('input').attr('type', 'file').attr('id', 'file-selector')
    document.getElementById('file-selector') 
        .addEventListener('change', function() {
            var fr = new FileReader(); 
            fr.onload = frOnload
            fr.readAsText(this.files[0]);
        })
}

async function frOnload(e){
    let raw = e.target.result
    let fileData
    try{
        fileData = JSON.parse(raw)
    } catch {
        fileData = await jsonFromCsv(raw)
    }
    fileData = sanitizeTxs(fileData)
    generalSettingsRef.onSnapshot(doc => generalSettingsSnapshot(doc));
    let oldMonthTx = {}
    let newMonthTx = {}
    const allMonths = [... new Set(fileData.map(d => getTransactionMonth(d)))]
    for (m of allMonths){
        newMonthTx[m] = []
        oldMonthTx[m] = await getMonthObject(m)
    }    
    fileData.map(d => {
        newMonthTx[getTransactionMonth(d)].push(d)
    })
    let upload = window.prompt('Are you sure you want to upload (yes/no)?')
    if (upload.toLowerCase() == 'yes'){
        for (m of allMonths){
            let allTx = oldMonthTx[m].concat(newMonthTx[m])
            monthsRef.doc(m).set({transactions: allTx}, {merge: true})
                .then(() => {
                    window.alert('Transactions uploaded successfully for month ' + m)
                })
                .catch((e) => {
                    window.alert('There was an issue uploading the transactions: ', e)
                })
        }
    } else {
        window.alert('No transactions will be uploaded')
    }
}

function jsonFromCsv(s){
    return csv().fromString(s).then(jsonObj => {
        return jsonObj
    })
}

function sanitizeTxs(obj){
    const newObj = obj.map(x => {
        return Object.fromEntries(
            Object.entries(x).map(([k, v]) => [k.toLowerCase(), v])
        )}
    )
    for (tx of newObj){
        tx.date = new Date(tx.date).toISOString().slice(0, 10)
        if (tx.tags != undefined){
            if (typeof tx.tags == 'string'){
                tx.tags = tx.tags.split(',')
            }
            tx.tags = tx.tags.map(x => x.trim())
        }
    }
    return newObj
}


function getTransactionMonth(t){
    return t.date.slice(0, 7)
}


function queryForMonthObject(m){
    let monthData = monthsRef.doc(m)
        .get()
        .then(function(doc) {
            if (doc.exists){
                return doc.data()
            } else {
                newMonthFunc(m)
                return {transactions: []}
            }            
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
            return null
        });
    return monthData
}

async function getMonthObject(m){
    let monthObject = await queryForMonthObject(m)
    return monthObject.transactions || []
}

function newMonthFunc(m){
    if (m > maxMonth){
        generalSettingsRef.set({maxMonth: m}, {merge: true})
    }
    if (m < minMonth){
        generalSettingsRef.set({minMonth: m}, {merge: true})
    }
}

function generalSettingsSnapshot(doc) {
    let data = doc.data()
    minMonth = data.minMonth
    maxMonth = data.maxMonth
}

main()
