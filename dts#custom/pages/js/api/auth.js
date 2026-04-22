
async function Basic()
{
    let login   = document.querySelector('#login').value;
    let senha   = document.querySelector('#senha').value;
    let base64  = btoa(`${login}:${senha}`);
    let basic   = "Basic " + base64;

    return basic
}


async function SetCookie(pParameter)
{
    let d = new Date(pParameter.DataExpiracao);
    var expires = "expires="+ d.toUTCString();

    document.cookie = `token=${pParameter.Token};${expires};`
    document.cookie = `user=${pParameter.IDUsuario};${expires};`

    return true
}

async function GetCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
  }

