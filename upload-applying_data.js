(() => {
    'use strict';
    const fs = require('fs'),
        neo4j = require('neo4j-driver').v1,
        readline = require('readline');
    require('./extend');

    console.log('-----------------\n');
    promise(resolve => {
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('请输入或拖拽测试数据包：', package_path => {
            rl.close();
            let package_dir = (ls => ls[ls.length - 1])(package_path.trim().split(/[\/\\]/));
            if (fs.statSync(package_path).isDirectory()) {
                let nd = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha')),
                    ns = nd.session(),
                    count = 0;
                promise(resolve => {
                    promise(resolve => ns.run(
                        `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'training'}) return n.patterns`
                    ).then(({records}) => resolve(records[0]._fields[0]))).then(patterns => {
                        patterns = JSON.parse(patterns.replace(/\\/g, '\\\\'));
                        Object.keys(patterns).forEach(k => patterns[k] = RegExp(`^${patterns[k]}$`));

                        let tree = [];

                        console.log("开始校验……");
                        let pack = fs.readdirSync(package_path).map(sample_file => [sample_file, package_path + '\\' + sample_file]).filter(([sample_file, sample_path]) => (fs.statSync(sample_path).isFile() && /.*\.txt/.test(sample_file))).map(([sample_file, sample_path]) => [sample_file.replace(/^(.+)\.txt$/, '$1'), sample_path]),
                            invalid = pack.find(([sample_file,]) => !patterns.name.test(sample_file));
                        if (invalid === undefined) {
                            pack = pack.map(([sample_file, sample_path]) => [sample_file, sample_path, fs.readFileSync(sample_path, 'utf-8')]);
                            let invalid = pack.find(([, , sample_data]) => !patterns.data.test(sample_data));
                            if (invalid === undefined) {
                                tree = pack.map(([name, , data]) => ({name, data}));
                            } else {
                                console.error(`样本 ${package_dir}\\${invalid[0]} 的数据不符合规范！`);
                                return resolve();
                            }
                        } else {
                            console.error(`样本 ${invalid[0]} 的名称不符合规范！`);
                            return resolve();
                        }

                        console.log('校验完毕，开始录入……');
                        let dt = Math.floor(Date.now() / 1000);
                        Promise.all(tree.map(sample => promise(resolve => {
                            count++;
                            ns.run(
                                `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'applying'}) create (n)-[:implement]->(:instance{name:'${sample.name}',data:'${sample.data}',classification_probability:null,classification:'未知',create_dt:${dt},update_dt:${dt}})`
                            ).then(() => resolve());
                        }))).then(() => resolve());
                    });
                }).then(() => {
                    console.log(`录入完毕，共录入${count}个样本。`);
                    ns.close();
                    nd.close();
                    return resolve();
                });
            } else {
                console.error(`包对象 ${package_dir} 不是目录，已忽略！`);
                return resolve();
            }
        });
    }).then(() => {
        console.log('\n-----------------');
        console.log('请关闭本窗口。');
    });
})();
