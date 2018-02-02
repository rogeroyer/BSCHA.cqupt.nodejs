(() => {
	'use strict';
	console.log('-----------------\n');

	let I = '//',
		package_path = process.argv[2],
		fs = require('fs'),
		neo4j = require('neo4j-driver').v1,
		nd = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha')),
		current_dt = Math.floor(Date.now() / 1000),
		t = 0;

	if (fs.statSync(package_path).isDirectory()) {
		let package_dir = (ls => ls[ls.length - 1])(package_path.trim().split(/[\/\\]/));
		console.log(package_path);
		fs.readdirSync(package_path).forEach(species_dir => {
			let species_path = package_path + I + species_dir;
			if (fs.statSync(species_path).isDirectory) {
				console.log(`进入物种路径 ${species_dir}：`);

				let ns = nd.session();
				ns.run(`match (:root{name:'BSCHA'})-[:specialize]->(:class{name:'species'})-[:implement]->(n:instance{name:'${species_dir}'}) return id(n)`).then(({records}) => {
					let species_id, mission = () => {
						fs.readdirSync(species_path).forEach(sample_file => {
							let sample_path = species_path + I + sample_file;
							if (fs.statSync(sample_path).isFile) {
								t++;
								console.log(`提取样本 ${sample_file}：`);
								let data = fs.readFileSync(sample_path, 'utf-8').replace(/\r?\n/g, '\\n');
								ns.run(`match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'training'}) create (n)-[:implement]->(:instance{species:'${species_id}',data:'${data}',create_dt:${current_dt},update_dt:${current_dt}})`).then(() => {
									ns.close();
									console.log('提取完毕');
									if(!--t){
										console.log('\n-----------------');
										console.log('执行完毕，请按任意键退出。');
									}
								});

							} else console.log(`样本路径 ${sample_file} 不是文件！`);
						});
					};
					if (records[0]) {
						species_id = records[0]._fields[0].low;
						mission();
					} else ns.run(`match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'species'}) create (n)-[:implement]->(n1:instance{name:'${species_dir}',description:'',create_dt:${current_dt},update_dt:${current_dt}}) return id(n1)`).then(({records}) => {
						species_id = records[0]._fields[0].low;
						mission();
					});
				});
			} else console.log(`物种路径 ${package_dir} 路径不是目录！`);
		});
	} else console.log(`包路径 ${package_dir} 不是目录！`);

	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on('data', process.exit.bind(process, 0));
})();

