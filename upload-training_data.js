(() => {
    'use strict';
    console.log('-----------------\n');

    let package_path = process.argv[2],
        fs = require('fs'),
        neo4j = require('neo4j-driver').v1,
        nd = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha')),
        ns = nd.session(),
        current_dt = Math.floor(Date.now() / 1000),
        species_queue = [],
        sample_queue = [],
        t = 0;



    // let mission = () => {
    //     let mission = () => {
    //         ns.close();
    //         nd.close();
    //         console.log('\n-----------------');
    //         console.log('执行完毕，请按任意键退出。');
    //     };
    //     if (sample_queue.length) {
    //         let t = 0;
    //         sample_queue.forEach(item => item(() => {
    //             if (++t === sample_queue.length) mission();
    //         }));
    //     } else mission();
    // };
    // if (species_queue.length) {
    //     let t = 0;
    //     species_queue.forEach(item => item(() => {
    //         if (++t === species_queue.length) mission();
    //     }));
    // } else mission();

    if (fs.statSync(package_path).isDirectory()) {
        let package_dir = (ls => ls[ls.length - 1])(package_path.trim().split(/[\/\\]/));
        console.log(`进入包路径 ${package_path}：`);

        let data_pattern, ns = nd.session();
        ns.run(`match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'training'}) return n.patterns`).then(({records}) => {
            ns.close();
            data_pattern = RegExp(JSON.parse(records[0]._fields[0].replace(/\\/g, '\\\\')).data);

            fs.readdirSync(package_path).forEach(species_dir => {
                let species_path = package_path + '\\' + species_dir;
                if (fs.statSync(species_path).isDirectory) {
                    console.log(`进入物种路径 ${species_dir}：`);

                    let ns = nd.session();
                    ns.run(`match (:root{name:'BSCHA'})-[:specialize]->(:class{name:'species'})-[:implement]->(n:instance{name:'${species_dir}'}) return id(n)`).then(({records}) => {
                        ns.close();
                        let species_id, mission = () => {
                            fs.readdirSync(species_path).forEach(sample_file => {
                                let sample_path = species_path + '\\' + sample_file;
                                if (fs.statSync(sample_path).isFile && /^.*\.txt$/.test(sample_file)) {
                                    t++;
                                    console.log(`提取样本 ${sample_file}：`);
                                    let data = fs.readFileSync(sample_path, 'utf-8').replace(/\r?\n/g, '\\n');

                                    if (data_pattern.test(data)) {
                                        let ns = nd.session();
                                        let cql = `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'training'}) create (n)-[:implement]->(:instance{species:'${species_id}',name:'${sample_file}',data:'${data}',create_dt:${current_dt},update_dt:${current_dt}})`,
                                            then = () => {
                                                ns.close();
                                                console.log('提取完毕');
                                                if (!--t) {
                                                    console.log('\n-----------------');
                                                    console.log('执行完毕，请按任意键退出。');
                                                }
                                            };
                                        ns.run(cql).then(then).catch(() => ns.run(cql).then(then));
                                    } else console.log(`样本文件 ${sample_file} 格式不符合规范，请修改文件或规范`);
                                } else console.log(`样本路径 ${sample_file} 不是文本文件，已忽略！`);
                            });
                        };
                        if (records[0]) {
                            species_id = records[0]._fields[0].low;
                            mission();
                        } else {
                            let ns = nd.session();
                            ns.run(`match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'species'}) create (n)-[:implement]->(n1:instance{name:'${species_dir}',description:'',create_dt:${current_dt},update_dt:${current_dt}}) return id(n1)`).then(({records}) => {
                                ns.close();
                                species_id = records[0]._fields[0].low;
                                mission();
                            });
                        }
                    });
                } else console.log(`物种路径 ${package_dir} 路径不是目录，已忽略！`);
            });
        });
    } else console.log(`包路径 ${package_dir} 不是目录，已忽略！`);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
})();

