async function connectorHTTP(pUrl, pTipo, pMetodo, pQueryString, pBody, pHeader)
{
    var json = await $.ajax({
        url: pUrl + pMetodo + pQueryString,
        type: pTipo,
        dataType: 'json',
        data: pBody,
        headers: pHeader,
        success: function (data, textStatus, xhr) {
            return data;
        },
        error:  function (xhr, textStatus, errorThrown) {
            console.log(xhr);
            console.log("Status: "+xhr.status+" \nMessage: "+xhr.responseText)
        }
    });
    return json;
};



