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
                route: [],
                paginate: {
                    limit: 20,
                    page: 1
                }
            },
            dictionary;
        Object.assign(state, state_merge);
        $.ajaxSetup({async: false});
        $.getScript('extend.js');
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

        $.fn.$generateInput = function (field, value = '', callback = () => {
        }) {
            let input = wrap(field.input);
            switch (input[0]) {
                case 'refer':
                    $.post('query', field.refer, data => {
                        let $select = $('<select/>', {
                            name: field.key,
                            class: 'form-control'
                        }).width('auto').append(JSON.parse(data).table.records.map(record => $('<option/>', {
                            value: record.identity.low
                        }).text(record.properties[field.refer.key]))).val(value);
                        this.append($select);
                        callback($select[0]);
                    });
                    break;
                default:
                    let $input = $(`<${input[0]}/>`, Object.assign({
                        name: field.key,
                        class: 'form-control'
                    }, input[1])).val(value);
                    this.append($input);
                    callback($input[0]);
            }
            return this;
        };
        $.fn.$generateModifier = function ({field, value, callback}) {
            let html = this.html();
            this.html('').append($('<div/>').$generateInput(field, value)).append([
                $('<button/>', {
                    type: 'button',
                    class: 'btn btn-primary btn-sm'
                }).css({
                    margin: '5px'
                }).text('确认').click(e => callback(e)),
                $('<button/>', {
                    type: 'button',
                    class: 'btn btn-secondary btn-sm'
                }).css({
                    margin: '5px'
                }).text('取消').click(() => this.html(html))
            ]);
            return this;
        };

        $.post('query', state, data => {
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
                            }).self(th => {
                                if (data.table.special) switch (data.table.special) {
                                    case 'classify':
                                        $(th).append($('<button>', {
                                            type: 'button',
                                            class: 'btn btn-dark btn-sm'
                                        }).text('分类').click(e => $(e.target).parents('table:first').children('tbody').self(tbody => {
                                            let $checked = $(tbody).find('input:checkbox:checked');
                                            if ($checked.length && confirm('对选定的样本分类？')) {
                                                $('#requesting_mask').show();
                                                $.post('special/classify', {
                                                    identities: Array.from($checked).map(cb => $(cb).parents('tr:first').children('td:eq(1)').text())
                                                }, (data) => {
                                                    $('#requesting_mask').hide();
                                                    data = JSON.parse(data);
                                                    if (!data.success) alert(data.message);
                                                    else location.href = location.href;
                                                });
                                            }
                                        })));
                                        break;
                                }
                            }),
                            $('<th/>', {
                                scope: 'col'
                            }),
                            ...data.table.head.filter(field => !field.hide).map(field => $('<th/>', {
                                scope: 'col'
                            }).self(th => {
                                if (field.key in patterns) $(th).text(`/^ ${patterns[field.key]} $/`).dblclick(e => {
                                    $(th).$generateModifier({
                                        field: {key: '', input: 'textarea'},
                                        value: patterns[field.key],
                                        callback: e => {
                                            if (confirm('确定修改规则？')) {
                                                $('#requesting_mask').show();
                                                $.post('modify/pattern', {
                                                    identity: data.table.service.identity.low,
                                                    key: field.key,
                                                    value: $(th).children(':first').children(':first').val()
                                                }, () => {
                                                    $('#requesting_mask').hide();
                                                    location.href = location.href;
                                                });
                                            }
                                        }
                                    });
                                });
                            })),
                            $('<th/>', {
                                scope: 'col'
                            })
                        ]),
                        $('<tr/>').append([
                            $('<th/>', {
                                scope: 'col'
                            }).append($('<a/>').css({
                                cursor: 'pointer'
                            }).text('全').click(e => $(e.target).parents('table:first').children('tbody').find('input:checkbox').prop({
                                checked: true
                            }))).append('/').append($('<a/>').css({
                                cursor: 'pointer'
                            }).text('反').click(e => {
                                for (let cb of Array.from($(e.target).parents('table:first').children('tbody').find('input:checkbox'))) {
                                    $(cb).prop({
                                        checked: !$(cb).prop('checked')
                                    });
                                }
                            })),
                            $('<th/>', {
                                scope: 'col'
                            }).text('编号'),
                            ...data.table.head.filter(field => !field.hide).map(field => $('<th/>', {
                                scope: 'col'
                            }).css({
                                whiteSpace: 'nowrap'
                            }).self(th => {
                                if (field.special) $(th).append($('<button/>', {
                                    type: 'button',
                                    class: 'btn btn-primary btn-sm'
                                }).text(dictionary[field.key]));
                                else $(th).text(dictionary[field.key]);
                            })),
                            $('<th/>', {
                                scope: 'col'
                            }).append($('<button/>', {
                                class: 'btn btn-danger btn-sm'
                            }).text('删除').click(e => $(e.target).parents('table:first').children('tbody').self(tbody => {
                                let $checked = $(tbody).find('input:checkbox:checked');
                                if ($checked.length && confirm('确定删除选定的记录？')) {
                                    $('#requesting_mask').show();
                                    $.post('delete', {
                                        route: state.route,
                                        identities: Array.from($checked).map(cb => $(cb).parents('tr:first').children('td:eq(1)').text())
                                    }, () => {
                                        $('#requesting_mask').hide();
                                        location.href = location.href;
                                    });
                                }
                            })))
                        ])
                    ])).append($('<tbody/>').self(tbody => {
                        let refers = data.table.head.reduce((refers, rule) => {
                            if (rule.output === 'refer') refers[rule.key] = rule.refer;
                            return refers;
                        }, {});
                        Promise.all(Object.keys(refers).map(key => promise(resolve => $.post('query', refers[key], data => resolve({
                            key: key,
                            value: JSON.parse(data).table.records.reduce((refers, record) => {
                                refers[record.identity.low] = record;
                                return refers;
                            }, {})
                        }))))).then(refers => {
                            refers = refers.reduce((refers, refer) => {
                                refers[refer.key] = refer.value;
                                return refers;
                            }, {});
                            $(tbody).append([
                                ...data.table.records.map(record => $('<tr/>').append([
                                    $('<td/>').append($('<input/>', {
                                        type: 'checkbox'
                                    })),
                                    $('<td/>').css({
                                        color: 'grey'
                                    }).text(record.identity.low),
                                    ...data.table.head.filter(field => !field.hide).map(field => $('<td/>').self(td => {
                                        let output = wrap(field.output),
                                            value = record.properties[field.key] || '',
                                            text;
                                        switch (output[0]) {
                                            case Date.name:
                                                text = new Date(value.low * 1000).toJSON().replace(/(\d+)\-(\d+)-(\d+)T(\d+):(\d+):(\d+).*!/, (_, y, m, d, h, i, s) => `${y}-${m}-${d} ${h}:${i}:${s}`);
                                                break;
                                            case Number.name:
                                                text = value.low;
                                                break;
                                            case String.name:
                                                text = value.replace(/\n/g, '<br/>');
                                                break;
                                            case 'refer':
                                                text = refers[field.key][value].properties[field.refer.key];
                                                break;
                                            default:
                                                text = '';
                                        }
                                        let mission = box => {
                                            $(box).html(text);
                                            if (field.input) $(box).dblclick(e => {
                                                $(box).$generateModifier({
                                                    field,
                                                    value,
                                                    callback: e => {
                                                        let pattern = patterns[field.key],
                                                            value = $(box).children(':first').children(':first').val();
                                                        if (pattern && !RegExp(`^${pattern}$`).test(value)) alert(`${value} 不符合 /^ ${pattern} $/`);
                                                        else if (confirm('确定修改字段？')) {
                                                            $('#requesting_mask').show();
                                                            $.post('modify', {
                                                                route: state.route,
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
                                            else $(box).css({
                                                color: 'grey'
                                            });
                                        };
                                        if (output[1].long) $(td).append([
                                            $('<button/>', {
                                                type: 'button',
                                                class: 'btn btn-light btn-sm'
                                            }).text('展开 >>').click(e => $(e.target).hide().next().show()),
                                            $('<div/>').append([
                                                $('<span/>').css({
                                                    display: 'inline-block'
                                                }).self(span => mission(span)),
                                                $('<button/>', {
                                                    type: 'button',
                                                    class: 'btn btn-dark btn-sm'
                                                }).css({
                                                    display: 'inline-block',
                                                    verticalAlign: 'top',
                                                    marginLeft: '.75rem'
                                                }).text('<< 收起').click(e => $(e.target).parent().hide().prev().show())
                                            ]).hide()
                                        ]);
                                        else mission(td);
                                    })),
                                    $('<td/>').append($('<button/>', {
                                        class: 'btn btn-danger btn-sm'
                                    }).text('删除').click(e => {
                                        if (confirm('确定删除这条记录？')) {
                                            $('#requesting_mask').show();
                                            $.post('delete', {
                                                route: state.route,
                                                identities: [$(e.target).parents('tr:first').children('td:eq(1)').text()]
                                            }, () => {
                                                $('#requesting_mask').hide();
                                                location.href = location.href;
                                            });
                                        }
                                    })),
                                ])),
                                $('<tr/>').append([
                                    $('<td/>').append($('<button/>', {
                                        type: 'button',
                                        class: 'btn btn-primary btn-sm'
                                    }).text('确认').click(e => {
                                        $(e.target).parents('tr:first').self(tr => {
                                            let properties = {}, errors = [];
                                            Array.from($(tr).find(':input,textarea,select')).reduce((properties, input) => {
                                                let name = $(input).attr('name'), value = $(input).val(), pattern = patterns[name];
                                                if (pattern && !RegExp(`^${pattern}$`).test(value)) errors.push(`${dictionary[name]} 不符合 /^ ${pattern} $/`);
                                                else properties[name] = value;
                                                return properties;
                                            }, properties);
                                            if (errors.length) alert(errors.join('\n'));
                                            else {
                                                $('#requesting_mask').show();
                                                $.post('create', {
                                                    route: state.route,
                                                    properties: properties
                                                }, (data) => {
                                                    $('#requesting_mask').hide();
                                                    data = JSON.parse(data);
                                                    if (data.success) location.href = location.href;
                                                    else alert(data.message);
                                                });
                                            }
                                        });
                                    })),
                                    $('<td/>'),
                                    ...data.table.head.filter(field => (!field.hide)).map(field => $('<td>').self(td => {
                                        if (field.input) $(td).$generateInput(field);
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
                                ]).hide(),
                                $('<tr/>').append($('<td/>', {
                                    colspan: 999
                                }).append($('<button/>', {
                                    type: 'button',
                                    class: 'btn btn-primary btn-sm'
                                }).text('创建').click(e => {
                                    $(e.target).parents('tr:first').self(tr => {
                                        $(tr).prev().show();
                                        $(tr).hide();
                                    });
                                })))
                            ])
                        });
                    }))
                ]);
            }
        });
    });
})();