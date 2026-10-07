define([
	'index',
    'totvs-html-framework',
	'/dts/mpd/html/dashboard/messages.js',
	'/dts/mpd/js/api/fchdis0063.js',
], function(index) {
    'use strict';
	
	CustomService.$inject = [
		'$rootScope',
		'mpd.fchdis0063.Factory',
		'TOTVSEvent',
		'$window',
		'$state',
		'$stateParams',
		'$timeout',
		'$modal',
		'customization.generic.Factory',
		'$totvsresource'
		
    ];
    function CustomService($rootScope,fchdis0063,TOTVSEvent, $window, $state, $stateParams, $timeout, $modal, customService, $totvsresource) {

		var service = {};
		var $el;
		var _compiledHTML;
		var json;
		//var self = this;   
		let wsOrder2;		
		let urlDatasul = "/dts/datasul-rest/resources/prg/prmp/v1/prm-order2";
		let urlOrder2 = urlDatasul + "/:method";
		let order2Resources = {				
			'salvarPedido': {
				method: 'PUT',
				isArray: false,
				params:  {},
				url: urlDatasul + '/salvarPedido'
			},
			'pedidoVenda': {
				method: 'GET',
				isArray: false,
				params:  {nrPedido: '@nrPedido'},
				url: urlDatasul + '/pedidoVenda'
			},
			'emitente': {
				method: 'GET',
				isArray: false,
				params:  {codEmitente: '@codEmitente'},
				url: urlDatasul + '/emitente'
			},

			getQtNaCaixaPedido: {
				method: 'GET',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/esporder2/additionalInfo/:orderId',
				// Chamada feita em background (varias vezes por carregamento
				// de pedido) - noCountRequest evita que o framework conte
				// essa chamada no contador global de pending requests, que e'
				// o que dispara a tela de loading (mesmo mecanismo ja usado
				// em portal-factories.js para o zoom). Sem isso, cada
				// consulta de additionalInfo travava a tela com o overlay
				// de carregamento.
				headers: { noCountRequest: true },
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},

			'getOrderPricingAdjustment': {
				method: 'GET',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/apiOrderPricingAdjustment/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},

			'releaseOrderPricingAdjustment': {
				method: 'POST',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/apiOrderPricingRelease/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},

			// Registra a decisao de NAO aplicar o ajuste de preco avaliado
			// (botao "Enviar sem Desconto") - nao libera o pedido, so' grava
			// o historico para a validacao de liberacao em UPC_BODI159COM.p
			// nao tratar essa liberacao como bypass.
			'registerPricingDecision': {
				method: 'POST',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/apiOrderPricingDecision/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},

			'linkOrder': {
				method: 'POST',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/apiOrderLink/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},

			'unlinkOrder': {
				method: 'DELETE',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/apiOrderLink/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},

			'getQtNaCaixaUN': {
                method: 'GET',
                isArray: false,
                params: { itCodigo: '@itCodigo'},
                url: '/api/rest-api/mut/v1/apiItem/:itCodigo',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
            },

			// 'getQtNaCaixaUN': {
            //     method: 'GET',
            //     isArray: false,
            //     params: {codEstabel: '@codEstabel', itCodigo: '@itCodigo'},
            //     url: '/dts/datasul-rest/resources/prg/rest-api/v1/esporder2/quantidadecaixaun'
            // },
			
            'getImpostos': {
                method: 'GET',
                isArray: true,
                params: {nrPedcli: '@nrPedcli', nomeAbrev: '@nomeAbrev', nrSequencia: '@nrSequencia', itCodigo: '@itCodigo', codRefer: '@codRefer' },
                url: '/dts/datasul-rest/resources/prg/rest-api/v1/esporder2/impostos'
            },
		};

		wsOrder2 = $totvsresource.REST(urlOrder2, {}, order2Resources);		

		function loadQtNaCaixaByOrder(orderId) {
			return new Promise(function (resolve) {

				function montarResultado(result) {
					let mapItens = {};

					if (result && result.items) {
						result.items.forEach(function (item) {
							mapItens[item.nrSequencia] = item;
						});
					}

					return {
						mapItens: mapItens,
						percentualAjuste: Number(result && result.percentualAjuste) || 0,
						itens: (result && result.items) || [],
						pedidoComplementar: !!(result && result.pedidoComplementar),
						nrPedidoReferencia: Number(result && result.nrPedidoReferencia) || 0
					};
				}

				wsOrder2.getQtNaCaixaPedido(
					{ orderId: orderId },
					function (result) {
						resolve(montarResultado(result));
					},
					function (erro) {
						// Resolve mesmo em erro (com valores padrao/seguros) -
						// a label "Pedido Complementar?" e' sempre exibida e
						// depende desta promise se resolver; antes desta
						// mudanca, uma falha aqui deixava a promise pendente
						// para sempre e exibirPercentualAjuste nunca era
						// chamada.
						console.error('[order2] Erro ao consultar additionalInfo.', erro);
						resolve(montarResultado(null));
					}
				);
			});
		}

		/**
		 * popover-html nao esta registrado neste bundle do ui-bootstrap (so
		 * popover-template e tooltip-html, ambos ja usados no core), entao o
		 * tooltip padrao (balao preto) e' restilizado via CSS para se parecer
		 * com o popover branco/com borda do "Valor Total", em vez de trocar de
		 * diretiva.
		 */
		function aplicarEstiloPopoverNoTooltip() {
			if ($('#estilo-tooltip-ajuste-preco').length > 0) {
				return;
			}

			$('<style id="estilo-tooltip-ajuste-preco">' +
				'.ajuste-preco-tooltip-trigger + .tooltip > .tooltip-inner {' +
					'background-color:#fff; color:#333; text-align:left; max-width:320px;' +
					'padding:8px 12px; border:1px solid #bbb; border-radius:4px;' +
					'box-shadow:0 5px 10px rgba(0,0,0,.2);' +
				'}' +
				'.ajuste-preco-tooltip-trigger + .tooltip.top .tooltip-arrow,' +
				'.ajuste-preco-tooltip-trigger + .tooltip.top-left .tooltip-arrow,' +
				'.ajuste-preco-tooltip-trigger + .tooltip.top-right .tooltip-arrow { border-top-color:#bbb; }' +
				'.ajuste-preco-tooltip-trigger + .tooltip.bottom .tooltip-arrow,' +
				'.ajuste-preco-tooltip-trigger + .tooltip.bottom-left .tooltip-arrow,' +
				'.ajuste-preco-tooltip-trigger + .tooltip.bottom-right .tooltip-arrow { border-bottom-color:#bbb; }' +
				'.ajuste-preco-tooltip-trigger + .tooltip.left .tooltip-arrow { border-left-color:#bbb; }' +
				'.ajuste-preco-tooltip-trigger + .tooltip.right .tooltip-arrow { border-right-color:#bbb; }' +
				// tooltip-html passa pelo $sanitize do Angular, que remove o
				// atributo style (mesmo em conteudo "de confianca") - por isso
				// a formatacao do conteudo do balao usa classes (preservadas
				// pelo sanitizer) em vez de style inline.
				'.ajuste-preco-tt-header {' +
					'margin:-8px -12px 10px -12px; padding:8px 12px; background:#f7f7f7;' +
					'border-bottom:1px solid #ebebeb; border-radius:4px 4px 0 0; font-weight:bold;' +
				'}' +
				'.ajuste-preco-tt-label { font-weight:700; font-size:12px; color:#333; }' +
				'.ajuste-preco-tt-value { margin:0 0 22px 0; }' +
				'.ajuste-preco-tt-value:last-of-type { margin-bottom:0; }' +
				'.ajuste-preco-tt-value-acrescimo { color:#e67e22; }' +
				'.ajuste-preco-tt-value-desconto { color:#1e5c1e; }' +
				'.ajuste-preco-tt-footer {' +
					'margin:12px -12px -8px -12px; padding:8px 12px 0 12px;' +
					'border-top:1px solid #ebebeb; color:#777; font-size:12px;' +
				'}' +
				'</style>').appendTo('head');
		}

		/**
		 * As colunas de badge do cabecalho (Acrescimo/Desconto, Pedido
		 * Complementar) sao inseridas por funcoes independentes, cada uma com
		 * seu proprio polling ($timeout) em busca do mesmo elemento-ancora
		 * ("Total do Pedido"). Como `.after()` sempre insere imediatamente ao
		 * lado da ancora, a ordem visual final dependeria de qual delas
		 * termina seu polling por ultimo - nao-deterministico entre reloads.
		 * Esta funcao fixa a ordem via um atributo data-badge-ordem: toda vez
		 * que QUALQUER badge e' (re)inserida, as badges irmas sao reordenadas
		 * por esse atributo.
		 */
		function inserirBadgeOrdenado($alvo, markerClass, elemento) {
			$('.' + markerClass).remove();
			$alvo.after(elemento);

			var ordenados = $alvo.siblings('[data-badge-ordem]').toArray().sort(function (a, b) {
				return Number($(a).attr('data-badge-ordem')) - Number($(b).attr('data-badge-ordem'));
			});

			var $cursor = $alvo;
			ordenados.forEach(function (el) {
				$cursor.after(el);
				$cursor = $(el);
			});
		}

		/**
		 * Replica as 3 condicoes das labels de status exibidas ao lado de
		 * "Novo Pedido XXXX" no core order.html (cotacao/l-status-order-11,
		 * cancelado/l-cancelled, liberado/l-released). Se qualquer uma
		 * estiver visivel, o pedido ja' esta em um estado final/intermediario
		 * que nao faz mais sentido mostrar o ajuste de desconto/acrescimo.
		 */
		function statusPedidoVisivel(controller) {
			if (!controller || !controller.order) {
				return false;
			}

			var order = controller.order;

			var cotacao = order['log-cotacao'] == true;
			var cancelado = order['cod-sit-ped'] == 6;
			var liberado = !controller.newOrderHeader && order['data-1'] == null && order['cod-sit-ped'] != 6;

			return cotacao || cancelado || liberado;
		}

		/**
		 * Exibe, ao lado do totalizador do pedido (popover "Totais do pedido"),
		 * o percentual de desconto/acrescimo que sera aplicado - vindo do
		 * mesmo percentualAjuste retornado pela API additionalInfo. Valor
		 * exibido sempre positivo; o rotulo ("Desconto Disponivel" ou
		 * "Acrescimo") e' quem indica a direcao. Um icone com tooltip (mesmo
		 * padrao "mouseover" do popover de Valor Total) mostra a previsao dos
		 * valores liquido e total c/ impostos apos o ajuste.
		 */
		function exibirPercentualAjuste(percentual, itens) {
			var valor = Number(percentual) || 0;
			var tentativas = 0;

			function tentarExibir() {
				tentativas++;

				var $popover = $('div[popover-template*="orderValues.html"]').first();

				if ($popover.length === 0) {
					if (tentativas < 10) {
						$timeout(tentarExibir, 500);
					}
					return;
				}

				aplicarEstiloPopoverNoTooltip();

				$('.desconto-acrescimo-badge').remove();

				var scope = angular.element($popover[0]).scope();
				var controller = scope && scope.controller;

				// Pedido ja liberado/cancelado/cotacao: nao faz mais sentido
				// mostrar o ajuste de preco nem o botao "Detalhar".
				if (statusPedidoVisivel(controller)) {
					$('.btn-consultar-desconto').hide();
					$('.btn-consultar-desconto .label-ajuste-suffix').text('');
					return;
				}

				$('.btn-consultar-desconto').show();

				$('.btn-consultar-desconto .label-ajuste-suffix').text(
					valor < 0 ? 'Desconto' : (valor > 0 ? 'Acréscimo' : '')
				);

				if (valor === 0) {
					return;
				}

				var cor = valor < 0 ? '#1e5c1e' : '#e67e22';
				var rotulo = valor < 0 ? 'Desconto Disponível' : 'Acréscimo';
				var texto = Math.abs(valor).toFixed(2).replace('.', ',') + '%';

				if (controller) {
					var valorLiquidoAtual = Number(controller.order && controller.order['vl-liq-ped']) || 0;
					var valorTotalAtual = Number(controller.order && controller.order['vl-tot-ped']) || 0;

					// Mesmo calculo preciso usado no modal "Detalhar/Liberar"
					// (calcularValorLiquidoPrecisoAcrescimo): no acrescimo, o
					// backend arredonda o preco por item antes de multiplicar
					// pela quantidade, entao total*fator diverge em pedidos
					// com quantidades grandes. No desconto (percentual unico
					// de cabecalho, sem arredondamento por item) total*fator
					// ja e' exato.
					var valorLiquidoPrevisto;
					if (valor > 0 && itens && itens.length) {
						valorLiquidoPrevisto = calcularValorLiquidoPrecisoAcrescimo(itens, valor);
					} else {
						valorLiquidoPrevisto = valorLiquidoAtual * (1 + valor / 100);
					}

					var razaoAjuste = valorLiquidoAtual
						? (valorLiquidoPrevisto / valorLiquidoAtual)
						: (1 + valor / 100);
					var valorTotalPrevisto = valorTotalAtual * razaoAjuste;

					// Mesmo layout (rotulo em uma linha, valor na linha seguinte
					// em <h4>) e mesmo texto de rodape ("Atencao...") do popover
					// "Totais do pedido" (orderValues.html / l-order-totals /
					// msg-calculate-order), adaptado para o contexto do ajuste.
					// Usa classes (ajuste-preco-tt-*, definidas em
					// aplicarEstiloPopoverNoTooltip) em vez de style inline:
					// o $sanitize do Angular remove o atributo style do
					// conteudo passado via tooltip-html, entao estilos inline
					// aqui seriam silenciosamente descartados.
					// Mesma cor (laranja/verde) usada no badge e no e-mail de
					// liberacao para marcar acrescimo/desconto - aplicada aqui
					// via classe (nao style inline, descartado pelo $sanitize
					// em conteudo tooltip-html - ver comentario acima).
					var classeValorPrevisto = valor < 0 ? 'ajuste-preco-tt-value-desconto' : 'ajuste-preco-tt-value-acrescimo';

					controller.infoMessageAjustePreco =
						'<div class="ajuste-preco-tt-header">Previsão de Valores</div>' +
						'<div class="ajuste-preco-tt-label">Valor Total c/ Impostos</div>' +
						'<h4 class="ajuste-preco-tt-value">R$ ' + formatMoeda(valorTotalAtual) + ' &rarr; <span class="' + classeValorPrevisto + '">R$ ' + formatMoeda(valorTotalPrevisto) + '</span></h4>' +
						'<div class="ajuste-preco-tt-label">Valor Líquido</div>' +
						'<h4 class="ajuste-preco-tt-value">R$ ' + formatMoeda(valorLiquidoAtual) + ' &rarr; <span class="' + classeValorPrevisto + '">R$ ' + formatMoeda(valorLiquidoPrevisto) + '</span></h4>' +
						'<p class="ajuste-preco-tt-footer">Atenção: estes valores são uma estimativa e podem sofrer alterações após o recálculo do pedido.</p>';
				}

				// Inserido como uma nova coluna irma (mesmo padrao das demais
				// totvs-page-detail-info do cabecalho), em vez de sibling do
				// popover em si - do contrario o texto quebra para a linha de
				// baixo por causa da largura estreita da coluna "Total".
				//
				// tooltip-html fica no <span> inteiro (valor + icone), nao so
				// no icone, para o balao aparecer ao passar o mouse em
				// qualquer um dos dois.
				var html =
					'<div class="detail-field desconto-acrescimo-badge col-xs-4 col-sm-4 col-md-3" data-badge-ordem="1" style="padding-right:4px;">' +
						'<div class="field-label">' + rotulo + '</div>' +
						'<div class="field-value">' +
							'<span class="ajuste-preco-tooltip-trigger" style="color:' + cor + ';font-weight:bold;cursor:pointer;" ' +
								'tooltip-placement="bottom" tooltip-html="controller.infoMessageAjustePreco">' +
								texto + '&nbsp;&nbsp;' +
								'<i class="glyphicon glyphicon-info-sign"></i>' +
							'</span>' +
						'</div>' +
					'</div>';

				var elemento = controller
					? customService.compileHTML({ controller: controller }, html)
					: $(html);

				var $alvo = $popover.closest('.detail-field');
				if ($alvo.length === 0) $alvo = $popover;

				inserirBadgeOrdenado($alvo, 'desconto-acrescimo-badge', elemento);
			}

			$timeout(tentarExibir, 500);
		}

		/**
		 * Exibe, sempre (independente de statusPedidoVisivel - diferente da
		 * badge de Acrescimo/Desconto, essa informacao faz sentido mesmo com
		 * o pedido ja liberado/cancelado/em cotacao), a coluna "Pedido
		 * Complementar?" ao lado da badge de ajuste de preco (ou sozinha,
		 * quando a badge de ajuste nao e' exibida). Mostra "Nao" ou
		 * "Sim - {nrPedidoReferencia}", e um botao "Vincular Pedido" /
		 * "Remover Vinculo" conforme o estado atual (vindos da mesma resposta
		 * de additionalInfo que ja fornece percentualAjuste).
		 */
		function exibirPedidoComplementar(orderId, pedidoComplementar, nrPedidoReferencia) {
			var tentativas = 0;

			function tentarExibir() {
				tentativas++;

				var $popover = $('div[popover-template*="orderValues.html"]').first();

				if ($popover.length === 0) {
					if (tentativas < 10) {
						$timeout(tentarExibir, 500);
					}
					return;
				}

				var scope = angular.element($popover[0]).scope();
				var controller = scope && scope.controller;

				var textoValor = pedidoComplementar
					? ('Sim - ' + nrPedidoReferencia)
					: 'Não';

				// Mesma regra que ja esconde a badge/botoes de
				// Acrescimo/Desconto quando o pedido esta
				// liberado/cancelado/em cotacao - nesse estado tambem nao
				// faz mais sentido permitir vincular/desvincular. O rotulo
				// "Pedido Complementar?" continua sempre visivel, so' os
				// botoes ficam ocultos.
				var statusVisivel = statusPedidoVisivel(controller);

				if (controller) {
					controller.onClickVincularPedido = function () {
						abrirModalVincularPedido(orderId);
					};

					controller.onClickRemoverVinculo = function () {
						removerVinculoPedido(orderId);
					};
				}

				// As duas acoes sao mutuamente exclusivas (ng-if), nunca as
				// duas ao mesmo tempo no DOM - cada chamada desta funcao
				// recria a coluna inteira do zero (mesmo idioma das demais
				// badges deste arquivo), entao um ng-if estatico (true/false,
				// ja resolvido no momento da renderizacao) e' suficiente, sem
				// precisar de uma propriedade de escopo reativa.
				//
				// ng-click (nao addEventListener) nos dois - mesmo motivo
				// documentado em insertBotoesAjustePreco: elementos com ng-if
				// sao clonados pelo Angular quando a condicao fica verdadeira,
				// entao um addEventListener no no' compilado nunca dispara.
				//
				// Dado e botao ficam visualmente em "colunas" distintas, mas
				// dentro do MESMO .detail-field (com display:flex no
				// field-value). Sem classes col-xs/sm/md aqui de proposito:
				// essas classes reservam uma fracao FIXA da linha (ex.:
				// col-md-4 = 33%) independente do conteudo, e a soma das
				// colunas da linha (que varia conforme outros campos
				// condicionais do core) passava de 12, empurrando este campo
				// (e, antes, o proprio botao) para a linha de baixo. Em vez
				// disso, float:left + width:auto faz este bloco ocupar so' o
				// espaco que o conteudo precisa, cabendo ao lado das demais
				// colunas na mesma linha com folga.
				var html =
					'<div class="detail-field pedido-complementar-badge" ' +
						'data-badge-ordem="2" style="float:left;width:auto;white-space:nowrap;padding-left:4px;">' +
						'<div class="field-label">Pedido Complementar?</div>' +
						'<div class="field-value" style="display:flex;align-items:center;">' +
							'<span>' + textoValor + '</span>' +
							'<a class="btn btn-xs clickable" role="button" style="margin-left:10px;background-color:#337ab7;border-color:#2e6da4;color:#fff;" ' +
								'ng-if="' + (!statusVisivel && !pedidoComplementar ? 'true' : 'false') + '" ' +
								'ng-click="controller.onClickVincularPedido()">Vincular Pedido</a>' +
							'<a class="btn btn-xs clickable" role="button" style="margin-left:10px;background-color:#c0392b;border-color:#a93226;color:#fff;" ' +
								'ng-if="' + (!statusVisivel && pedidoComplementar ? 'true' : 'false') + '" ' +
								'ng-click="controller.onClickRemoverVinculo()">Remover Vínculo</a>' +
						'</div>' +
					'</div>';

				var elemento = controller
					? customService.compileHTML({ controller: controller }, html)
					: $(html);

				var $alvo = $popover.closest('.detail-field');
				if ($alvo.length === 0) $alvo = $popover;

				inserirBadgeOrdenado($alvo, 'pedido-complementar-badge', elemento);
			}

			$timeout(tentarExibir, 500);
		}

		/**
		 * Reconsulta additionalInfo e atualiza a coluna "Pedido
		 * Complementar?" em seu lugar (sem recarregar a pagina), apos
		 * vincular/desvincular com sucesso.
		 */
		function atualizarPedidoComplementar(orderId) {
			loadQtNaCaixaByOrder(orderId).then(function (resultado) {
				exibirPedidoComplementar(orderId, resultado.pedidoComplementar, resultado.nrPedidoReferencia);
			});
		}

		function removerVinculoPedido(orderId) {
			wsOrder2.unlinkOrder({ orderId: orderId }, function () {
				atualizarPedidoComplementar(orderId);
			}, function (erro) {
				console.error('[order2] Erro ao remover vínculo de pedido complementar.', erro);
				alert('Ocorreu um erro ao remover o vínculo. Tente novamente.');
			});
		}

		/**
		 * Modal "Vincular Pedido" - campo unico (Nr Pedido Principal, somente
		 * numeros) + botao de submissao, mesmo padrao de
		 * abrirModalDescontoAcrescimo (totvs-modal-*, $modal.open, controller
		 * como `this`).
		 */
		function abrirModalVincularPedido(orderId) {
			var template =
				'<totvs-modal-header>' +
					'<div>Vincular Pedido</div>' +
				'</totvs-modal-header>' +
				'<totvs-modal-body>' +
					'<div class="form-group">' +
						'<label>Nr Pedido Principal</label>' +
						'<input type="text" class="form-control" ' +
							'ng-model="modalVincularController.nrPedidoReferencia" ' +
							'ng-change="modalVincularController.nrPedidoReferencia = (modalVincularController.nrPedidoReferencia || \'\').toString().replace(/\\D/g, \'\')" ' +
							'maxlength="9" autofocus>' +
					'</div>' +
				'</totvs-modal-body>' +
				'<totvs-modal-footer>' +
					'<div class="row">' +
						'<div class="col-xs-12 text-right">' +
							'<button type="button" class="btn btn-default" ' +
								'ng-disabled="modalVincularController.enviando" ' +
								'ng-click="modalVincularController.cancelar()">Cancelar</button> ' +
							'<button type="button" class="btn btn-primary" ' +
								'ng-disabled="modalVincularController.enviando || !modalVincularController.nrPedidoReferencia" ' +
								'ng-click="modalVincularController.vincular()">' +
								'{{modalVincularController.enviando ? \'Vinculando...\' : \'Vincular Pedido\'}}</button>' +
						'</div>' +
					'</div>' +
				'</totvs-modal-footer>';

			$modal.open({
				template: template,
				controller: ['$modalInstance', function ($modalInstance) {
					var self = this;

					self.nrPedidoReferencia = '';
					self.enviando = false;

					self.vincular = function () {
						self.enviando = true;

						wsOrder2.linkOrder({ orderId: orderId }, { nrPedidoReferencia: Number(self.nrPedidoReferencia) },
							function () {
								self.enviando = false;
								$modalInstance.close('vinculado');
								atualizarPedidoComplementar(orderId);
							},
							function (erro) {
								self.enviando = false;
								var msg = (erro && erro.data && erro.data.ErrorDescription) ||
									'Não foi possível vincular o pedido. Verifique o número informado.';
								alert(msg);
							}
						);
					};

					self.cancelar = function () {
						$modalInstance.dismiss();
					};
				}],
				controllerAs: 'modalVincularController',
				backdrop: 'static',
				size: 'sm'
			});
		}

		function formatPercentual(valor) {
			return Math.abs(Number(valor) || 0).toFixed(2).replace('.', ',') + '%';
		}

		/**
		 * Esconde definitivamente o botao "Liberar" original (renderizado pelo
		 * core order.html) via CSS, em vez de .hide() no elemento pontual -
		 * o ng-if do core recria o <a> quando as condicoes mudam, o que
		 * desfaria um .hide() direto.
		 *
		 * Seletor por ng-click (processOrder), NAO por classe: a classe
		 * set-success-button nao e' exclusiva do botao Liberar - o botao
		 * "Calcular Pedido" tambem ganha essa mesma classe dinamicamente
		 * (ng-class) quando controller.calculateRequired fica true (ex.: logo
		 * apos salvar o cabecalho), entao escondê-la por classe escondia o
		 * Calcular Pedido tambem.
		 */
		function esconderBotaoLiberarOriginal() {
			if ($('#estilo-esconde-liberar-original').length > 0) {
				return;
			}

			$('<style id="estilo-esconde-liberar-original">' +
				'a[ng-click*="processOrder"] { display: none !important; }' +
				'</style>').appendTo('head');
		}

		/**
		 * Insere os botões "Liberar" (novo) e "Detalhar Desconto/Acréscimo" no
		 * cabeçalho de ações do pedido (totvs-page-header-operation-action),
		 * e esconde o botao "Liberar" original. As ações são geradas de forma
		 * assíncrona (mesmo gotcha documentado em pd4000.js), por isso a
		 * espera/retentativa abaixo.
		 */
		function insertBotoesAjustePreco(params, element) {
			var tentativas = 0;

			function tentarInserir() {
				tentativas++;

				var $el = $(element);

				if ($el.find('.btn-consultar-desconto').length > 0) {
					return;
				}

				var $botaoLiberar = $el.find('a.set-success-button').first();

				if ($botaoLiberar.length === 0) {
					if (tentativas < 10) {
						$timeout(tentarInserir, 500);
					}
					return;
				}

				esconderBotaoLiberarOriginal();

				// ng-click (em vez de addEventListener no no compilado) porque
				// este botao tem ng-if: o Angular clona/transclui um bloco novo
				// quando a condicao fica verdadeira, entao o elemento que o
				// usuario efetivamente ve/clica nao e' o mesmo no retornado
				// por compileHTML - um addEventListener nele nao dispara.
				params.controller.onClickLiberarNovo = function () {
					consultarDescontoAcrescimo(params, true);
				};

				var htmlLiberar2 =
					'<a class="btn btn-default clickable set-success-button btn-liberar-2" role="button" ' +
						'ng-if="!controller.calculateRequired && !controller.orderDisabled && controller.canOrderCommit && !controller.newOrderHeader && !controller.openHeader" ' +
						'ng-click="controller.onClickLiberarNovo()">' +
						'<span class="glyphicon glyphicon-ok"></span>' +
						'<span class="hidden-xs">&nbsp;&nbsp;Liberar</span>' +
					'</a>';

				var htmlConsultarDesconto =
					'<a class="btn btn-default clickable btn-consultar-desconto" role="button" ' +
						'style="background-color:#e67e22;border-color:#d35400;color:#fff;">' +
						'<span class="glyphicon glyphicon-list-alt"></span>' +
						'<span class="hidden-xs">&nbsp;&nbsp;Detalhar <span class="label-ajuste-suffix"></span></span>' +
					'</a>';

				var compiledLiberar2 = customService.compileHTML(params, htmlLiberar2);
				$botaoLiberar.before(compiledLiberar2[0]);

				var compiledConsultarDesconto = customService.compileHTML(params, htmlConsultarDesconto);
				$(compiledLiberar2[0]).after(compiledConsultarDesconto[0]);

				compiledConsultarDesconto[0].addEventListener('click', function () {
					consultarDescontoAcrescimo(params, false);
				});
			}

			$timeout(tentarInserir, 500);
		}

		function formatMoeda(valor) {
			return Number(valor || 0).toLocaleString('pt-BR', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
		}

		/**
		 * Replica exatamente o que o "Liberar" original faz apos o sucesso de
		 * fchdis0064.processOrder (ver this.processOrder em
		 * C:\Datasul\html-mpd\html\order2\order2.js) - mensagem de sucesso,
		 * remocao do contexto de negocio e recarga do pedido (para a tag
		 * "Liberado" aparecer no cabecalho). Usado apos o nosso proprio
		 * releaseOrderPricingAdjustment ja ter liberado o pedido no backend.
		 */
		function exibirSucessoLiberacao(controller) {
			if (!controller) return;

			var isQuotation = controller.order && controller.order['log-cotacao'] === true;

			$rootScope.$broadcast(TOTVSEvent.showMessage, {
				title: $rootScope.i18n('l-success'),
				text: $rootScope.i18n(isQuotation ? 'l-msg-release-quotation' : 'l-msg-release-order', [controller.orderId], 'dts/mpd')
			});

			if (controller.bussinessContexts) {
				if (controller.bussinessContexts.getContextData('selected.sales.order').orderId == controller.orderId) {
					controller.bussinessContexts.removeContext('selected.sales.order');
				}
			}

			if (typeof controller.getOrderAndItems === 'function') {
				controller.getOrderAndItems();
			}
		}

		/**
		 * Modal de confirmação genérico, usado antes de qualquer envio
		 * irreversível (com/sem desconto, com acréscimo). Retorna a promise
		 * do $modal - resolvida se o usuário confirmar, rejeitada se cancelar
		 * ou fechar o modal.
		 */
		function confirmarAcao(mensagem) {
			return $modal.open({
				template:
					'<totvs-modal-header>' +
						'<div>Confirmação</div>' +
					'</totvs-modal-header>' +
					'<totvs-modal-body>' +
						'<p>' + mensagem + '</p>' +
					'</totvs-modal-body>' +
					'<totvs-modal-footer>' +
						'<div class="row">' +
							'<div class="col-xs-12 text-right">' +
								'<button type="button" class="btn btn-default" ng-click="modalConfirmarController.cancelar()">Cancelar</button> ' +
								'<button type="button" class="btn btn-danger" ng-click="modalConfirmarController.confirmar()">Confirmar</button>' +
							'</div>' +
						'</div>' +
					'</totvs-modal-footer>',
				controller: ['$modalInstance', function ($modalInstance) {
					var self = this;

					self.confirmar = function () {
						$modalInstance.close(true);
					};

					self.cancelar = function () {
						$modalInstance.dismiss();
					};
				}],
				controllerAs: 'modalConfirmarController',
				backdrop: 'static',
				size: 'sm'
			}).result;
		}

		/**
		 * Modal de aviso simples (so' "Fechar"), usado no lugar de alert()
		 * para mensagens de validacao (ex.: valor minimo/maximo do pedido).
		 */
		function avisoModal(mensagem) {
			$modal.open({
				template:
					'<totvs-modal-header>' +
						'<div>Aviso</div>' +
					'</totvs-modal-header>' +
					'<totvs-modal-body>' +
						'<p>' + mensagem + '</p>' +
					'</totvs-modal-body>' +
					'<totvs-modal-footer>' +
						'<div class="row">' +
							'<div class="col-xs-12 text-right">' +
								'<button type="button" class="btn btn-default" ng-click="modalAvisoController.fechar()">Fechar</button>' +
							'</div>' +
						'</div>' +
					'</totvs-modal-footer>',
				controller: ['$modalInstance', function ($modalInstance) {
					var self = this;

					self.fechar = function () {
						$modalInstance.dismiss();
					};
				}],
				controllerAs: 'modalAvisoController',
				backdrop: 'static',
				size: 'sm'
			});
		}

		/**
		 * O acrescimo e' aplicado pelo backend por item (pi-aumenta-valor-item
		 * em bompd.p): o NOVO preco unitario e' arredondado para 2 casas por
		 * item (porque ped-item.vl-preori e' decimal(2)) e so' depois
		 * multiplicado pela quantidade - diferente de aplicar o percentual
		 * direto sobre o total do pedido. Em pedidos com quantidades grandes
		 * esse arredondamento por item se acumula e o preview "ingenuo"
		 * (total * fator) diverge do valor final real.
		 *
		 * Reconstroi, por item, preco unitario (valven) e quantidade
		 * implicita (valtot / valven) a partir do mesmo endpoint
		 * additionalInfo ja usado em outros pontos do arquivo, para somar o
		 * total com o MESMO arredondamento por item que o backend usa.
		 *
		 * O desconto, ao contrario, e' um percentual unico no cabecalho do
		 * pedido (val-pct-desconto-tab-preco via pi-add-desconto-pedido) -
		 * nao ha arredondamento por item nesse caminho, entao o calculo
		 * direto (total * fator) ja e' exato.
		 */
		function calcularValorLiquidoPrecisoAcrescimo(itens, percentual) {
			var fator = 1 + percentual / 100;
			var total = 0;

			(itens || []).forEach(function (item) {
				var precoUnitario = Number(item.valven) || 0;
				var totalItem = Number(item.valtot) || 0;

				if (!precoUnitario) {
					total += totalItem;
					return;
				}

				var novoPrecoUnitario = Math.round(precoUnitario * fator * 100) / 100;
				total += totalItem * (novoPrecoUnitario / precoUnitario);
			});

			return total;
		}

		function consultarDescontoAcrescimo(params, comAcoesEnvio) {
			var orderId = params.controller && params.controller.orderId;
			if (!orderId) {
				console.warn('[order2] Consultar Desconto/Acréscimo: orderId não encontrado em params.', params);
				return;
			}

			var order = params.controller.order || {};
			var valorLiquido = Number(order['vl-liq-ped']) || 0;
			var valorTotal = Number(order['vl-tot-ped']) || 0;

			wsOrder2.getOrderPricingAdjustment({ orderId: orderId }, function (result) {
				var lista = (result && result.items) || (angular.isArray(result) ? result : []);

				wsOrder2.getQtNaCaixaPedido({ orderId: orderId }, function (resultItens) {
					var itens = (resultItens && resultItens.items) || [];
					var pedidoComplementar = !!(resultItens && resultItens.pedidoComplementar);
					var nrPedidoReferencia = Number(resultItens && resultItens.nrPedidoReferencia) || 0;

					abrirModalDescontoAcrescimo(lista, valorLiquido, valorTotal, !!comAcoesEnvio, params, orderId, itens,
						pedidoComplementar, nrPedidoReferencia);
				});
			});
		}

		function abrirModalDescontoAcrescimo(lista, valorLiquido, valorTotal, comAcoesEnvio, params, orderId, itens,
			pedidoComplementar, nrPedidoReferencia) {
			var template =
				'<style scoped>' +
					'.valor-verde { color:#1e5c1e; font-weight:bold; }' +
					'.valor-laranja { color:#e67e22; font-weight:bold; }' +
					'.btn-enviar-com-desconto { background-color:#5cb85c; border-color:#4cae4c; color:#fff; }' +
					'.btn-enviar-sem-desconto { background-color:#337ab7; border-color:#2e6da4; color:#fff; }' +
					'.btn-enviar-com-acrescimo { background-color:#e67e22; border-color:#d35400; color:#fff; }' +
				'</style>' +
				'<totvs-modal-header>' +
					'<div>Desconto / Acréscimo do Pedido</div>' +
				'</totvs-modal-header>' +
				'<totvs-modal-body>' +
					'<div ng-if="modalDescontoController.pedidoComplementar" class="alert alert-warning" style="margin-top:15px;">' +
						'<span class="glyphicon glyphicon-exclamation-sign"></span>&nbsp;&nbsp;' +
						'Pedidos complementares não sofrem alteração por desconto ou acréscimo.' +
					'</div>' +
					'<div ng-if="!modalDescontoController.pedidoComplementar">' +
					'<table class="table table-bordered">' +
						'<thead>' +
							'<tr><th>Descrição</th><th>Tipo</th><th>Percentual</th></tr>' +
						'</thead>' +
						'<tbody>' +
							'<tr ng-repeat="cond in modalDescontoController.condicoes">' +
								'<td>{{cond.descricao}}</td>' +
								'<td ng-class="cond.percentual > 0 ? \'valor-laranja\' : (cond.percentual < 0 ? \'valor-verde\' : \'\')">{{cond.tipo}}</td>' +
								'<td ng-class="cond.percentual > 0 ? \'valor-laranja\' : (cond.percentual < 0 ? \'valor-verde\' : \'\')">{{modalDescontoController.formatPercentual(cond.percentual)}}</td>' +
							'</tr>' +
						'</tbody>' +
						'<tfoot ng-if="modalDescontoController.condicoes.length">' +
							'<tr>' +
								'<td style="font-weight:bold; text-align:right;">Total</td>' +
								'<td ng-class="modalDescontoController.totalPercentual > 0 ? \'valor-laranja\' : (modalDescontoController.totalPercentual < 0 ? \'valor-verde\' : \'\')" style="font-weight:bold;">' +
									'{{modalDescontoController.tipoTotal}}' +
								'</td>' +
								'<td ng-class="modalDescontoController.totalPercentual > 0 ? \'valor-laranja\' : (modalDescontoController.totalPercentual < 0 ? \'valor-verde\' : \'\')" style="font-weight:bold;">' +
									'{{modalDescontoController.formatPercentual(modalDescontoController.totalPercentual)}}' +
								'</td>' +
							'</tr>' +
						'</tfoot>' +
					'</table>' +
					'<div ng-if="!modalDescontoController.condicoes.length" class="text-center">Nenhum ajuste de preço aplicável.</div>' +
					'<table class="table table-bordered" style="margin-top:30px;">' +
						'<thead>' +
							'<tr><th></th><th>Atual</th><th>Previsto</th></tr>' +
						'</thead>' +
						'<tbody>' +
							'<tr>' +
								'<td style="font-weight:bold;">Valor Líquido</td>' +
								'<td>R$ {{modalDescontoController.formatMoeda(modalDescontoController.valorLiquidoAtual)}}</td>' +
								'<td ng-class="modalDescontoController.totalPercentual > 0 ? \'valor-laranja\' : (modalDescontoController.totalPercentual < 0 ? \'valor-verde\' : \'\')">' +
									'R$ {{modalDescontoController.formatMoeda(modalDescontoController.valorLiquidoPrevisto)}}&nbsp;' +
									'<i class="glyphicon glyphicon-info-sign" tooltip-placement="top" ' +
										'tooltip="Os valores previstos podem variar levemente em relação ao valor final, devido a arredondamentos."></i>' +
								'</td>' +
							'</tr>' +
							'<tr>' +
								'<td style="font-weight:bold;">Valor Total c/ Impostos</td>' +
								'<td>R$ {{modalDescontoController.formatMoeda(modalDescontoController.valorTotalAtual)}}</td>' +
								'<td ng-class="modalDescontoController.totalPercentual > 0 ? \'valor-laranja\' : (modalDescontoController.totalPercentual < 0 ? \'valor-verde\' : \'\')">' +
									'R$ {{modalDescontoController.formatMoeda(modalDescontoController.valorTotalPrevisto)}}&nbsp;' +
									'<i class="glyphicon glyphicon-info-sign" tooltip-placement="top" ' +
										'tooltip="Os valores previstos podem variar levemente em relação ao valor final, devido a arredondamentos."></i>' +
								'</td>' +
							'</tr>' +
						'</tbody>' +
					'</table>' +
					'<div ng-if="modalDescontoController.comAcoesEnvio && modalDescontoController.totalPercentual > 0" ' +
						'class="alert alert-warning" style="margin-top:15px;">' +
						'<span class="glyphicon glyphicon-exclamation-sign"></span>&nbsp;&nbsp;' +
						'Ao clicar em <strong>Enviar com Acréscimo</strong>, o acréscimo será aplicado ao pedido e o mesmo ' +
						'será recalculado automaticamente. <strong>Esse processo pode levar alguns instantes em pedidos com um número elevado de itens.</strong>' +
					'</div>' +
					'<div ng-if="modalDescontoController.comAcoesEnvio && modalDescontoController.totalPercentual < 0" ' +
						'class="alert alert-warning" style="margin-top:15px;">' +
						'<span class="glyphicon glyphicon-exclamation-sign"></span>&nbsp;&nbsp;' +
						'Ao clicar em <strong>Enviar com Desconto</strong>, o desconto será aplicado ao pedido e o mesmo será ' +
						'recalculado automaticamente. <strong>Esse processo pode levar alguns instantes em pedidos com um número elevado de itens.</strong> ' +
						'Caso prefira liberar o pedido sem aplicar o desconto, utilize a opção <strong>Enviar sem Desconto</strong>.' +
					'</div>' +
					'</div>' +
				'</totvs-modal-body>' +
				'<totvs-modal-footer>' +
					'<div class="row">' +
						'<div class="col-xs-12 text-right">' +
							'<button type="button" class="btn btn-enviar-com-desconto" ' +
								'ng-if="!modalDescontoController.pedidoComplementar && modalDescontoController.comAcoesEnvio && modalDescontoController.totalPercentual < 0" ' +
								'ng-disabled="modalDescontoController.enviando" ' +
								'ng-click="modalDescontoController.enviarComDesconto()">' +
								'{{modalDescontoController.enviando ? \'Enviando...\' : \'Enviar com Desconto\'}}</button> ' +
							'<button type="button" class="btn btn-enviar-sem-desconto" ' +
								'ng-if="!modalDescontoController.pedidoComplementar && modalDescontoController.comAcoesEnvio && modalDescontoController.totalPercentual < 0" ' +
								'ng-disabled="modalDescontoController.enviando" ' +
								'ng-click="modalDescontoController.enviarSemDesconto()">Enviar sem Desconto</button> ' +
							'<button type="button" class="btn btn-enviar-com-acrescimo" ' +
								'ng-if="!modalDescontoController.pedidoComplementar && modalDescontoController.comAcoesEnvio && modalDescontoController.totalPercentual > 0" ' +
								'ng-disabled="modalDescontoController.enviando" ' +
								'ng-click="modalDescontoController.enviarComAcrescimo()">' +
								'{{modalDescontoController.enviando ? \'Enviando...\' : \'Enviar com Acréscimo\'}}</button> ' +
							'<button type="button" class="btn btn-enviar-sem-desconto" ' +
								'ng-if="modalDescontoController.pedidoComplementar && modalDescontoController.comAcoesEnvio" ' +
								'ng-disabled="modalDescontoController.enviando" ' +
								'ng-click="modalDescontoController.enviarComplementar()">' +
								'{{modalDescontoController.enviando ? \'Enviando...\' : \'Enviar\'}}</button> ' +
							'<button type="button" class="btn btn-default" ' +
								'ng-disabled="modalDescontoController.enviando" ' +
								'ng-click="modalDescontoController.fechar()">Fechar</button>' +
						'</div>' +
					'</div>' +
				'</totvs-modal-footer>';

			$modal.open({
				template: template,
				controller: ['$modalInstance', function ($modalInstance) {
					var self = this;

					self.condicoes = (lista || []).map(function (cond) {
						var percentual = Number(cond.percentual) || 0;
						return {
							descricao: cond['descricao'],
							percentual: percentual,
							tipo: percentual > 0 ? 'Acréscimo' : (percentual < 0 ? 'Desconto' : '-')
						};
					});

					self.totalPercentual = self.condicoes.reduce(function (soma, cond) {
						return soma + cond.percentual;
					}, 0);

					self.tipoTotal = self.totalPercentual > 0 ? 'Acréscimo' : (self.totalPercentual < 0 ? 'Desconto' : '-');

					self.valorLiquidoAtual = valorLiquido;
					self.valorTotalAtual = valorTotal;

					// Acrescimo: backend arredonda o preco por item antes de
					// multiplicar pela quantidade (ver
					// calcularValorLiquidoPrecisoAcrescimo) - total * fator
					// direto diverge em pedidos com quantidades grandes.
					// Desconto: e' um percentual unico de cabecalho, sem
					// arredondamento por item - total * fator ja e' exato.
					if (self.totalPercentual > 0 && itens && itens.length) {
						self.valorLiquidoPrevisto = calcularValorLiquidoPrecisoAcrescimo(itens, self.totalPercentual);
					} else {
						self.valorLiquidoPrevisto = valorLiquido * (1 + self.totalPercentual / 100);
					}

					// Aplica a mesma proporcao (preciso/ingenuo) sobre o valor
					// com impostos - nao temos como recalcular impostos no
					// front, mas isso e' mais fiel do que usar o percentual
					// bruto, ja que os impostos escalam com o valor do item.
					var razaoAjuste = valorLiquido
						? (self.valorLiquidoPrevisto / valorLiquido)
						: (1 + self.totalPercentual / 100);
					self.valorTotalPrevisto = valorTotal * razaoAjuste;

					self.formatPercentual = formatPercentual;
					self.formatMoeda = formatMoeda;

					self.comAcoesEnvio = !!comAcoesEnvio;
					self.pedidoComplementar = !!pedidoComplementar;
					self.nrPedidoReferencia = nrPedidoReferencia;
					self.enviando = false;

					function enviarComAjuste() {
						if (!self.pedidoComplementar && valorLiquido < 4000) {
							avisoModal('O valor líquido do pedido precisa ser ao menos R$ 4.000,00, exceto pedidos complementares');
							return;
						}

						var mensagem = self.totalPercentual < 0
							? 'O pedido será enviado <span style="color:#5cb85c;font-weight:bold;">com desconto</span>. Deseja prosseguir?'
							: 'O pedido será enviado <span style="color:#e67e22;font-weight:bold;">com acréscimo</span>. Deseja prosseguir?';

						confirmarAcao(mensagem).then(function () {
							self.enviando = true;

							wsOrder2.releaseOrderPricingAdjustment({ orderId: orderId }, {}, function () {
								self.enviando = false;
								$modalInstance.close('ajuste-enviado');
								exibirSucessoLiberacao(params && params.controller);
							}, function (erro) {
								self.enviando = false;
								console.error('[order2] Erro ao enviar pedido com ajuste de preço.', erro);
								var msg = (erro && erro.data && erro.data.ErrorDescription) ||
									'Ocorreu um erro ao enviar o pedido. Tente novamente.';
								alert(msg);
							});
						});
					}

					self.enviarComDesconto = enviarComAjuste;
					self.enviarComAcrescimo = enviarComAjuste;

					self.enviarSemDesconto = function () {
						if (valorLiquido < 4000) {
							avisoModal('O valor líquido do pedido precisa ser ao menos R$ 4.000,00, exceto pedidos complementares');
							return;
						}

						confirmarAcao('O pedido será enviado <span style="color:#337ab7;font-weight:bold;">sem desconto</span>. Deseja prosseguir?').then(function () {
							self.enviando = true;

							// Registra a decisao de nao aplicar o ajuste ANTES de liberar
							// pelo fluxo padrao (processOrder) - sem isso, a validacao de
							// liberacao em UPC_BODI159COM.p nao teria como distinguir esta
							// decisao legitima de um pedido que nunca passou pela nossa
							// avaliacao de preco, e bloquearia o completeOrder.
							wsOrder2.registerPricingDecision({ orderId: orderId }, {}, function () {
								self.enviando = false;
								$modalInstance.dismiss();

								if (params && params.controller && typeof params.controller.processOrder === 'function') {
									params.controller.processOrder(params.controller.order && params.controller.order['log-cotacao']);
								}
							}, function (erro) {
								self.enviando = false;
								console.error('[order2] Erro ao registrar decisão de envio sem desconto.', erro);
								var msg = (erro && erro.data && erro.data.ErrorDescription) ||
									'Ocorreu um erro ao enviar o pedido. Tente novamente.';
								alert(msg);
							});
						});
					};

					self.enviarComplementar = function () {
						if (valorLiquido > 7000) {
							avisoModal('Pedidos complementares não podem exceder R$ 7.000,00 em valor de produtos');
							return;
						}

						confirmarAcao('O pedido será enviado. Deseja prosseguir?').then(function () {
							self.enviando = true;

							wsOrder2.releaseOrderPricingAdjustment({ orderId: orderId }, {}, function () {
								self.enviando = false;
								$modalInstance.close('ajuste-enviado');
								exibirSucessoLiberacao(params && params.controller);
							}, function (erro) {
								self.enviando = false;
								console.error('[order2] Erro ao enviar pedido complementar.', erro);
								var msg = (erro && erro.data && erro.data.ErrorDescription) ||
									'Ocorreu um erro ao enviar o pedido. Tente novamente.';
								alert(msg);
							});
						});
					};

					self.fechar = function () {
						$modalInstance.dismiss();
					};
				}],
				controllerAs: 'modalDescontoController',
				backdrop: 'static',
				size: 'md'
			});
		}

		self.converteUnidadeCaixa = function () {
			let qtNaCaixa = order2Controller.item.qtNaCaixa;
			if (!qtNaCaixa) return;

			order2Controller.qtCaixas =
				order2Controller.item['qt-un-fat'] / qtNaCaixa;
		};

		self.converteCaixaUnidade = function () {
			let qtNaCaixa = order2Controller.item.qtNaCaixa;
			if (!qtNaCaixa) return;

			order2Controller.item['qt-un-fat'] =
				order2Controller.qtCaixas * qtNaCaixa;
		};

        service.pd4000itemfields = function(params, element){
		   self.oElement = document.getElementById("itemcontroller_item[qt-un-fat]");
           self.order2Controller = params.itemController;	
		   
		   params.converteCaixaUnidade = self.converteCaixaUnidade;
    		params.converteUnidadeCaixa = self.converteUnidadeCaixa;

			$timeout(function(){
				inserirCampoQtCaixas(params);
				converteUnidadeCaixa();
			},2000); 		
		};
			
		service.customPage = function(params, element){
			// console.log("CustomPage");
			// console.log(params);

			insertBotoesAjustePreco(params, element);
		}
		
		service.leaveOrderItemSearch = function(params, element){
			// console.log("leaveOrderItemSearch2");
			// console.log(params);
			
			//console.log comentado
			// console.log(params.result.ttOrderItemPortalScreen[0]);
			
			params.result.ttOrderItemPortalScreen[0]['qt-pedida'] = params.result.ttOrderItemPortalScreen[0]['qtCaixa'] * 2;
			
			//console.log comentado
			// console.log(params.result.ttOrderItemPortalScrren[0]['qt-pedida']);
		}
		
		service.itemsearch = function(params, element){
			var fieldItemsGridSave = params.searchController.itemsGridSave;
			var itemsGridSaveOrig = params.searchController.itemsGridSave;
			
			self.portalItemsGrid = params.searchController;
			//console.log comentado
			// console.log("itemsearch");
			// console.log(params);
			addCampoSearchItemsGrid("qtCaixas","Qtd. Caixas","[\"qtCaixas\"]","","0",2,2,params);

			params.searchController.itemsGridEdit = edit;

			self.portalItemsGrid.itemsGridSaveOrig = params.searchController.itemsGridSave;
			self.portalItemsGrid.itemsGridSave = itemsGridSaveCustom;
			
			function itemsGridSaveCustom(event, column, value, original, currentIndex) {
				//console.log comentado
				// console.log(event);
				// console.log(column);
				// console.log(value);
				// console.log(original);
				// console.log(currentIndex);
				
				if(column.column === 'qtCaixas') {
					wsOrder2.getQtNaCaixaUN({'codEstabel': self.portalItemsGrid.orderController.order['cod-estabel'], 'itCodigo' : event.model['it-codigo']},
						function(result){ 
							if(result.items[0]['qtde_na_caixa'] != undefined){
								self.portalItemsGrid.searchItemsGrid.dataSource._data[currentIndex]['qt-un-fat'] = (value * result.items[0]['qtde_na_caixa']);
								self.portalItemsGrid.listResult[currentIndex]['qt-un-fat'] = (value * result.items[0]['qtde_na_caixa']);
								self.portalItemsGrid.listResult[currentIndex]['cod-unid-negoc'] = result.items[0]['cod-unid-negoc'];
								
								var columnQtUnFat = self.portalItemsGrid.searchItemsGrid.options.columns.find((e) => e.column === 'qt-un-fat');
								
								// console.log(columnQtUnFat);
								
								//var ttOrderParameters = $rootScope.orderController.orderParameters;
								var ttOrderItemSearch = original;
								ttOrderItemSearch[column.column] = value;
								
								$timeout(function() {
									fchdis0063.startAddItem({
										nrPedido: params.searchController.nrPedido,
										itemCode: original['it-codigo'],
										field: 'qt-un-fat'
									}, {
										ttOrderItemSearch: ttOrderItemSearch,
										//ttOrderParameters: ttOrderParameters							
									}, function(result) {
				
										var obj = result.ttOrderItemSearch[0];

										for (var key in obj) {
											if (event.model.hasOwnProperty(key) && event.model[key] != obj[key]) {
												event.model.set("[\"" + key + "\"]", obj[key]);
												params.searchController.listResult[currentIndex][key] = obj[key];
											}
										}								
										//$timeout(selectCell, 0);
									});
								}, 250);
								
								//self.portalItemsGrid.itemsGridSaveOrig(event, columnQtUnFat, (value * result['qtde-na-caixa']), original, currentIndex);
								
							}
						}
					);
				} else {
					self.portalItemsGrid.itemsGridSaveOrig(event, column, value, original, currentIndex);
				}
			}
			
			function edit(event, column) {				
				$timeout(function () {
					var inputs = $(event.container).find("input:focus:text");
					if (inputs.length > 0) inputs[0].setSelectionRange(0,999);
				},50);
	
				// campos que sempre habilitam a edição
				if(column.column == "qtCaixas")
					return;				
				if (column.column == "qt-un-fat")
					return;
				if (column.column == "nr-tabpre")
					return;
				if (column.column == "val-desconto-inform")
					return;
				if (column.column == "des-pct-desconto-inform")
					return;
				if (column.column == "val-pct-desconto-tab-preco")
					return;
				if (column.column == "nat-operacao")
					return;
				if (column.column == "tipo-atend")
					return;
				if (column.column == "cod-entrega")
					return;
				if (column.column == "dt-entrega")
					return;
				if (column.column == "ind-fat-qtfam-aux")
					return;
				if (column.column == "estab-atend-item")
					return;
	
				// campos que validam uma regra
				var ttOrderItemSearch = event.model;
				if (column.column == "des-un-medida" && ttOrderItemSearch.measureUnit
						&& ttOrderItemSearch.ttOrderItemSearchUM
						&& ttOrderItemSearch.ttOrderItemSearchUM.length > 1)
					return;
				if (column.column == "ct-codigo" && ttOrderItemSearch.account)
					return;
				if (column.column == "sc-codigo" && ttOrderItemSearch.account)
					return;
				if (column.column == "custo-contabil" && ttOrderItemSearch.costAccount)
					return;
				if (column.column == "classificacao-fiscal" && ttOrderItemSearch.classFis)
					return;
				if (column.column == "vl-preori" && params.searchController.editablePrice)
					return;
 				params.searchController.searchItemsGrid.closeCell();
           		params.searchController.searchItemsGrid.table.focus();	
			}
		}
		service.portalItemsGrid = function(params, element){
			var visible = {};
			
			for (var i = 0; i < params.searchController.listResult.length; i++) {
				
				params.searchController.listResult[i].qtCaixas  = 0;
			}
				
			if(params.searchController.pesquisaVisibleFields.find((e) => e.fieldName === 'qtCaixas') === undefined){
				
				visible.fieldEnabled = true;
				visible.fieldName = 'qtCaixas';
				
				params.searchController.pesquisaVisibleFields.splice(params.searchController.pesquisaVisibleFields.length, 0, visible);
			}			
		}
		service.saveOrderItem = function(params, element){

			
		}
		
		service.afterLoadOrder = function (params, element) {

			self.orderitemsgridportalcontroller = params.controller;
			self.orderitemsgridportalcontroller.orderItens = params.controller.orderItens;

			$timeout(function () {

				loadQtNaCaixaByOrder(params.controller.orderId)
					.then(function (resultado) {

						var mapItens = resultado.mapItens;

						exibirPercentualAjuste(resultado.percentualAjuste, resultado.itens);
						exibirPedidoComplementar(params.controller.orderId, resultado.pedidoComplementar, resultado.nrPedidoReferencia);

						self.orderitemsgridportalcontroller.orderItens.forEach(function (item) {

							let dados = mapItens[item['nr-sequencia']];
							if (!dados) return;

							// Quantidade por caixa
							item.qtNaCaixa = dados['qtde-na-caixa'];
							item.qtCaixas = item['qt-un-fat'] / dados['qtde-na-caixa'];

							// Valores (antes vinham do getImpostos)
							// item.valfintot = dados.valfintot;
							// item.valunifin = dados.valunifin;

							item.valfintot = item['vl-tot-it'];
							item.valtotliq = item['qt-un-fat'] * item['vl-preuni'];
							item.valunifin = item['vl-tot-it'] / item['qt-un-fat'];
							
							item.peripi    = dados.peripi;
							item.valipi    = dados.valipi;
							item.valfcp    = dados.valfcp;
							item.valimcsst = dados.valimcsst;
							item.qtde_palet  = dados.qtde_palet;
							item.qtde_palet_pedido = item['qt-un-fat'] / (dados.qtde_palet * item.qtNaCaixa)
							item.Qtde_Lastro = dados.Qtde_Lastro;
							item.Alt_Lastro  = dados.Alt_Lastro;
							item.cod_ean     = dados.cod_ean;
						});

						$timeout(function () {
							self.atualizaItem(params);
							self.addEventClick();
						}, 500);
					});

			}, 2000);
		};
		
		service.orderItems = function(params, element){   			
			
			//console.log comentado
			// console.log("Inicio orderItems")
			// console.log("params")
			// console.log(params)
			
			self.orderitemsgridportalcontroller = params.itemsGridController;
			
			$timeout(function(){

				loadQtNaCaixaByOrder(params.itemsGridController.orderId).then(function (resultado) {

					var mapItens = resultado.mapItens;

					exibirPercentualAjuste(resultado.percentualAjuste, resultado.itens);
					exibirPedidoComplementar(params.itemsGridController.orderId, resultado.pedidoComplementar, resultado.nrPedidoReferencia);

					self.orderitemsgridportalcontroller.orderItens.forEach(function (item) {

						let dados = mapItens[item['nr-sequencia']];
						if (!dados) return;

						item.qtNaCaixa = dados['qtde-na-caixa'];
						item.qtCaixas = item['qt-un-fat'] / dados['qtde-na-caixa'];

						// item.valfintot = dados.valfintot;
						// item.valunifin = dados.valunifin;
						item.valfintot = item['vl-tot-it'];
						item.valtotliq = item['qt-un-fat'] * item['vl-preuni'];
						item.valunifin = item['vl-tot-it'] / item['qt-un-fat'];

						item.peripi    = dados.peripi;
						item.valipi    = dados.valipi;
						item.valfcp    = dados.valfcp;
						item.valimcsst = dados.valimcsst;
						item.qtde_palet  = dados.qtde_palet;
						item.qtde_palet_pedido = item['qt-un-fat'] / (dados.qtde_palet * item.qtNaCaixa)
						item.Qtde_Lastro = dados.Qtde_Lastro;
						item.Alt_Lastro  = dados.Alt_Lastro;
					});

					$timeout(function () {
						self.atualizaItem(params);
						self.addEventClick();
					}, 500);
				});

				console.log(self.orderitemsgridportalcontroller.orderItens)
				
			},2000);
			
			$timeout(function(){
				var grid = self.orderitemsgridportalcontroller.itemsGrid;		
				var oldColumn = angular.copy(self.orderitemsgridportalcontroller.itemsGrid.columns[5]);  // copia coluna existente do grid
				var newColumn = angular.copy(oldColumn);
				var index = getIndexOfField(grid, oldColumn);  // busca indice da coluna
				if(index > -1 && newColumn.column == oldColumn.column) {
					newColumn.column = "qtCaixas";
					newColumn.title = "Qtd Caixas"; 
					newColumn.field = "";//'["qtCaixas"]';
					newColumn.headerTemplate = "<span>Qtd Caixas</span>";
					newColumn.template = '<span>0</span>';
					grid.options.columns.splice(4 , 0, newColumn);    // insere a coluna nova antes da coluna de indice 4
					
					grid.setOptions(grid.options);  
					
				}

				// função que retona o indice da coluna
				function getIndexOfField(grid, field) {
					var index = -1;
					
					angular.forEach(grid.columns, function(item, i) {
						if(item.field == field.field) index = i;
					});

					return index;
				}	

			});
			
			addCampoGrid("vlUnitComImposto","Valor Unit c/ Impostos","","Preço Unit c/ Impostos","0.00",4,10);
			addCampoGrid("vlTotSemImposto","Valor Total s/ Impostos","","Valor Total s/ Impostos","0.00",4,11);
			addCampoGrid("vlTotComImposto","Valor Total c/ Impostos","","Valor Total c/ Impostos","0.00",4,12);
			//addCampoGrid("vlAliquotaIpi","% IPI","","% IPI","0.00",4,4+3);
			//addCampoGrid("vlIpi","Valor IPI","","Valor IPI","0.00",4,4+4);
			// addCampoGrid("vlICMSSubs","Valor ICMS ST","","Valor ICMS ST","0.00",4,13);
			// addCampoGrid("vlFcp","Valor FCP","","Valor FCP","0.00",4,14);
			addCampoGrid("qtde_palet",  "Cx no Pallet",  "", "Cx no Pallet",  "0", 4, 13);
			addCampoGrid("qtde_palet_pedido",  "Pallets pedido",  "", "Pallets pedido",  "0", 4, 14);
			addCampoGrid("Qtde_Lastro", "Cx no Lastro",  "", "Cx no Lastro",  "0", 4, 15);
			addCampoGrid("Alt_Lastro",  "Alt. Lastro",  "", "Alt. Lastro",  "0", 4, 16);
			
			
		};	


		self.addCampoGrid = function(nomeColumn,titleColumn,fieldColumn,headerTemplate,template,columnRef,columnPosicao){
			
			$timeout(function(){
				var grid = self.orderitemsgridportalcontroller.itemsGrid;		
				var oldColumn = angular.copy(self.orderitemsgridportalcontroller.itemsGrid.columns[columnRef]);  // copia coluna existente do grid
				var newColumn = angular.copy(oldColumn);
				var index = getIndexOfField(grid, oldColumn);  // busca indice da coluna
				if(index > -1 && newColumn.column == oldColumn.column) {
					newColumn.column = nomeColumn;
					newColumn.title = titleColumn; 
					newColumn.field = fieldColumn;
					newColumn.headerTemplate = "<span>" + headerTemplate + "</span>";
					newColumn.template = '<span>'+ template + '</span>';
					grid.options.columns.splice(columnPosicao , 0, newColumn);    // insere a coluna nova antes da coluna de indice 4
					
					grid.setOptions(grid.options);  
					
				}

				// função que retona o indice da coluna
				function getIndexOfField(grid, field) {
					var index = -1;
					
					angular.forEach(grid.columns, function(item, i) {
						if(item.field == field.field) index = i;
					});

					return index;
				}	

			});
		};
		
		self.addCampoSearchItemsGrid = function(nomeColumn,titleColumn,fieldColumn,headerTemplate,template,columnRef,columnPosicao,params){
			
			$timeout(function(){
				//var body = element.find('[role="rowgroup"]');

				var grid = self.portalItemsGrid.searchItemsGrid;		
				var oldColumn = angular.copy(self.portalItemsGrid.searchItemsGrid.columns[columnRef]);  // copia coluna existente do grid
				//console.log comentado
				// console.log('oldColumn-addCampoSearchItemsGrid');
				// console.log(oldColumn);
				//var html = '<td style="text-align: right;" class="ng-scope" role="gridcell">10</td>';
				//var compiledHTML = customService.compileHTML(params, html);
					
				//grid.options.columns.splice(columnPosicao , 0, compiledHTML[0]);	
				var newColumn = angular.copy(oldColumn);
				//console.log(newColumn);
				var index = getIndexOfField(grid, oldColumn);  // busca indice da coluna
				if(index > -1 && newColumn.column == oldColumn.column) {
					newColumn.column = nomeColumn;
					newColumn.title = titleColumn; 
					newColumn.field = fieldColumn;
					newColumn.headerAttributes.id = nomeColumn;
					newColumn.headerTemplate = '<span ng-if="showHeaderEditIcon(\'' + nomeColumn + '\')" class="glyphicon glyphicon-edit" style="font-size: x-small;" aria-hidden="true">&nbsp;</span>' + titleColumn + '\n\t\t\t\t\t';
					newColumn.template = '';
					newColumn.editable	=	true;
					newColumn.editor = '';

					grid.options.columns.splice(columnPosicao , 0, newColumn);    // insere a coluna nova antes da coluna de indice 4
					
					grid.setOptions(grid.options);  
				}
				
				//grid.setOptions(grid.options); 
				
				for(var j = 0; j < self.portalItemsGrid.listResult.length; j++) {
					//console.log comentado
					// console.log(self.portalItemsGrid.listResult[j]['cod-un']);
					self.portalItemsGrid.listResult[j][nomeColumn] = 10;
				}

				// função que retona o indice da coluna
				function getIndexOfField(grid, field) {
					var index = -1;
					
					angular.forEach(grid.columns, function(item, i) {
						if(item.field == field.field) index = i;
					});

					return index;
				}

				function isExistColumn(grid, field){
			        var index = -1;
					angular.forEach(grid.columns, function(item, i) {
						if(item.field == field.field) index = i;
					});
				}	

			}, 2000);
		};
		
		
		self.addEventClick = function() {
			
			$timeout(function(){
				var HTMLelement = window.document;
				var element = angular.element(HTMLelement);
				var body = element.find('[role="rowgroup"]');
				var reg;
				if (body[3] == undefined) {
					reg = 1;
				}else
				{
					reg = 3
				}
				
				var collectionRows = body[reg].rows;  // numero de linhas da grid                                  
				var tabelas = self.orderitemsgridportalcontroller.orderItens;   // busca tabela
				var i = 0;
				
				for (i = 0; i < collectionRows.length; i++) {    // loop para passa em todas as linhas da tabela
					collectionRows[i].removeEventListener('click', () => {});
					collectionRows[i].addEventListener('click', () => {
						atualizaItem();
					});
					//break;
				};
				
			});
				
			$timeout(function(){
				var HTMLelement = window.document;
				var element = angular.element(HTMLelement);
				var body = element.find('[role="rowgroup"]');
				var reg;
				if (body[2] == undefined) {
					reg = 0;
				}else
				{
					reg = 2
				}

				var collectionRows = body[reg].rows;  // numero de linhas da grid                                  
				var i = 0;
				
				for (i = 0; i < collectionRows.length; i++) {    // loop para passa em todas as linhas da tabela
					collectionRows[i].removeEventListener('click', () => {});
					//});
					collectionRows[i].addEventListener('click', () => {
						atualizaItem();
					});
					break;
				};
					
			});
		}
		
		self.atualizaItem = function (params){

			$timeout(function(){
				
				var HTMLelement = window.document;
				var element = angular.element(HTMLelement);
				var body = element.find('[role="rowgroup"]');
				var reg;
				if (body[3] == undefined) {
					reg = 1;
				}else
				{
					reg = 3
				}
				var collectionRows = body[reg].rows;  // numero de linhas da grid                                  
				var tabelas = self.orderitemsgridportalcontroller.orderItens;   // busca tabela
				var i = 0;
				var grid = self.orderitemsgridportalcontroller.itemsGrid;
								
				for (i = 0; i < collectionRows.length; i++) {    // loop para passa em todas as linhas da tabela
					var rows = collectionRows;
					var data = tabelas[i];
					var index = getIndexOfField(rows,data['it-codigo']);
					var html = '<td style="text-align: right;" class role="gridcell" ><span>' + data['qtCaixas'] + '</span></td>';
					var compiledHTML = customService.compileHTML(params, html);
					try{
						collectionRows[index].removeChild(collectionRows[index].cells[3]);
						collectionRows[index].removeChild(collectionRows[index].cells[8]);
						collectionRows[index].removeChild(collectionRows[index].cells[8]);
						collectionRows[index].removeChild(collectionRows[index].cells[11]);
						collectionRows[index].removeChild(collectionRows[index].cells[11]);
						//collectionRows[index].removeChild(collectionRows[index].cells[3]);
						//collectionRows[index].removeChild(collectionRows[index].cells[4]);

					}
					catch{
					}

					//inicio
					var cell = collectionRows[index].cells[2];

					if (cell) {
						let currentValue = cell.innerText || cell.textContent || '';
						let descItem = (data['desc-item'] || '').trim();

						if (currentValue === descItem) {
							let html = '<span>' + data['cod_ean'] + " - " + currentValue + '</span>';
							let compiledHTML = customService.compileHTML(params, html);

							cell.innerHTML = '';

							cell.appendChild(compiledHTML[0]);
						}
					}
					//fim

					html = '<td style="text-align: right;" class role="gridcell" ><span>' + data['qtCaixas'] + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[3]); 
					
					html = '<td style="text-align: right;" class role="gridcell"><span>' +
						(data['vl-preori'] !== data['vl-preuni']
								? '<s>' + Number(data['vl-preori']).toFixed(2) + '</s> ' + Number(data['vl-preuni']).toFixed(2)
								: Number(data['vl-preuni']).toFixed(2)
						) +
						'</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[5]); 

					html = '<td style="text-align: right;" class role="gridcell" ><span>' + Number(data['valunifin']).toFixed(2) + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[6]); 

					html = '<td style="text-align: right;" class role="gridcell" ><span>' + Number(data['valtotliq']).toFixed(2) + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[7]); 

					html = '<td style="text-align: right;" class role="gridcell" ><span>' + Number(data['valfintot']).toFixed(2) + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[8]); 

					// html = '<td style="text-align: right;" class role="gridcell" ><span>' + data['valimcsst'] + '</span></td>';
					// compiledHTML = customService.compileHTML(params, html)
					// collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[9]);

					// html = '<td style="text-align: right;" class role="gridcell" ><span>' + data['valfcp'] + '</span></td>';
					// compiledHTML = customService.compileHTML(params, html)
					// collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[10]); 

					html = '<td style="text-align: right;" class role="gridcell"><span>' + data['qtde_palet'] + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[9]);

					html = '<td style="text-align: right;" class role="gridcell"><span>' + Number(data['qtde_palet_pedido']).toFixed(2) + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[10]);

					html = '<td style="text-align: right;" class role="gridcell"><span>' + data['Qtde_Lastro'] + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[11]);

					html = '<td style="text-align: right;" class role="gridcell"><span>' + data['Alt_Lastro'] + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[12]);



					function getIndexOfField(rows,itcodigo) {
						var index = -1;

						angular.forEach(rows, function(item, i) {
							angular.forEach(item.cells, function(cell,j){
								if(cell.innerHTML.indexOf(itcodigo) != -1){
									index = i;
									return i;
								}
							})
						} );

						return index;
					}	

				};
				
				function getIndexOfColumn(grid, field) {
					var index = -1;
					
					angular.forEach(grid.columns, function(item, i) {
						if(item.field == field.field) index = i;
					});

					return index;
				}	
				
			},2000);
		}

        function inserirCampoQtCaixas(params){
		
			let oQtUnFat;
			let oFiQtCaixas;
			let oQtNaCaixa;
			let _itCodigo;
			let _customAction;		
			let _compiledHTML;
			let qtNaCaixa;
			let oQtCaixas;
			let teste;
			
			oQtUnFat = document.getElementById("itemcontroller_item[qt-un-fat]"); 

			oQtCaixas = `<field type="number" ng-model="itemController.qtCaixas" 
							ng-model-options="{ updateOn: 'blur' }" 
							ng-disabled="itemController.itemDisabled" 
							label="Quantidade de Caixas" 
							class="ng-pristine ng-untouched ng-valid ng-scope col-xs-12 col-md-6" 
							id="itemcontroller_qtcaixas" 
							disabled="disabled" 
							ng-change="converteCaixaUnidade()" >

						</field>`;									

			oFiQtCaixas = document.getElementById("itemcontroller_qtcaixas");
			if(oFiQtCaixas == null) 			
			{				
				_customAction = oQtCaixas;			

				_compiledHTML = customService.compileHTML(params, _customAction);

				oFiQtCaixas = oQtUnFat.parentNode.insertBefore(_compiledHTML[0],oQtUnFat.nextSibling);

				//params.itemController.item['qtCaixas'] =  params.itemController.item['qt-un-fat'] / qtNaCaixa;
			}

			wsOrder2.getQtNaCaixaUN({
				// codEstabel: params.itemController.order['cod-estabel'],
				itCodigo: params.itemController.item['it-codigo']
			}, function(result) {

				if (result && result.items[0]['qtde_na_caixa']) {
					$timeout(function () {

						let qtNaCaixa = result.items[0]['qtde_na_caixa'];

						params.itemController.item.qtNaCaixa = qtNaCaixa;

						params.itemController.qtCaixas =
    						params.itemController.item['qt-un-fat'] / qtNaCaixa;

					});
				}
			});
		};
			
        function salvarPedido()
        {									
            params.controller.saveOrderHeaderDefault();
            
            $timeout(function(){
                wsOrder2.salvarPedido({},{'nrPedido' : parseInt(params.controller.orderId), 'descontoFinanc' : parseFloat(params.controller.descontoFinanc), 'tipoDesconto' : parseInt(params.controller.tipoDesconto)},
                    function(result){}
                );
            });
        }
        
		angular.extend(service, customService);
		
		return service;		
    }
	
    index.register.factory("custom.dts.mpd.order2",CustomService);	
});	


