define([
	'index',
	'totvs-html-framework',
], function(index) {
	'use strict';

	CustomService.$inject = [
		'$timeout',
		'$modal',
		'customization.generic.Factory',
		'$totvsresource'
	];

	function CustomService($timeout, $modal, customService, $totvsresource) {

		var service = {};

		var pd4000Resources = {
			'getMargemPedido': {
				method: 'GET',
				isArray: false,
				params: { orderId: '@orderId' },
				url: '/api/rest-api/mpd/v1/apiMargemPedido/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			}
		};

		var wsPd4000 = $totvsresource.REST('/api/rest-api/mpd/v1/apiMargemPedido/:orderId', {}, pd4000Resources);

		function formatCnpj(cnpj) {
			var digits = String(cnpj || '').replace(/\D/g, '').padStart(14, '0');
			return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
		}

		function formatNumero(valor, casas) {
			return Number(valor || 0).toLocaleString('pt-BR', {
				minimumFractionDigits: casas || 0,
				maximumFractionDigits: casas || 0
			});
		}

		function formatMoeda(valor) {
			return formatNumero(valor, 2);
		}

		function formatMoedaBRL(valor) {
			return 'R$ ' + formatMoeda(valor);
		}

		// Fração (0-1) que precisa ser multiplicada por 100 para virar percentual.
		function formatPercentual(valor) {
			return (Number(valor || 0) * 100).toFixed(2).replace('.', ',') + '%';
		}

		// Já vem do backend como percentual (ex: per_custo_frete = 9.9125 → "9,91%"),
		// diferente dos demais campos "per_*", que vêm como fração (0-1).
		function formatPercentualDireto(valor) {
			return Number(valor || 0).toFixed(2).replace('.', ',') + '%';
		}

		/**
		 * Evento disparado para o container de ações do cabeçalho do pedido
		 * (totvs-page-header-operation-action), definido em pd4000.html como:
		 *   <totvs-page-header-operation-action totvs-custom-element="pd4000operations">
		 * As ações (Calcular, Completar, Imprimir, etc.) são geradas a partir de
		 * um template lodash (orderController.permissions['pd4000']), que só é
		 * populado depois de uma chamada assíncrona (getParameters) — por isso
		 * o botão "Calcular" pode ainda não existir na primeira chamada deste
		 * evento, daí a espera/retentativa abaixo.
		 */
		service.pd4000operations = function (params, element) {
			insertBotaoCalcularMargem(params, element);
		};

		function insertBotaoCalcularMargem(params, element) {
			var tentativas = 0;

			function tentarInserir() {
				tentativas++;

				var $el = $(element);

				if ($el.find('.btn-calcular-margem').length > 0) {
					return;
				}

				var $botaoCalcular = $el.find('button, a').filter(function () {
					return $(this).text().trim() === 'Calcular Pedido' || $(this).text().trim() === 'Calcular';
				}).first();

				if ($botaoCalcular.length === 0) {
					if (tentativas < 10) {
						$timeout(tentarInserir, 500);
					}
					return;
				}

				var classesBotao = $botaoCalcular.attr('class') || 'btn';
				var html = '<button type="button" class="' + classesBotao + ' btn-calcular-margem" ' +
					'style="background-color:#e67e22;border-color:#d35400;color:#fff;margin-right:5px;">' +
					'Calcular Margem</button>';

				var compiledHTML = customService.compileHTML(params, html);
				$botaoCalcular.before(compiledHTML[0]);

				compiledHTML[0].addEventListener('click', function () {
					calcularMargem(params);
				});
			}

			$timeout(tentarInserir, 500);
		}

		function calcularMargem(params) {
			// A diretiva genérica de customização repassa o controller do
			// escopo com a mesma chave do alias usado em "... as X" (ex:
			// params.itemController, params.searchController). O estado
			// pd4000.edit usa controllerAs: 'orderController', então a
			// chave esperada aqui é params.orderController — não
			// params.controller.
			var orderController = params.orderController || params.controller;
			var orderId = orderController && orderController.orderId;
			if (!orderId) {
				console.warn('[pd4000] Calcular Margem: orderId não encontrado em params.', params);
				return;
			}

			wsPd4000.getMargemPedido({ orderId: orderId }, function (result) {
				var item = result && result.items && result.items[0];
				if (!item) return;

				abrirModalMargem(item);
			});
		}

		function abrirModalMargem(item) {
			var enderecoCompleto = [item.endereco, item.bairro, item.cidade, item.estado, item.cep]
				.filter(function (v) { return v; })
				.join(', ');

			var transportadora = formatCnpj(item.cgc_transportadora) + ' - ' + (item.nome_transportadora || '');

			var OPCAO_COMBINADO = 'combinado';

			var opcoesFrete = [];
			try {
				opcoesFrete = JSON.parse(item.opcoes_frete_json || '[]') || [];
			} catch (e) {
				opcoesFrete = [];
			}

			function linhaInfo(label, valor, classeValor) {
				return '<tr>' +
					'<td class="margem-info-label">' + label + '</td>' +
					'<td class="margem-info-value' + (classeValor ? ' ' + classeValor : '') + '">' + valor + '</td>' +
				'</tr>';
			}

			function celulaLabel(texto) {
				return '<td class="margem-label">' + texto + '</td>';
			}

			function celulaValor(texto, colspan, classeExtra) {
				return '<td class="margem-value' + (classeExtra ? ' ' + classeExtra : '') + '"' + (colspan ? ' colspan="' + colspan + '"' : '') + '>' + texto + '</td>';
			}

			var template =
				'<style scoped>' +
					'.margem-info-label { text-align:right; white-space:nowrap; padding:2px 8px 2px 0; font-weight:bold; }' +
					'.margem-info-value { text-align:left; padding:2px 0; }' +
					'.margem-table { width:75%; margin:30px auto 0 auto; }' +
					'.margem-table td { vertical-align:middle; padding:8px 12px; }' +
					'.margem-table .margem-label { text-align:right; white-space:nowrap; font-weight:bold; }' +
					'.margem-table .margem-value { text-align:left; }' +
					'.margem-destaque { font-size:20px; }' +
					'.margem-destaque .margem-info-label { padding-right:10px; }' +
					'.valor-verde { color:#1e5c1e; font-weight:bold; }' +
					'.valor-laranja { color:#e67e22; font-weight:bold; }' +
					'.valor-vermelho { color:#c0392b; font-weight:bold; }' +
				'</style>' +
				'<totvs-modal-header>' +
					'<div>Pedido: ' + item['nr-pedido'] + '&nbsp;&nbsp;|&nbsp;&nbsp;' + item['nr-pedcli'] + '</div>' +
					'<div>Cliente: ' + (item['nome-emit'] || '') + '</div>' +
				'</totvs-modal-header>' +
				'<totvs-modal-body>' +
					'<table>' +
						'<tbody>' +
							linhaInfo('Endereço completo:', enderecoCompleto) +
							linhaInfo('Transportadora Recomendada:', transportadora) +
							'<tr>' +
								'<td class="margem-info-label">Transportadora:</td>' +
								'<td class="margem-info-value">' +
									'<select ng-model="modalMargemController.transportadoraSelecionada" ' +
										'ng-change="modalMargemController.aoSelecionarTransportadora()" ' +
										'class="form-control" style="display:inline-block;width:auto;min-width:320px;">' +
										'<option ng-repeat="op in modalMargemController.opcoesFrete" value="{{$index}}">' +
											'{{op.nome_transportadora}} - {{modalMargemController.formatMoedaBRL(op.vl_custo_frete)}} ({{modalMargemController.formatPercentualDireto(op.per_custo_frete)}})' +
										'</option>' +
										'<option value="' + OPCAO_COMBINADO + '">Frete Combinado (informar manualmente)</option>' +
									'</select>' +
								'</td>' +
							'</tr>' +
							'<tr ng-show="modalMargemController.isCombinado()">' +
								'<td class="margem-info-label">Frete Combinado:</td>' +
								'<td class="margem-info-value">' +
									'R$ <input type="number" step="0.01" ng-model="modalMargemController.freteManualValor" ' +
										'ng-change="modalMargemController.aoAlterarValorManual()" class="form-control" style="display:inline-block;width:120px;" /> ' +
									'&nbsp;&nbsp;%&nbsp;' +
									'<input type="number" step="0.01" ng-model="modalMargemController.freteManualPercent" ' +
										'ng-change="modalMargemController.aoAlterarPercentualManual()" class="form-control" style="display:inline-block;width:100px;" />' +
								'</td>' +
							'</tr>' +
						'</tbody>' +
					'</table>' +
					'<table class="table table-bordered margem-table">' +
						'<tbody>' +
							'<tr>' +
								celulaLabel('Peso Bruto:') + celulaValor(formatNumero(item['peso-bruto'], 2) + ' KG') +
								celulaLabel('Volumes:') + celulaValor(formatNumero(item['nr_volumes'], 0) + ' CX') +
							'</tr>' +
							'<tr>' + celulaLabel('Valor Total:') + celulaValor(formatMoedaBRL(item['vl-tot-ped']), 3, 'valor-verde') + '</tr>' +
							'<tr>' + celulaLabel('Valor Líquido:') + celulaValor(formatMoedaBRL(item['vl-liq-ped']), 3, 'valor-verde') + '</tr>' +
							'<tr>' + celulaLabel('Custo MP (' + formatPercentualDireto(item['per_custo_materia_prima']) + '):') + celulaValor(formatMoedaBRL(item['custo_materia_prima']), 3, 'valor-laranja') + '</tr>' +
							'<tr>' + celulaLabel('Prazo médio:') + celulaValor(formatNumero(item['prazo_medio'], 2) + ' dias' + (item['cond-pag-descricao'] ? ' (' + item['cond-pag-descricao'] + ')' : ''), 3) + '</tr>' +
							'<tr>' +
								celulaLabel('Custo Financeiro (' + formatPercentualDireto(item['per_custo_financ']) + '):') + celulaValor(formatMoedaBRL(item['vl_custo_financ']), null, 'valor-laranja') +
								celulaLabel('Custo Duplicatas (' + formatPercentualDireto(item['per_custo_duplicatas']) + '):') + celulaValor(formatMoedaBRL(item['vl_custo_duplicatas']), null, 'valor-laranja') +
							'</tr>' +
							'<tr>' +
								celulaLabel('I.R (' + formatPercentualDireto(item['per_ir']) + '):') + celulaValor(formatMoedaBRL(item['vl_ir']), null, 'valor-laranja') +
								celulaLabel('Frete ({{modalMargemController.formatPercentualDireto(modalMargemController.perCustoFrete)}}):') + celulaValor('{{modalMargemController.formatMoedaBRL(modalMargemController.vlCustoFrete)}}', null, 'valor-laranja') +
							'</tr>' +
							'<tr>' +
								celulaLabel('Verba Gerada (' + formatPercentual(item['per_verba']) + '):') + celulaValor(formatMoedaBRL(item['vl_verba']), null, 'valor-laranja') +
								celulaLabel('Comissão (' + formatPercentualDireto(item['per_comis']) + '):') + celulaValor(formatMoedaBRL(item['vl_comis']), null, 'valor-laranja') +
							'</tr>' +
						'</tbody>' +
					'</table>' +
				'</totvs-modal-body>' +
				'<totvs-modal-footer>' +
					'<div class="row">' +
						'<div class="col-xs-8 text-left margem-destaque">' +
							'<table>' +
								'<tbody>' +
									'<tr>' +
										'<td class="margem-info-label">Margem Contribuição:</td>' +
										'<td class="margem-info-value" ng-class="modalMargemController.vlMargemContrib > 0 ? \'valor-verde\' : \'valor-vermelho\'">' +
											'{{modalMargemController.formatMoeda(modalMargemController.vlMargemContrib)}} ({{modalMargemController.formatPercentualDireto(modalMargemController.perMargemContrib)}})' +
										'</td>' +
									'</tr>' +
									'<tr>' +
										'<td class="margem-info-label">Margem Contrib. (Tabela):</td>' +
										'<td class="margem-info-value" ng-class="modalMargemController.vlMargemContribTb > 0 ? \'valor-verde\' : \'valor-vermelho\'">' +
											'{{modalMargemController.formatMoeda(modalMargemController.vlMargemContribTb)}} ({{modalMargemController.formatPercentualDireto(modalMargemController.perMargemContribTb)}})' +
										'</td>' +
									'</tr>' +
								'</tbody>' +
							'</table>' +
						'</div>' +
						'<div class="col-xs-4 text-right">' +
							'<button type="button" class="btn btn-default" ng-click="modalMargemController.fechar()">Fechar</button>' +
						'</div>' +
					'</div>' +
				'</totvs-modal-footer>';

			$modal.open({
				template: template,
				controller: ['$modalInstance', function ($modalInstance) {
					var self = this;

					self.opcoesFrete = opcoesFrete;
					self.formatMoeda = formatMoeda;
					self.formatMoedaBRL = formatMoedaBRL;
					self.formatPercentualDireto = formatPercentualDireto;

					var vlLiqPed = Number(item['vl-liq-ped']) || 0;
					var vlLiqPedTab = Number(item['vl-liq-ped-tab']) || 0;

					// Componentes da margem que não mudam com a seleção de frete.
					var custoMateriaPrima = Number(item.custo_materia_prima) || 0;
					var vlCustoFinanc = Number(item.vl_custo_financ) || 0;
					var vlCustoFinancTab = Number(item.vl_custo_financ_tab) || 0;
					var vlCustoDuplicatas = Number(item.vl_custo_duplicatas) || 0;
					var vlComis = Number(item.vl_comis) || 0;
					var vlComisTab = Number(item.vl_comis_tab) || 0;
					var vlIr = Number(item.vl_ir) || 0;
					var vlIrTab = Number(item.vl_ir_tab) || 0;
					var vlVerba = Number(item.vl_verba) || 0;

					function recalcularMargem() {
						self.vlMargemContrib = vlLiqPed - custoMateriaPrima - vlCustoFinanc - vlCustoDuplicatas - vlComis - vlIr - self.vlCustoFrete - vlVerba;
						self.perMargemContrib = vlLiqPed ? (self.vlMargemContrib / vlLiqPed * 100) : 0;

						self.vlMargemContribTb = vlLiqPedTab - custoMateriaPrima - vlCustoFinancTab - vlCustoDuplicatas - vlComisTab - vlIrTab - self.vlCustoFrete - vlVerba;
						self.perMargemContribTb = vlLiqPedTab ? (self.vlMargemContribTb / vlLiqPedTab * 100) : 0;
					}

					var idxRecomendada = -1;
					opcoesFrete.forEach(function (op, idx) {
						if (op.cgc_transportadora === item.cgc_transportadora) idxRecomendada = idx;
					});

					self.transportadoraSelecionada = idxRecomendada >= 0 ? String(idxRecomendada) : OPCAO_COMBINADO;
					self.freteManualValor = Math.round((Number(item.vl_custo_frete) || 0) * 100) / 100;
					self.freteManualPercent = Math.round((Number(item.per_custo_frete) || 0) * 100) / 100;
					self.vlCustoFrete = Number(item.vl_custo_frete) || 0;
					self.perCustoFrete = Number(item.per_custo_frete) || 0;
					recalcularMargem();

					self.isCombinado = function () {
						return self.transportadoraSelecionada === OPCAO_COMBINADO;
					};

					self.aoSelecionarTransportadora = function () {
						if (self.isCombinado()) {
							self.vlCustoFrete = self.freteManualValor;
							self.perCustoFrete = self.freteManualPercent;
							recalcularMargem();
							return;
						}

						var op = self.opcoesFrete[parseInt(self.transportadoraSelecionada, 10)];
						if (!op) return;

						self.vlCustoFrete = Number(op.vl_custo_frete) || 0;
						self.perCustoFrete = Number(op.per_custo_frete) || 0;
						recalcularMargem();
					};

					function arredondar2(valor) {
						return Math.round((Number(valor) || 0) * 100) / 100;
					}

					self.aoAlterarValorManual = function () {
						self.freteManualValor = arredondar2(self.freteManualValor);
						self.freteManualPercent = arredondar2(vlLiqPed ? (self.freteManualValor / vlLiqPed * 100) : 0);
						self.vlCustoFrete = self.freteManualValor;
						self.perCustoFrete = self.freteManualPercent;
						recalcularMargem();
					};

					self.aoAlterarPercentualManual = function () {
						self.freteManualPercent = arredondar2(self.freteManualPercent);
						self.freteManualValor = arredondar2(vlLiqPed * (self.freteManualPercent / 100));
						self.vlCustoFrete = self.freteManualValor;
						self.perCustoFrete = self.freteManualPercent;
						recalcularMargem();
					};

					self.fechar = function () {
						$modalInstance.dismiss();
					};
				}],
				controllerAs: 'modalMargemController',
				backdrop: 'static',
				size: 'lg'
			});
		}

		angular.extend(service, customService);

		return service;
	}

	index.register.factory('custom.dts.mpd.pd4000', CustomService);
});
