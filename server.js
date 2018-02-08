(do {
    'use strict';

    const express = require('express'),
        bodyParser = require('body-parser'),
        neo4j = require('neo4j-driver').v1,
        child_process = require('child_process'),
        fs = require('fs'),
        XLSX = require('xlsx');
    require('./extend');

    let nd = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha'));

    const router = {
        services: ['species', 'training', 'applying'],
        species: {
            services: [],
            table: {
                referred: [
                    {route: ['training'], key: 'species'}
                ],
                head: [
                    {key: 'name', primary: true, output: String.name, input: ['input', {type: 'text'}], order: true},
                    {key: 'description', output: String.name, input: 'textarea'},
                    {key: 'update_dt', output: Date.name, order: true},
                    {key: 'create_dt', output: Date.name, order: true}
                ]
            }
        },
        training: {
            services: [],
            table: {
                head: [
                    {key: 'species', output: 'refer', input: 'refer', refer: {route: ['species'], key: 'name'}, order: true},
                    {key: 'name', output: String.name, input: ['input', {type: 'text'}], order: true, format: '.+', format_tip: '非空'},
                    {key: 'data', output: [String.name, {long: true}], input: 'textarea', format: '(\\d+\\s+\\d+|\\n)+', format_tip: '多行，每行两个数字'},
                    {key: 'update_dt', output: Date.name, order: true},
                    {key: 'create_dt', output: Date.name, order: true}
                ],
                upload: true
            }
        },
        applying: {
            services: [],
            table: {
                special: 'classify',
                head: [
                    {key: 'name', output: String.name, input: ['input', {type: 'text'}], order: true, format: '.+', format_tip: '非空'},
                    {key: 'data', output: [String.name, {long: true}], input: 'textarea', format: '(\\d+\\s+\\d+|\\n)+', format_tip: '多行，每行两个数字'},
                    {key: 'classification_probability', output: Number.name, default: NaN, special: {name: '分类', post: 'classify', span: 2}, order: true},
                    {key: 'classification', output: String.name, default: '未知', special: {hide: true}, order: true},
                    {key: 'update_dt', output: Date.name, order: true},
                    {key: 'create_dt', output: Date.name, order: true}
                ],
                upload: true,
                download: ['name', 'classification_probability', 'classification']
            }
        }
    };

    const classification_description = {
        [true]: '人类',
        [false]: '动物'
    };

    const dictionary = {
        species: '物种',
        training: '训练集',
        applying: '测试集',
        name: '名称',
        description: '描述',
        data: '数据',
        classification_probability: '分类概率',
        classification: '分类',
        create_dt: '创建时间',
        update_dt: '修改时间'
    };

    express()
        .use(express.static('.'))
        .use(bodyParser.json({
            limit: '50mb'
        }))
        .use(bodyParser.urlencoded({
            limit: '50mb',
            extended: true
        }))
        .get(/^.*$/, (req, res) => {
            res.send(require('fs').readFileSync('client.html', 'utf8'));
        })
        .post(/query\/dictionary$/i, (req, res) => {
            res.send(JSON.stringify(dictionary));
        })
        .post(/query\/other_identities$/, (req, res) => {
            let {route = [], identities} = req.body;
            let ns = nd.session();
            ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where not (id(n) in [${identities.join(',')}]) return id(n)`).then(({records}) => {
                ns.close();
                res.send(JSON.stringify(records.map(record => record._fields[0].low)));
            });
        })
        .post(/query$/i, (req, res) => {
            let {route = [], skip = 0, limit, order, arrange = 'desc'} = req.body;
            let data = route.reduce((a, b) => a[b], router);
            if (data.table) {
                let ns = nd.session();
                ns.run(`match (:root{name:'BSCHA'})${route.slice(0, route.length - 1).map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:specialize]->(n:class{name:'${route[route.length - 1]}'}) return n`).then(({records: [{_fields: [service]}]}) => {
                    let cql = `match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n)`;
                    ns.run(cql + ' return count(n)').then(({records: [{_fields: [{low: count}]}]}) => {
                        ns.run(cql + ` return n order by ${order ? `n.${order}` : 'id(n)'} ${arrange} skip ${skip} ${limit ? `limit ${limit}` : ''}`).then(({records}) => {
                            ns.close();
                            Object.assign(data.table, {
                                service,
                                count,
                                records: records.map(record => record._fields[0])
                            });
                            res.send(JSON.stringify(data));
                        });
                    });
                });
            } else res.send(JSON.stringify(data));
        })
        .post(/create$/i, (req, res) => {
            let {route, properties} = req.body,
                data = route.reduce((a, b) => a[b], router);
            let head = data.table.head.reduce((head, seg) => Object.assign(head, {
                [seg.key]: seg
            }), {});
            Object.keys(properties).forEach(key => {
                if (head[key] && head[key].refer) properties[key] = Number.parseInt(properties[key]);
            });
            console.log(properties);
            if (data.table) {
                let ns = nd.session(),
                    checks = [], errors = [], t = 0,
                    mission = () => {
                        let current_dt = Math.floor(Date.now() / 1000);
                        ns.run(`match (:root{name:'BSCHA'})${route.slice(0, route.length - 1).map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:specialize]->(n:class{name:'${route[route.length - 1]}'}) create (n)-[:implement]->(:instance${JSON.stringify(Object.assign(properties, {
                            create_dt: current_dt,
                            update_dt: current_dt
                        })).replace(/\"([^\"]+)\"\:/g, '$1:')})`).then(() => {
                            ns.close();
                            res.send(JSON.stringify({
                                success: true
                            }));
                        });
                    };
                data.table.head.forEach(prop_rule => {
                    if ((prop_rule.key in properties) && prop_rule.primary) checks.push(() => {
                        ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where n.${prop_rule.key}='${properties[prop_rule.key]}' return n`).then(({records}) => {
                            if (records.length) errors.push(`${prop_rule.key} 为 ${properties[prop_rule.key]} 的记录已存在`);
                            if (++t === checks.length) {
                                if (errors.length) {
                                    ns.close();
                                    res.send(JSON.stringify({
                                        success: false,
                                        message: `创建失败：\n${errors.join('\n')}`
                                    }));
                                } else mission();
                            }
                        });
                    });
                });
                if (!checks.length) mission();
                else for (let check of checks) check();
            }
        })
        .post(/delete$/i, (req, res) => {
            let {route, identities} = req.body,
                data = route.reduce((a, b) => a[b], router);
            identities = JSON.parse(identities);
            let ns = nd.session();
            promise(resolve => {
                if (data.table.referred && data.table.referred.length) {
                    Promise.all(data.table.referred.map(service => promise(resolve => ns.run(
                        `match (:root{name:'BSCHA'})${service.route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[r:implement]->(n) where n.${service.key}='${id}' delete r,n`
                    ).then(() => resolve())))).then(() => resolve());
                } else resolve();
            }).then(() => {
                ns.run(
                    `match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[r:implement]->(n) where id(n) in ${JSON.stringify(identities)} delete r,n`
                ).then(() => {
                    ns.close();
                    res.send(null);
                })
            });
        })
        .post(/modify\/pattern$/i, (req, res) => {
            let {identity, key, value} = req.body,
                ns = nd.session();
            ns.run(`match (n) where id(n)=${identity} return n`).then(({records: [service]}) => {
                let patterns = Object.assign(JSON.parse(service._fields[0].properties.patterns.replace(/\\/g, '\\\\')), {
                    [key]: value
                });
                ns.run(`match (n) where id(n)=${identity} set n.patterns='${JSON.stringify(patterns)}'`).then(() => {
                    ns.close();
                    res.send(null);
                });
            });
        })
        .post(/modify$/i, (req, res) => {
            let {route, identity, key, value} = req.body,
                data = route.reduce((a, b) => a[b], router);
            let head = data.table.head.reduce((head, seg) => Object.assign(head, {
                [seg.key]: seg
            }), {});
            if (head[key].refer) value = Number.parseInt(value);
            if (data.table) {
                let ns = nd.session(),
                    rule = data.table.head.find((rule) => rule.key === key),
                    mission = () => {
                        ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where id(n)=${identity} set n.${key}=${JSON.stringify(value)},n.update_dt=${Math.floor(Date.now() / 1000)}`).then(() => {
                            ns.close();
                            res.send(JSON.stringify({
                                success: true
                            }));
                        });
                    };
                if (rule.primary) ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where n.${key}='${value}' return n`).then(({records}) => {
                    if (records.length) {
                        ns.close();
                        if (records[0]._fields[0].identity.low == identity) res.send(JSON.stringify({
                            success: true
                        }));
                        else res.send(JSON.stringify({
                            success: false,
                            message: `创建失败：${key} 为 ${value} 的记录已存在`
                        }));
                    } else mission();
                });
                else mission();
            }
        })
        .post(/special\/classify$/i, (req, res) => {
            let {identities} = req.body;
            identities = JSON.parse(identities);
            identities.forEach((identity, i) => identities[i] = Number.parseInt(identity));
            child_process.exec(`python classify.py "${JSON.stringify(identities)}"`, (error, stdout, stderr) => {
                if (error) {
                    res.send(JSON.stringify({
                        success: false,
                        message: error.toString()
                    }));
                } else if (stderr.length) {
                    res.send(JSON.stringify({
                        success: false,
                        message: stderr.toString()
                    }));
                } else try {
                    let data = JSON.parse(stdout);
                    promise(resolve => {
                        if (data.success && data.result.length) {
                            let ns = nd.session();
                            Promise.all(data.result.map(({probability, normalized}, index) => promise(resolve => {
                                ns.run(`match (n) where id(n)=${identities[index]} set n.classification_probability=${probability},n.classification='${classification_description[normalized]}',n.update_dt=${ Math.floor(Date.now() / 1000)}`).then(() => resolve())
                            }))).then(() => {
                                ns.close();
                                resolve();
                            });
                        } else resolve();
                    }).then(() => res.send(JSON.stringify(data)));
                } catch (e) {
                    res.send(JSON.stringify({
                        success: false,
                        message: e.toString()
                    }));
                }
            });
        })
        .post(/upload\/training$/i, (req, res) => {
            child_process.exec('start nnode.bat upload-training_data.js', () => {
                res.send(null);
            });
        })
        .post(/upload\/applying/i, (req, res) => {
            child_process.exec('start nnode.bat upload-applying_data.js', () => {
                res.send(null);
            });
        })
        .post(/download$/i, (req, res) => {
            let {route, identities} = req.body,
                data = route.reduce((a, b) => a[b], router);
            identities = JSON.parse(identities);
            let ns = nd.session();
            ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where id(n) in [${identities.join(',')}] return ${data.table.download.map(key => 'n.' + key).join(',')}`).then(({records}) => {
                ns.close();
                fs.mkdir('download_cache', 0o777, () => {
                    try {
                        XLSX.writeFile({
                            SheetNames: ['default'],
                            Sheets: {
                                default: XLSX.utils.json_to_sheet(records.map(record => record._fields.reduce((o, v, i) => Object.assign(o, {
                                    [dictionary[data.table.download[i]]]: v
                                }), {})), {
                                    header: data.table.download.map(key => dictionary[key])
                                })
                            }
                        }, 'download_cache\\分类.xlsx');
                        res.send(JSON.stringify({
                            success: true,
                            file: 'download_cache/分类.xlsx'
                        }));
                    } catch (e) {
                        res.send(JSON.stringify({
                            success: false,
                            message: e.toString()
                        }));
                    }
                });
            });
        })
        .post(/system\/update$/i, (req, res) => {
            child_process.exec('git checkout -- .', () => {
                child_process.exec("git pull", (error, stdout, stderr) => {
                    if (error) {
                        res.send(JSON.stringify({
                            success: false,
                            message: 'A' + error.toString()
                        }));
                    } else if (stderr.length) {
                        res.send(JSON.stringify({
                            success: true,
                            message: '系统已更新，请重新启动服务和界面。'
                        }));
                    } else {
                        if (/.*Already\sup\sto\sdate\..*/i) res.send(JSON.stringify({
                            success: false,
                            message: '系统已经是最新版本。'
                        }));
                        else res.send(JSON.stringify({
                            success: true,
                            message: '系统已更新，请重新启动服务和界面。'
                        }));
                    }
                });
            });
        })
        .listen(3530, () => {
            console.log('BSCHA listening on port 3530...');
        });
});