SERVER = window.location.origin

//=========================================================REST
async function BuscarSaldo(pCodigo)
{
    const pParams= `?codigo=${pCodigo}`
    console
    return await connectorHTTP(`${SERVER}${'/dts/datasul-rest/resources/prg/rest-api/v2/saldoEstoque/'}`,'GET','',pParams,'','')
}

//=============================================================


