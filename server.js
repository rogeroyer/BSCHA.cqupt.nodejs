(do {
	'use strict';

	const express = require('express'),
		bodyParser = require('body-parser'),
		neo4j = require('neo4j-driver').v1,
		neo4j_driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha'));

	const router = {
		services: [
			'species',
			'training',
			'applying'
		],
		species: {
			services: [],
			rule: {
				primary_key: 'name',
				head: [
					{key: 'name', type: String.name, edit: ['input', {type: 'text', pattern: '^[\\w\\d_]+$'}]},
					{key: 'description', type: String.name, edit: ['input', {type: 'text', pattern: '^.*$'}]},
					{key: 'create_dt', type: Date.name},
					{key: 'update_dt', type: Date.name, hide: true}
				],
				delete: true,
				create: true
			}
		},
		training: {services: []},
		applying: {services: []}
	};

	express().use(express.static('.')).use(bodyParser.json()).use(bodyParser.urlencoded({
		extended: false
	})).get(/^.*$/, (req, res) => {
		res.send(require('fs').readFileSync('client.html', 'utf8'));
	}).post(/query\/dictionary$/i, (req, res) => {
		res.send(JSON.stringify({
			species: '物种',
			training: '训练',
			applying: '应用',
			name: '名称',
			description: '描述',
			create_dt: '创建时间',
			update_dt: '修改时间'
		}));
	}).post(/query$/i, (req, res) => {
		let route = JSON.parse(req.body.route),
			data = route.reduce((a, b) => a[b], router);
		if (data.rule) {
			let session = neo4j_driver.session();
			session.run(`match (:BSCHA)${route.map(service => `-[:static]->(:${service})`).join('')}-[:dynamic]->(n) return n`).then(({records}) => {
				session.close();
				data.rule.records = records.map(record => record._fields[0]);
				res.send(JSON.stringify(data));
			});
		} else res.send(JSON.stringify(data));
	}).post(/create$/i, (req, res) => {
		let route = JSON.parse(req.body.route),
			data = route.reduce((a, b) => a[b], router),
			props = JSON.parse(req.body.props);
		if (data.rule) {
			let session = neo4j_driver.session();
			session.run(`match (:BSCHA)${route.map(service => `-[:static]->(:${service})`).join('')}-[:dynamic]->(n) where n.${data.rule.primary_key}='${props[data.rule.primary_key]}' return n`).then(({records}) => {
				if (records.length) {
					session.close();
					res.send(JSON.stringify({
						success: false,
						message: `创建失败：${data.rule.primary_key} 为 ${props[data.rule.primary_key]} 的记录已存在`
					}));
				} else {
					let current_dt = Math.floor(Date.now() / 1000);
					session.run(`match (:BSCHA)${route.slice(0, route.length - 1).map(service => `-[:static]->(:${service})`).join('')}-[:static]->(n:${route[route.length - 1]}) create (n)-[:dynamic]->(:instance${JSON.stringify(Object.assign(props, {
						create_dt: current_dt,
						update_dt: current_dt
					})).replace(/\"([^\"]+)\"\:/g, '$1:')})`).then(() => {
						session.close();
						res.send(JSON.stringify({
							success: true
						}));
					});
				}
			});
		}
	}).listen(3530, () => {
		console.log('BSCHA listening on port 3530...');
	});
});