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
		$.post('query/dictionary', {}, dict => dictionary = JSON.parse(dict));

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
							$('<a/>').text(state.route[i]).self(a => {
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
			if (data.rule) {
				$('body').$frame('root main main main').html('').append([
					$('<table/>', {
						class: 'table'
					}).append($('<thead/>').append($('<tr/>').append([
						$('<th/>', {
							scope: 'col'
						}).append($('<input/>', {
							type: 'checkbox',
							name: 'all'
						})).append($('<input/>', {
							type: 'checkbox',
							name: 'opp'
						})),
						...data.rule.head.filter(field => !field.hide).map(field => $('<th/>', {
							scope: 'col'
						}).text(dictionary[field.key]))
					]))).append($('<tbody/>').append(data.rule.records.map(record => $('<tr/>').append([
						$('<td/>').append($('<input/>', {
							type: 'checkbox'
						})),
						...data.rule.head.filter(field => !field.hide).map(field => $('<td/>').text(field.type === Date.name ?
							new Date(record.properties[field.key].low * 1000).toJSON().replace(/(\d+)\-(\d+)-(\d+)T(\d+):(\d+):(\d+).*/, (_, y, m, d, h, i, s) => `${y}-${m}-${d} ${h}:${i}:${s}`) :
							(field.type === Number.name ?
									record.properties[field.key].low :
									record.properties[field.key]
							)
						))
					]))).self(tbody => {
						if (data.rule.create) {
							$(tbody).append($('<tr/>').append([
								$('<td/>').append($('<button/>', {
									type: 'button',
									class: 'btn btn-secondary'
								}).text('确认').click(e => {
									$(e.target).parents('tr:first').self(tr => {
										let props = {}, errors = [];
										Array.from($(tr).find('input[type=text]')).reduce((props, input) => {
											let name = $(input).attr('name'), value = $(input).val(), pattern = $(input).attr('pattern');
											if (pattern && !RegExp(pattern).test(value)) errors.push(`${name} 不满足 /${pattern}/!`);
											else props[name] = value;
											return props;
										}, props);
										if (errors.length) alert(errors.join('\n'));
										else {
											$('#requesting_mask').show();
											$.post('create', {
												route: JSON.stringify(state.route),
												props: JSON.stringify(props)
											}, (data) => {
												$('#requesting_mask').hide();
												data = JSON.parse(data);
												if (data.success) location.href = location.href;
												else alert(data.message);
											});
										}
									});
								})),
								...data.rule.head.filter(field => (!field.hide)).map(field => $('<td>').self(td => {
									if (field.edit) {
										$(td).append($(`<${field.edit[0]}/>`).attr(Object.assign({name: field.key}, field.edit[1])))
									}
								})),
								$('<td/>').append($('<button/>', {
									type: 'button',
									class: 'btn btn-secondary'
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
								class: 'btn btn-secondary'
							}).text('创建').click(e => {
								$(e.target).parents('tr:first').self(tr => {
									$(tr).prev().show();
									$(tr).hide();
								});
							}))))
						}
					}))
				]);
			}
		});
	});
})();