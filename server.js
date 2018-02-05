(do {
    'use strict';

    const express = require('express'),
        bodyParser = require('body-parser'),
        neo4j = require('neo4j-driver').v1,
        child_process = require('child_process');
    require('./extend');

    let nd = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha')),
        path = (l => l.slice(0, l.length - 1).join('\\'))(require('path').dirname(require.main.filename).split(/[\\\/]/));

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
                    {key: 'name', output: String.name, input: ['input', {type: 'text'}], order: true},
                    {key: 'data', output: [String.name, {long: true}], input: 'textarea'},
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
                    {key: 'name', output: String.name, input: ['input', {type: 'text'}], order: true},
                    {key: 'data', output: [String.name, {long: true}], input: 'textarea'},
                    {key: 'classification', output: String.name, default: '未知', special: {name: '执行', post: 'classify'}, order: true},
                    {key: 'update_dt', output: Date.name, order: true},
                    {key: 'create_dt', output: Date.name, order: true}
                ]
            }
        }
    };

    const classification_description = {
        true: '人类',
        false: '动物'
    };

    express()
        .use(express.static('.'))
        .use(bodyParser.json())
        .use(bodyParser.urlencoded({
            extended: true
        }))
        .get(/^.*$/, (req, res) => {
            res.send(require('fs').readFileSync('client.html', 'utf8'));
        })
        .post(/query\/dictionary$/i, (req, res) => {
            res.send(JSON.stringify({
                species: '物种',
                training: '训练集',
                applying: '测试集',
                name: '名称',
                description: '描述',
                data: '数据',
                classification: '分类',
                create_dt: '创建时间',
                update_dt: '修改时间'
            }));
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
            if (identities.length) {
                let ns = nd.session(),
                    t = 0;
                for (let id of identities) {
                    let mission = () => ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[r:implement]->(n) where id(n)=${id} delete r,n`).then(() => {
                        if (++t == identities.length) {
                            ns.close();
                            res.send(null);
                        }
                    });
                    if (data.table.referred && data.table.referred.length) {
                        let u = 0;
                        for (let service of data.table.referred) {
                            ns.run(`match (:root{name:'BSCHA'})${service.route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[r:implement]->(n) where n.${service.key}='${id}' delete r,n`).then(() => {
                                if (++u == data.table.referred.length) mission();
                            });
                        }
                    } else mission();
                }
            }
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
            let {route} = req.body,
                data = route.reduce((a, b) => a[b], router);
            if (data.table) {
                let ns = nd.session(),
                    rule = data.table.head.find((rule) => rule.key === req.body.key),
                    mission = () => {
                        ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where id(n)=${req.body.identity} set n.${req.body.key}=${JSON.stringify(req.body.value)},n.update_dt=${Math.floor(Date.now() / 1000)}`).then(() => {
                            ns.close();
                            res.send(JSON.stringify({
                                success: true
                            }));
                        });
                    };
                if (rule.primary) ns.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where n.${req.body.key}='${req.body.value}' return n`).then(({records}) => {
                    if (records.length) {
                        ns.close();
                        if (records[0]._fields[0].identity.low == req.body.identity) res.send(JSON.stringify({
                            success: true
                        }));
                        else res.send(JSON.stringify({
                            success: false,
                            message: `创建失败：${req.body.key} 为 ${req.body.value} 的记录已存在`
                        }));
                    } else mission();
                });
                else mission();
            }
        })
        .post(/special\/classify$/i, (req, res) => {
            let {identities} = req.body;
            child_process.exec(`python classify.py "${JSON.stringify(identities)}"`, (error, stdout, stderr) => {
                try {
                    console.log(stdout);
                    let data = JSON.parse(stdout);
                    promise(resolve => {
                        if (data.success && data.result.length) {
                            let ns = nd.session();
                            Promise.all(data.result.map((item, index) => promise(resolve => {
                                ns.run(`match (n) where id(n)=${identities[index]} set n.classification=${classification_description[item]}`).then(() => resolve())
                            }))).then(() => {
                                ns.close();
                                resolve();
                            });
                        } else resolve();
                    }).then(() => res.send(data));
                } catch (e) {
                    if (error) res.send(JSON.stringify({
                        success: false,
                        message: error
                    }));
                    else if (stderr.length) res.send(JSON.stringify({
                        success: false,
                        message: stderr
                    }));
                }
            });
        })
        .listen(3530, () => {
            console.log('BSCHA listening on port 3530...');
        });
});