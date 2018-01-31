(do {
	'use strict';

	const express = require('express'),
		neo4j = require('neo4j-driver').v1,
		neo4j_driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha'));

	express().use(express.static('.')).get(/^.*$/, (req, res) => {
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
	}).post(/query\/service$/i, (req, res) => {
		res.send(JSON.stringify([
			'species',
			'training',
			'applying'
		]));
	}).post(/service\/query\/species$/i, (req, res) => {
		let session = neo4j_driver.session();
		session.run('match (:BSCHA)-[]->(species:Species) return species').then(({records}) => {
			session.close();
			res.send(JSON.stringify({
				head: [
					{key: 'name', type: String.name},
					{key: 'description', type: String.name},
					{key: 'create_dt', type: Date.name}
				],
				records: records.map(record => record._fields[0])
			}));
		})
	}).listen(3000, () => {
		console.log('BSCHA listening on port 3000!');
	});
});