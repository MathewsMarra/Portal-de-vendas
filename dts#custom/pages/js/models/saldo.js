$('#buscar').click(() => {

    buscar();

    async function buscar(){
        const pCodigo = document.querySelector('#coditem').value
        const json = await BuscarSaldo(pCodigo)
        if(json["tt-saldo"].length)
        {
            json["tt-saldo"].forEach(async element => {
                await Table(element)
            });
        }
	}

})

async function Table(pElement)
{
    const arr = ['it-codigo','cod-estabel','cod-depos','cod-localiz','cod-refer','dt-vali-lote','lote','qtidade-atu']
    const tr = document.createElement('tr')
    arr.forEach(element => {
        const td = document.createElement('td')
        td.innerText = pElement[element]
        tr.append(td)
    });
    const tbody = document.querySelector('tbody')
    tbody.append(tr)
}
