(do {
	'use strict';

	const express = require('express'),
		bodyParser = require('body-parser'),
		neo4j = require('neo4j-driver').v1,
		neo4j_driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha'));

	let path = (l => l.slice(0, l.length - 1).join('\\'))(require('path').dirname(require.main.filename).split(/[\\\/]/));

	const router = {
		services: ['species', 'training', 'applying'],
		species: {
			services: [],
			table: {
				referred: [
					{route: ['training'], key: 'species'}
				],
				head: [
					{key: 'name', primary: true, output: String.name, input: ['input', {type: 'text'}]},
					{key: 'description', output: String.name, input: ['input', {type: 'text'}]},
					{key: 'update_dt', output: Date.name},
					{key: 'create_dt', output: Date.name}
				]
			}
		},
		training: {
			services: [],
			table: {
				special: 'train',
				head: [
					{key: 'species', output: 'refer', input: ['refer', {route: ['species'], key: 'name'}]},
					{key: 'data', output: [String.name, {long: true}], input: 'textarea'},
					{key: 'update_dt', output: Date.name},
					{key: 'create_dt', output: Date.name}
				],
				upload: true
			}
		},
		applying: {
			services: [],
			table: {
				special: 'classify',
				head: [
					{key: 'data', output: [String.name, {long: true}], input: 'textarea'},
					{key: 'species', output: String.name},
					{key: 'update_dt', output: Date.name},
					{key: 'create_dt', output: Date.name}
				]
			}
		}
	};

	express()
	/*.use(require('express-fileupload')())*/
		.use(express.static('.'))
		.use(bodyParser.json())
		.use(bodyParser.urlencoded({
			extended: false
		}))
		.get(/^.*$/, (req, res) => {
			res.send(require('fs').readFileSync('client.html', 'utf8'));
		})
		.post(/query\/dictionary$/i, (req, res) => {
			res.send(JSON.stringify({
				species: '物种',
				training: '训练',
				applying: '应用',
				name: '名称',
				description: '描述',
				data: '数据',
				create_dt: '创建时间',
				update_dt: '修改时间'
			}));
		})
		.post(/query$/i, (req, res) => {
			let {route, identity = null} = req.body;
			route = JSON.parse(route);
			let data = route.reduce((a, b) => a[b], router);
			if (data.table) {
				let session = neo4j_driver.session();
				session.run(`match (:root{name:'BSCHA'})${route.slice(0, route.length - 1).map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:specialize]->(n:class{name:'${route[route.length - 1]}'}) return n`).then(({records: [service]}) => {
					session.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) ${identity ? `where id(n)=${identity}` : ''} return n`).then(({records}) => {
						session.close();
						data.table.service = service._fields[0];
						data.table.records = records.map(record => record._fields[0]);
						res.send(JSON.stringify(data));
					});
				});
			} else res.send(JSON.stringify(data));
		})
		.post(/create$/i, (req, res) => {
			let route = JSON.parse(req.body.route),
				data = route.reduce((a, b) => a[b], router),
				properties = JSON.parse(req.body.properties);
			if (data.table) {
				let session = neo4j_driver.session(),
					checks = [], errors = [], t = 0,
					mission = () => {
						let current_dt = Math.floor(Date.now() / 1000);
						session.run(`match (:root{name:'BSCHA'})${route.slice(0, route.length - 1).map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:specialize]->(n:class{name:'${route[route.length - 1]}'}) create (n)-[:implement]->(:instance${JSON.stringify(Object.assign(properties, {
							create_dt: current_dt,
							update_dt: current_dt
						})).replace(/\"([^\"]+)\"\:/g, '$1:')})`).then(() => {
							session.close();
							res.send(JSON.stringify({
								success: true
							}));
						});
					};
				data.table.head.forEach(prop_rule => {
					if ((prop_rule.key in properties) && prop_rule.primary) checks.push(() => {
						session.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where n.${prop_rule.key}='${properties[prop_rule.key]}' return n`).then(({records}) => {
							if (records.length) errors.push(`${prop_rule.key} 为 ${properties[prop_rule.key]} 的记录已存在`);
							if (++t === checks.length) {
								if (errors.length) {
									session.close();
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
			let route = JSON.parse(req.body.route),
				data = route.reduce((a, b) => a[b], router),
				ids = JSON.parse(req.body.identities);
			if (ids.length) {
				let session = neo4j_driver.session(),
					t = 0;
				for (let id of ids) {
					let mission = () => session.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[r:implement]->(n) where id(n)=${id} delete r,n`).then(() => {
						if (++t == ids.length) {
							session.close();
							res.send(null);
						}
					});
					if (data.table.referred && data.table.referred.length) {
						let u = 0;
						for (let service of data.table.referred) {
							session.run(`match (:root{name:'BSCHA'})${service.route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[r:implement]->(n) where n.${service.key}='${id}' delete r,n`).then(() => {
								if (++u == data.table.referred.length) mission();
							});
						}
					} else mission();
				}
			}
		})
		.post(/modify\/pattern$/i, (req, res) => {
			let session = neo4j_driver.session();
			session.run(`match (n) where id(n)=${req.body.identity} return n`).then(({records: [service]}) => {
				let patterns = Object.assign(JSON.parse(service._fields[0].properties.patterns.replace(/\\/g, '\\\\')), {
					[req.body.key]: req.body.value
				});
				session.run(`match (n) where id(n)=${req.body.identity} set n.patterns='${JSON.stringify(patterns)}'`).then(() => {
					session.close();
					res.send(null);
				});
			});
		})
		.post(/modify$/i, (req, res) => {
			let route = JSON.parse(req.body.route),
				data = route.reduce((a, b) => a[b], router);
			if (data.table) {
				let session = neo4j_driver.session(),
					rule = data.table.head.find((rule) => rule.key === req.body.key),
					mission = () => {
						session.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where id(n)=${req.body.identity} set n.${req.body.key}=${JSON.stringify(req.body.value)},n.update_dt=${Math.floor(Date.now() / 1000)}`).then(() => {
							session.close();
							res.send(JSON.stringify({
								success: true
							}));
						});
					};
				if (rule.primary) session.run(`match (:root{name:'BSCHA'})${route.map(service => `-[:specialize]->(:class{name:'${service}'})`).join('')}-[:implement]->(n) where n.${req.body.key}='${req.body.value}' return n`).then(({records}) => {
					if (records.length) {
						session.close();
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
		.post(/special\/train/i, (req, res) => {
			console.log(path);
			res.send(JSON.stringify({
				success: false,
				message: '算法尚未对接'
			}));
		})
		.post(/special\/classify$/i, (req, res) => {
			res.send(JSON.stringify({
				success: false,
				message: '算法尚未对接'
			}));
		})
		.listen(3530, () => {
			console.log('BSCHA listening on port 3530...');
		});
});