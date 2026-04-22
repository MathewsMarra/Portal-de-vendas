function FormatarMoeda(numero){
    return Number(numero.replace(/\./g, "").replace(/\,/g, "."))
}

function GeradorID(){
    return Math.floor(Math.random() * 1000000000)
}

function FormataHoraParaHorolog(hora)
{
    const a = hora.split(':'); // split it at the colons
    const segundos = (+a[0]) * 60 * 60 + (+a[1]) * 60; 
    return segundos
}

function FormataHoraParaDatetime(hora)
{
    return `0000-00-00 ${hora}`
}

function Hoje()
{
    const dt = new Date()
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString().split('T')[0];
}

function GetHoras(pData)
{
    return pData.split(' ')[1].toString()
}

function GetData(pData)
{
    return pData.split(' ')[0].toString().split("-").reverse().join("/")
}

function GetDataFormatada(pData)
{
    return pData.replace(' 00:00:00','')
}

async function DistincJSON(pJson,pCampoID,pCampoNome)
{
    const result = [];
    const map = new Map();
    for (const item of pJson) {
        if(!map.has(item[pCampoNome])){
            map.set(item[pCampoNome], true);    // set any value to Map
            result.push({
                id: item[pCampoID],
                name: item[pCampoNome]
            });
        }
    }
    return result
}

function GetParamFromURL(pParam)
{
    return new URLSearchParams(window.location.search).get(pParam)
}