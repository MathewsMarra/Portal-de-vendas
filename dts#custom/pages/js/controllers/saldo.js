$(document).ready(function(){

    const code = `<!-- Button Mensagem modal -->
    <button id="btnModal" type="button" class="btn btn-primary d-none" data-toggle="modal" data-target="#mensagemModal">
    </button>
    
    <!-- Modal Mensagem-->
    <div class="modal fade" id="mensagemModal" tabindex="-1" role="dialog" aria-labelledby="mensagemModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
    <div class="modal-content">
    <div class="modal-header">
    <h5 class="modal-title" id="tituloModal">Mensagem</h5>
    <button type="button" class="close" data-dismiss="modal" aria-label="Ok">
    <span aria-hidden="true">&times;</span>
    </button>
    </div>
    <div id="bodyMensagem" class="modal-body">
    ...
    </div>
    <div class="modal-footer">
        <a href="/index"><button type="button" id="modalOk" class="btn btn-primary" data-dismiss="modal">Ok</button></a>
    </div>
    </div>
    </div>
    </div>`
    const html = document.querySelector('html');
    const htmlObject = document.createElement('div');
    htmlObject.innerHTML = code;
    html.append(htmlObject);
});

async function BodyModal(pBodyText){
    const body = document.querySelector("#bodyMensagem");
    body.innerText = pBodyText
}

async function AbrirModal(){
    document.querySelector("#btnModal").click()
}

// function modal(){
//     window.location = "/index"
// }

// $('#modalOk').click(() => {
//     event.preventDefault();
//     modal();

//     async function modal(){
//         window.location = "/index"
// 	}

// })

