(do {
	'use strict';

	const express = require('express'),
		bodyParser = require('body-parser'),
		neo4j = require('neo4j-driver').v1,
		neo4j_driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha'));

	let router = {
		services: [
			'species',
			'training',
			'applying'
		],
		species: {
			services: [],
			rule: {
				head: [
					{key: 'name', type: String.name},
					{key: 'description', type: String.name},
					{key: 'create_dt', type: Date.name}
				],
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
	}).listen(3530, () => {
		console.log('BSCHA listening on port 3530!');
	});
});