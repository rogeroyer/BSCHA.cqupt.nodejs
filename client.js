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
                skip: 0,
                limit: 20,
                arrange: 'desc',
            },
            arrange_token = {
                desc: '▾',
                asc: '▴'
            },
            arrange_reverse_token = {
                asc: 'desc',
                desc: 'asc'
            },
            location_prefix,
            dictionary;
        try {
            location_prefix = location.href.match(/^.*\?/)[0]
        } catch (e) {
            location_prefix = location.href;
        }
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
            }).append($('<img/>', {
                src: 'images/TZcL7Cc.gif'
            }).width('100%').height('100%').css('opacity', '0.15')).hide()
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
                /*$('<div/>').css({
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
                })*/

                $('<nav/>', {
                    class: 'nav nav-pills nav-justified'
                }).css({
                    width: '100%',
                    paddingLeft: '10px',
                    paddingRight: '10px'
                }).append([
                    $('<a/>', {
                        class: 'nav-item nav-link' + (!state.route[0] ? ' active' : ''),
                        href: '/'
                    }).text('Home'),
                    $('<a/>', {
                        class: 'nav-item nav-link' + (state.route[0] === 'training' ? ' active' : ''),
                        href: '?' + JSON.stringify({route: ['training']})
                    }).text('训练集'),
                    $('<a/>', {
                        class: 'nav-item nav-link' + (state.route[0] === 'applying' ? ' active' : ''),
                        href: '?' + JSON.stringify({route: ['applying']})
                    }).text('测试集'),
                    /*$('<a/>', {
                        class: 'nav-item nav-link'
                    }).text('更新系统')*/
                    /*$('<a/>', {
                        class: 'nav-item nav-link'
                    }).css({
                        cursor: 'pointer'
                    }).text('关闭系统').click(e => {
                        if (confirm("确定关闭系统？")) {
                            $.post('system/shutdown');
                        }
                    })*/
                ])
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

        let helper = {
            refreshBatchProcessTriggers: (data) => {
                $('.batch-process').prop('disabled', !($('tbody').find(':checkbox:checked').length || ($(':checkbox[name=others]').prop('checked') && data.table.count > state.limit)))
            }
        };

        $('#requesting_mask').show();
        $.post('query', state, data => {
            $('#requesting_mask').hide();
            data = JSON.parse(data);
            /*$('body').$frame('root main main navigator').children('div.dropdown').self((div) => {
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
            });*/
            if (data.table) {
                if (data.table.upload) {
                    $('body').$frame('root main main navigator').children('nav:first').append($('<a/>', {
                        class: 'nav-item nav-link'
                    }).css({
                        cursor: 'pointer'
                    }).text('上传').click(e => {
                        $('#requesting_mask').show();
                        $.post('upload/' + state.route[0], {}, () => {
                            location.href = location_prefix + JSON.stringify(Object.assign(state, {
                                order: 'create_dt'
                            }));
                        });
                    }));
                }
                if (data.table.download) {
                    $('body').$frame('root main main navigator').children('nav:first').append($('<button/>', {
                        class: 'nav-item nav-link batch-process'
                    }).css({
                        borderWidth: 0,
                        backgroundColor: 'inherit'
                    }).text('下载').click(e => {
                        $('#requesting_mask').show();
                        let identities = Array.from($('tbody').find('input:checkbox:checked')).map(cb => Number.parseInt($(cb).parents('tr:first').children('td:eq(1)').text()));
                        promise(resolve => {
                            if ($(':checkbox[name=others]').prop('checked')) {
                                $.post('query/other_identities', {
                                    route: state.route,
                                    identities: Array.from($('tbody').find('input:checkbox')).map(cb => $(cb).parents('tr:first').children('td:eq(1)').text())
                                }, others => {
                                    others = JSON.parse(others);
                                    identities = [...identities, ...others];
                                    resolve();
                                });
                            } else resolve();
                        }).then(() => {
                            $.post('download', {
                                route: state.route,
                                identities
                            }, sent => {
                                $('#requesting_mask').hide();
                                sent = JSON.parse(sent);
                                if (sent.success) location.assign('http://localhost:3530/' + sent.file);
                                else alert(sent.message)
                            });
                        });
                    }));
                }
                let patterns = JSON.parse(data.table.service.properties.patterns.replace(/\\/g, '\\\\'));
                $('body').$frame('root main main main').html('').append([
                    $('<table/>', {
                        class: 'table'
                    }).append($('<thead/>').append([
                        $('<tr/>').append([
                            $('<th/>').append($('<input>', {
                                type: 'checkbox',
                                name: 'others',
                                "data-toggle": "tooltip",
                                "data-placement": "top",
                                title: "其他页的全部项"
                            }).change(e => helper.refreshBatchProcessTriggers(data))),
                            $('<th/>').append($('<button/>', {
                                type: 'button',
                                class: 'btn btn-primary btn-sm'
                            }).text('新增').click(e => {
                                let $create = $(e.target);
                                $create.prop('disabled', true).parents('tr:first').self(tr => {
                                    $('<tr/>').append([
                                        $('<th/>'),
                                        $('<th/>').append($('<button/>', {
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
                                                        properties: Object.assign(data.table.head.filter(rule => rule.default).reduce((properties, rule) => {
                                                            properties[rule.key] = rule.default;
                                                            return properties;
                                                        }, {}), properties)
                                                    }, (data) => {
                                                        $('#requesting_mask').hide();
                                                        data = JSON.parse(data);
                                                        if (data.success) location.href = location.href;
                                                        else alert(data.message);
                                                    });
                                                }
                                            });
                                        })),
                                        ...data.table.head.filter(field => (!field.hide)).map(field => $('<th/>').self(td => {
                                            if (field.input) $(td).$generateInput(field);
                                        })),
                                        $('<th/>').append($('<button/>', {
                                            type: 'button',
                                            class: 'btn btn-secondary btn-sm'
                                        }).text('取消').click(e => {
                                            $(e.target).parents('tr:first').remove();
                                            $create.prop('disabled', false);
                                        }))
                                    ]).insertAfter($(tr))
                                }).append();
                            })),
                            ...data.table.head.filter(field => !field.hide).map(field => $('<th/>').self(th => {
                                /*if (field.key in patterns) $(th).text(`/^ ${patterns[field.key]} $/`).dblclick(e => {
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
                                });*/
                                if (field.format) $(th).css({
                                    color: 'grey'
                                }).text('格式：' + field.format);
                                else if (field.special) $(th).append($('<button/>', {
                                    type: 'button',
                                    class: 'btn btn-primary btn-sm batch-process'
                                }).text(field.special.name).click(e => {
                                    if (confirm('对所选的项' + field.special.name + '?')) {
                                        $('#requesting_mask').show();
                                        let identities = Array.from($('tbody').find('input:checkbox:checked')).map(cb => Number.parseInt($(cb).parents('tr:first').children('td:eq(1)').text()));
                                        promise(resolve => {
                                            if ($(':checkbox[name=others]').prop('checked')) {
                                                $.post('query/other_identities', {
                                                    route: state.route,
                                                    identities: Array.from($('tbody').find('input:checkbox')).map(cb => $(cb).parents('tr:first').children('td:eq(1)').text())
                                                }, others => {
                                                    others = JSON.parse(others);
                                                    identities = [...identities, ...others];
                                                    resolve();
                                                });
                                            } else resolve();
                                        }).then(() => {
                                            $.post('special/' + field.special.post, {
                                                route: field.route,
                                                identities
                                            }, result => {
                                                result = JSON.parse(result);
                                                alert(result.message);
                                                if (result.success) setTimeout(() => location.href = location.href, 300);
                                                else $('#requesting_mask').hide();
                                            });
                                        });
                                    }
                                }));
                            })),
                            $('<th/>').append($('<button/>', {
                                class: 'btn btn-danger btn-sm batch-process'
                            }).text('删除').click(e => {
                                if (confirm('确定删除所选的项？')) {
                                    $('#requesting_mask').show();
                                    let identities = Array.from($('tbody').find('input:checkbox:checked')).map(cb => Number.parseInt($(cb).parents('tr:first').children('td:eq(1)').text()));
                                    promise(resolve => {
                                        if ($(':checkbox[name=others]').prop('checked')) {
                                            $.post('query/other_identities', {
                                                route: state.route,
                                                identities: Array.from($('tbody').find('input:checkbox')).map(cb => $(cb).parents('tr:first').children('td:eq(1)').text())
                                            }, others => {
                                                others = JSON.parse(others);
                                                identities = [...identities, ...others];
                                                resolve();
                                            });
                                        } else resolve();
                                    }).then(() => {
                                        $.post('delete', {
                                            route: state.route,
                                            identities
                                        }, () => {
                                            location.href = location.href;
                                        });
                                    });
                                }
                            }))
                        ]),
                        $('<tr/>').append([
                            $('<th/>').append($('<a/>').css({
                                cursor: 'pointer'
                            }).text('全').click(e => {
                                $('input:checkbox').prop({
                                    checked: true
                                });
                                helper.refreshBatchProcessTriggers(data);
                            })).append('/').append($('<a/>').css({
                                cursor: 'pointer'
                            }).text('反').click(e => {
                                for (let cb of Array.from($(':checkbox'))) {
                                    $(cb).prop({
                                        checked: !$(cb).prop('checked')
                                    });
                                }
                                helper.refreshBatchProcessTriggers(data);
                            })),
                            $('<th/>').css({
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                            }).text('编号' + (state.order ? '' : arrange_token[state.arrange])).click(e => {
                                location.href = location_prefix + JSON.stringify(Object.assign(state, state.order ? {
                                    order: null
                                } : {
                                    arrange: arrange_reverse_token[state.arrange]
                                }))
                            }),
                            ...data.table.head.filter(field => !field.hide).map(field => $('<th/>').css({
                                whiteSpace: 'nowrap'
                            }).text(dictionary[field.key]).self(th => {
                                if (field.order) $(th).css({
                                    cursor: 'pointer'
                                }).append(state.order === field.key ? arrange_token[state.arrange] : '').click(e => {
                                    location.href = location_prefix + JSON.stringify(Object.assign(state, state.order === field.key ? {
                                        arrange: arrange_reverse_token[state.arrange]
                                    } : {
                                        order: field.key
                                    }));
                                })
                            })),
                            $('<th/>').text('操作')
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
                                    }).change(e => helper.refreshBatchProcessTriggers(data))),
                                    $('<td/>').css({
                                        color: 'grey'
                                    }).text(record.identity.low),
                                    ...data.table.head.filter(field => !field.hide).map(field => $('<td/>').css({
                                        whiteSpace: 'nowrap'
                                    }).self(td => {
                                        let output = wrap(field.output),
                                            value = record.properties[field.key] || '',
                                            text;
                                        switch (output[0]) {
                                            case Date.name:
                                                text = new Date(value.low * 1000).toJSON().replace(/^[^\d]*(\d+)\-(\d+)\-(\d+)[^\d]*(\d+)\:(\d+)\:(\d+).*$/, '$1-$2-$3 $4:$5:$6');
                                                break;
                                            case Number.name:
                                                text = value.low;
                                                break;
                                            case String.name:
                                                text = value.replace(/\n/g, '<br/>');
                                                break;
                                            case 'refer':
                                                text = refers[field.key][value] ? refers[field.key][value].properties[field.refer.key] : '';
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
                                ]))
                            ])
                        });
                    })),
                    $('<div/>').css({
                        paddingTop: '15px',
                        textAlign: 'center',
                        backgroundColor: 'rgb(233, 236, 239)'
                    }).append($('<nav/>').css({
                        display: 'inline-block'
                    }).append($('<ul/>', {
                        class: 'pagination'
                    }).append([
                        $('<li/>', {
                            class: 'page-item'
                        }).append($('<a/>', {
                            class: 'page-link'
                        }).text('上一页')).self(li => {
                            if (Math.ceil(state.skip / state.limit) + 1 > 1) {
                                $(li).children('a:first').click(e => {
                                    location.href = location_prefix + JSON.stringify(Object.assign(state, {
                                        skip: state.skip - state.limit
                                    }));
                                });
                            } else $(li).addClass('disabled');
                        }),
                        $('<li/>', {
                            class: 'page-item'
                        }).append($('<a/>', {
                            class: 'page-link'
                        }).css({
                            cursor: 'auto'
                        }).append([
                            $('<span/>').css({color: 'gray'}).text('第 '),
                            $('<input/>', {type: 'text'}).val(Math.ceil(state.skip / state.limit) + 1).width('30px').change(e => {
                                location.href = location_prefix + JSON.stringify(Object.assign(state, {
                                    skip: ($(e.target).val() - 1) * state.limit
                                }));
                            }),
                            $('<span/>').css({color: 'gray'}).text(' 页 共 '),
                            Math.ceil(data.table.count / state.limit),
                            $('<span/>').css({color: 'gray'}).text(' 页 每页 '),
                            $('<input/>', {type: 'text'}).val(state.limit).width('30px').change(e => {
                                let limit = Number.parseInt($(e.target).val());
                                location.href = location_prefix + JSON.stringify(Object.assign(state, {
                                    skip: 0,
                                    limit: limit
                                }));
                            }),
                            $('<span/>').css({color: 'gray'}).text(' 项 共 '),
                            data.table.count,
                            $('<span/>').css({color: 'gray'}).text(' 项'),
                        ])),
                        $('<li/>', {
                            class: 'page-item'
                        }).append($('<a/>', {
                            class: 'page-link'
                        }).text('下一页')).self(li => {
                            if (Math.ceil(state.skip / state.limit) + 1 < Math.ceil(data.table.count / state.limit)) {
                                $(li).children('a:first').click(e => location.href = location_prefix + JSON.stringify(Object.assign(state, {
                                    skip: state.skip + state.limit
                                })));
                            } else $(li).addClass('disabled');
                        })
                    ])))
                ]);
                helper.refreshBatchProcessTriggers(data);
            }
        });
    });
})();