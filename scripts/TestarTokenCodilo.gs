/**
 * SCRIPT STAND-ALONE: Gerador de Token Codilo
 * 
 * Este script serve apenas para testar a autenticação com a Codilo,
 * gerar um token válido, salvá-lo em uma variável e exibir no Log.
 */

var CODILO_CONFIG = {
  authUrl:      'https://auth.codilo.com.br/oauth/token',
  clientId:     'BEC46876AF2F117D',
  clientSecret: '2402242ce45fc74929f6fa0de27c912f'
};

/**
 * Função principal para gerar e exibir o token
 */
function gerarExibirTokenCodilo() {
  console.log("Iniciando tentativa de obtenção de token...");
  
  var payload = 'grant_type=client_credentials'
              + '&id='     + encodeURIComponent(CODILO_CONFIG.clientId)
              + '&secret=' + encodeURIComponent(CODILO_CONFIG.clientSecret);

  try {
    var response = UrlFetchApp.fetch(CODILO_CONFIG.authUrl, {
      method:             'post',
      contentType:        'application/x-www-form-urlencoded',
      payload:            payload,
      muteHttpExceptions: true
    });

    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    if (responseCode === 200) {
      var data = JSON.parse(responseBody);
      var accessToken = data.access_token;
      
      // Salva no log para visualização
      console.log("✅ SUCESSO! Token gerado com sucesso.");
      console.log("TOKEN: " + accessToken);
      console.log("EXPIRA EM: " + data.expires_in + " segundos");
      
      // Retorna o token para poder ser usado em outras funções se necessário
      return accessToken;
      
    } else {
      console.error("❌ ERRO NA AUTENTICAÇÃO");
      console.error("Status Code: " + responseCode);
      console.error("Resposta da API: " + responseBody);
    }

  } catch (e) {
    console.error("❌ ERRO CRÍTICO NO SCRIPT");
    console.error(e.message);
  }
}
