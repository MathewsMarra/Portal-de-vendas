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
				url: '/api/rest-api/mpd/v1/esporder2/quantidadecaixa/:orderId',
				transformResponse: function (data) {
					return angular.fromJson(data);
				}
			},
			
			'getQtNaCaixaUN': {
                method: 'GET',
                isArray: false,
                params: {codEstabel: '@codEstabel', itCodigo: '@itCodigo'},
                url: '/dts/datasul-rest/resources/prg/rest-api/v1/esporder2/quantidadecaixaun'
            },
			
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

				wsOrder2.getQtNaCaixaPedido(
					{ orderId: orderId },
					function (result) {

						let mapItens = {};

						if (result && result.items) {
							result.items.forEach(function (item) {
								mapItens[item.nrSequencia] = item;
							});
						}

						resolve(mapItens);
					}
				);
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
							if(result['qtde-na-caixa'] != undefined){
								self.portalItemsGrid.searchItemsGrid.dataSource._data[currentIndex]['qt-un-fat'] = (value * result['qtde-na-caixa']);
								self.portalItemsGrid.listResult[currentIndex]['qt-un-fat'] = (value * result['qtde-na-caixa']);
								self.portalItemsGrid.listResult[currentIndex]['cod-unid-negoc'] = result['cod-unid-negoc'];
								
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
					.then(function (mapItens) {

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

				loadQtNaCaixaByOrder(params.itemsGridController.orderId).then(function (mapItens) {

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
					html = '<td style="text-align: right;" class role="gridcell" ><span>' + data['qtCaixas'] + '</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[3]); 
					
					//inicio
					//html = '<td style="text-align: right;" class role="gridcell" ><span>' + Number(data['valunifin']).toFixed(2) + '</span></td>';

					html = '<td style="text-align: right;" class role="gridcell"><span>' +
						(data['vl-preori'] !== data['vl-preuni']
								? '<s>' + Number(data['vl-preori']).toFixed(2) + '</s> ' + Number(data['vl-preuni']).toFixed(2)
								: Number(data['vl-preuni']).toFixed(2)
						) +
						'</span></td>';
					compiledHTML = customService.compileHTML(params, html)
					collectionRows[index].insertBefore(compiledHTML[0], collectionRows[index].cells[5]); 
					//fim

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
				codEstabel: params.itemController.order['cod-estabel'],
				itCodigo: params.itemController.item['it-codigo']
			}, function(result) {

				if (result && result['qtde-na-caixa']) {
					$timeout(function () {

						let qtNaCaixa = result['qtde-na-caixa'];

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


