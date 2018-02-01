(() => {
	'use strict';

	$(() => {
		let state_merge = (() => {
				try {
					return JSON.parse(unescape(location.href).match(/(?<=\?).*$/)[0]);
				} catch (e) {
					return undefined;
				}
			})(),
			state = {
				route: []
			},
			dictionary;
		Object.assign(state, state_merge);
		$.ajaxSetup({async: false});
		$.post('query/dictionary', {}, dict => dictionary = JSON.parse(dict));
		$.ajaxSetup({async: true});

		$('html').css({
			height: '100%'
		});
		$('body').css({
			height: '100%'
		}).append([
			$('<div/>', {
				class: 'frame',
				name: 'root'
			}).css({
				minHeight: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				alignItems: 'stretch',
				alignContent: 'stretch'
			}).append([
				$('<div/>', {
					class: 'frame',
					name: 'head'
				}).css({
					flex: '1 0 128px'
				}),
				$('<div/>', {
					class: 'frame',
					name: 'main'
				}).append([
					$('<div/>', {
						class: 'frame',
						name: 'login'
					}).hide(),
					$('<div/>', {
						class: 'frame',
						name: 'main'
					}).css({
						display: 'flex',
						flexDirection: 'column'
					}).append([
						$('<div/>', {
							class: 'frame',
							name: 'navigator'
						}).css({
							flex: '0 1 64px',
						}),
						$('<div/>', {
							class: 'frame',
							name: 'main'
						})
					])
				]),
				$('<div/>', {
					class: 'frame',
					name: 'foot'
				}).css({
					flex: '1 0 128px'
				})
			]),
			$('<div/>', {
				id: 'requesting_mask'
			}).css({
				position: 'absolute',
				top: 0,
				width: '100%',
				height: '100%'
			}).hide()
		]);

		$.fn.self = function (callback) {
			callback(this[0]);
			return this;
		};
		$.fn.$frame = function (names) {
			let $element = this;
			for (let name of names.trim().split(/\s+/)) {
				let $child = $element.children(`div.frame[name=${name}]`);
				if ($child.length) $element = $child;
				else break;
			}
			return $element;
		};

		let wrap = (x) => (typeof x) == 'string' ? [x, {}] : x;

		$('body').$frame('root').self((root) => {
			$(root).$frame('head').css({
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: 'DarkRed',
				color: 'Red'
			}).append([
				$('<h1/>').css({
					textAlign: 'center'
				}).text('Blood Classification System')
			]);
			$(root).$frame('main main navigator').css({
				backgroundColor: '#e9ecef',
				display: 'flex',
				alignItems: 'center'
			}).append([
				$('<div/>').css({
					marginLeft: '.75rem'
				}).append($('<a/>').text('Home').self(a => {
					if (state.route.length) $(a).attr({
						href: '/'
					});
				})).self(div => {
					for (let i in state.route) {
						$(div).append([
							$('<span/>').text(' / '),
							$('<a/>').text(dictionary[state.route[i]]).self(a => {
								if (i < state.route.length - 1) $(a).attr({
									href: state.slice(0, i)
								});
							})
						]);
					}
				}),
				$('<div/>', {
					class: 'dropdown'
				}).css({
					marginLeft: '.75rem'
				}).self((div) => {
					$(div).append($('<button/>', {
						type: 'button',
						class: 'btn btn-primary dropdown-toggle',
						'data-toggle': 'dropdown',
						'aria-haspopup': 'true',
						'aria-expanded': 'false'
					}).one('click', (e) => setTimeout(() => {
						$(e.target).trigger('click')
					}, 0)));
				})
			]);
			$(root).$frame('foot').css({
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: 'Black',
				color: 'white'
			}).append([
				$('<span/>').css({
					textAlign: 'center'
				}).text('Copyright © 2018 Chongqing University of Posts and Telecommunications Inc. All rights reserved.')
			])
		});

		let $generateInput = (field) => {
			let input = wrap(field.input);
			switch (input[0]) {
				case 'select':
					return;
				default:
					return $(`<${input[0]}/>`).attr(Object.assign({name: field.key}, input[1]));
			}
		};
		$.fn.$generateModifier = function ({field, value, valueDecorator = v => v, callback}) {
			this.html('').append([
				$generateInput(field).val(value),
				'&nbsp;',
				$('<a/>').css({
					cursor: 'pointer'
				}).text('☒').click(() => $(this).text(valueDecorator(value))),
				'&nbsp;',
				$('<a/>').css({
					cursor: 'pointer',
					color: 'red'
				}).text('☑').click(e => callback(e))
			]);
			return this;
		};

		$.post('query', {
			route: JSON.stringify(state.route)
		}, data => {
			data = JSON.parse(data);
			$('body').$frame('root main main navigator').children('div.dropdown').self((div) => {
				if (data.services.length) {
					$(div).append($('<div/>', {
						class: 'dropdown-menu'
					}).append(data.services.map((service) => $('<a/>', {
						class: 'dropdown-item'
					}).css({
						cursor: 'pointer'
					}).text(dictionary[service]).click(() => {
						location.href = `?${JSON.stringify({
							route: [...state.route, service]
						})}`;
					}))));
				} else $(div).children('button').prop({
					disabled: true
				}).hide();
			});
			if (data.table) {
				let patterns = JSON.parse(data.table.service.properties.patterns.replace(/\\/g, '\\\\'));
				$('body').$frame('root main main main').html('').append([
					$('<table/>', {
						class: 'table'
					}).append($('<thead/>').append([
						$('<tr/>').append([
							$('<th/>', {
								scope: 'col'
							}),
							...data.table.head.filter(field => !field.hide).map(field => $('<th/>', {
								scope: 'col'
							}).self(th => (field.key in patterns) && $(th).text(`/^ ${patterns[field.key]} $/`).dblclick(e => {
								let w = $(th).width();
								$(th).$generateModifier({
									field: {key: '', input: 'textarea'},
									value: patterns[field.key],
									valueDecorator: v => `/^ ${v} $/`,
									callback: e => {
										if (confirm('确定修改规则？')) {
											$('#requesting_mask').show();
											$.post('modify/pattern', {
												identity: data.table.service.identity.low,
												key: field.key,
												value: $(th).children('input:first').val()
											}, () => {
												$('#requesting_mask').hide();
												location.href = location.href;
											});
										}
									}
								}).children('textarea:first').width(w);
							}))),
							$('<th/>', {
								scope: 'col'
							})
						]),
						$('<tr/>').append([
							$('<th/>', {
								scope: 'col'
							}).append($('<a/>').css({
								cursor: 'pointer'
							}).text('A').click(e => $(e.target).parents('table:first').children('tbody').find('input:checkbox').prop({
								checked: true
							}))).append('/').append($('<a/>').css({
								cursor: 'pointer'
							}).text('O').click(e => {
								for (let cb of Array.from($(e.target).parents('table:first').children('tbody').find('input:checkbox'))) {
									$(cb).prop({
										checked: !$(cb).prop('checked')
									});
								}
							})),
							...data.table.head.filter(field => !field.hide).map(field => $('<th/>', {
								scope: 'col'
							}).css({
								whiteSpace: 'nowrap'
							}).text(dictionary[field.key])),
							$('<th/>', {
								scope: 'col'
							}).append($('<button/>', {
								class: 'btn btn-danger btn-sm'
							}).text('批量删除').click(e => $(e.target).parents('table:first').children('tbody').self(tbody => {
								let $checked = $(tbody).find('input:checkbox:checked');
								if ($checked.length && confirm('确定删除选定的记录？')) {
									$('#requesting_mask').show();
									$.post('delete', {
										route: JSON.stringify(state.route),
										identities: JSON.stringify(Array.from($checked).map(cb => $(cb).parents('tr:first').data('id')))
									}, () => {
										$('#requesting_mask').hide();
										location.href = location.href;
									});
								}
							})))
						])
					])).append($('<tbody/>').append(data.table.records.map(record => $('<tr/>').data('id', record.identity.low).append([
						$('<td/>').append($('<input/>', {
							type: 'checkbox'
						})),
						...data.table.head.filter(field => !field.hide).map(field => $('<td/>').self(td => {
							let output = wrap(field.output);
							let value = output[0] === Date.name ?
								new Date(record.properties[field.key].low * 1000).toJSON().replace(/(\d+)\-(\d+)-(\d+)T(\d+):(\d+):(\d+).*/, (_, y, m, d, h, i, s) => `${y}-${m}-${d} ${h}:${i}:${s}`) :
								(output[0] === Number.name ?
										record.properties[field.key].low :
										record.properties[field.key]
								);
							$(td).text(value);
							if (field.input) $(td).dblclick(e => {
								$(td).$generateModifier({
									field,
									value,
									callback: e => {
										let pattern = patterns[field.key],
											value = $(td).children(':first').val();
										if (pattern && !RegExp(`^${pattern}$`).test(value)) alert(`${value} 不符合 /^ ${pattern} $/`);
										else if (confirm('确定修改字段？')) {
											$('#requesting_mask').show();
											$.post('modify', {
												route: JSON.stringify(state.route),
												identity: record.identity.low,
												key: field.key,
												value: value
											}, (data) => {
												$('#requesting_mask').hide();
												data = JSON.parse(data);
												if (data.success) location.href = location.href;
												else alert(data.message);
											});
										}
									}
								});
							});
							else $(td).css({
								color: 'grey'
							});
						})),
						$('<td/>').append($('<button/>', {
							class: 'btn btn-danger btn-sm'
						}).text('删除').click(e => {
							if (confirm('确定删除这条记录？')) {
								$('#requesting_mask').show();
								$.post('delete', {
									route: JSON.stringify(state.route),
									identities: JSON.stringify([$(e.target).parents('tr:first').data('id')])
								}, () => {
									$('#requesting_mask').hide();
									location.href = location.href;
								});
							}
						})),
					]))).append($('<tr/>').append([
						$('<td/>').append($('<button/>', {
							type: 'button',
							class: 'btn btn-success btn-sm'
						}).text('确认').click(e => {
							$(e.target).parents('tr:first').self(tr => {
								let properties = {}, errors = [];
								Array.from($(tr).find('input[type=text]')).reduce((properties, input) => {
									let name = $(input).attr('name'), value = $(input).val(), pattern = patterns[name];
									if (pattern && !RegExp(`^${pattern}$`).test(value)) errors.push(`${name} 不符合 /^ ${pattern} $/`);
									else properties[name] = value;
									return properties;
								}, properties);
								if (errors.length) alert(errors.join('\n'));
								else {
									$('#requesting_mask').show();
									$.post('create', {
										route: JSON.stringify(state.route),
										properties: JSON.stringify(properties)
									}, (data) => {
										$('#requesting_mask').hide();
										data = JSON.parse(data);
										if (data.success) location.href = location.href;
										else alert(data.message);
									});
								}
							});
						})),
						...data.table.head.filter(field => (!field.hide)).map(field => $('<td>').self(td => {
							if (field.input) $(td).append($generateInput(field));
						})),
						$('<td/>').append($('<button/>', {
							type: 'button',
							class: 'btn btn-secondary btn-sm'
						}).text('取消').click(e => {
							$(e.target).parents('tr:first').self(tr => {
								$(tr).next().show();
								$(tr).hide();
							});
						}))
					]).hide()).append($('<tr/>').append($('<td/>', {
						colspan: 99
					}).append($('<button/>', {
						type: 'button',
						class: 'btn btn-primary btn-sm'
					}).text('创建').click(e => {
						$(e.target).parents('tr:first').self(tr => {
							$(tr).prev().show();
							$(tr).hide();
						});
					})))))
				]);
			}
		});
	});
})();