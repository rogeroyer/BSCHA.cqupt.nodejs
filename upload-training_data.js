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
        rl.question('请输入或拖拽训练数据包：', package_path => {
            rl.close();
            let package_dir = (ls => ls[ls.length - 1])(package_path.trim().split(/[\/\\]/));
            if (fs.statSync(package_path).isDirectory()) {
                let nd = neo4j.driver('bolt://localhost', neo4j.auth.basic('bscha', 'bscha')),
                    ns = nd.session(),
                    count = 0;
                promise(resolve => Promise.all([
                    promise(resolve => ns.run(
                        `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'species'}) return n.patterns`
                    ).then(({records}) => resolve(records[0]._fields[0]))),
                    promise(resolve => ns.run(
                        `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'training'}) return n.patterns`
                    ).then(({records}) => resolve(records[0]._fields[0])))
                ]).then(patterns_list => {
                    let [species_patterns, training_patterns] = patterns_list.map(patterns => {
                        patterns = JSON.parse(patterns.replace(/\\/g, '\\\\'));
                        Object.keys(patterns).forEach(k => patterns[k] = RegExp(`^${patterns[k]}$`));
                        return patterns;
                    });

                    let tree = [];
                    console.log("开始校验……");
                    let pack = fs.readdirSync(package_path).map(species_dir => [species_dir, package_path + '\\' + species_dir]).filter(([species_dir, species_path]) => fs.statSync(species_path).isDirectory()),
                        invalid = pack.find(([species_dir,]) => !species_patterns.name.test(species_dir));
                    if (invalid === undefined) {
                        for (let [species_dir, species_path] of pack) {
                            tree.push({name: species_dir});
                            let species = fs.readdirSync(species_path).map(sample_file => [sample_file, species_path + '\\' + sample_file]).filter(([sample_file, sample_path]) => (fs.statSync(sample_path).isFile() && /.*\.txt/.test(sample_file))).map(([sample_file, sample_path]) => [sample_file.replace(/^(.+)\.txt$/, '$1'), sample_path]),
                                invalid = species.find(([sample_file,]) => !training_patterns.name.test(sample_file));
                            if (invalid === undefined) {
                                species = species.map(([sample_file, sample_path]) => [sample_file, sample_path, fs.readFileSync(sample_path, 'utf-8')]);
                                let invalid = species.find(([, , sample_data]) => !training_patterns.data.test(sample_data));
                                if (invalid === undefined) {
                                    tree[tree.length - 1].samples = species.map(([name, , data]) => ({name, data}));
                                } else {
                                    console.error(`样本 ${species_dir}\\${invalid[0]} 的数据不符合规范！`);
                                    return resolve();
                                }
                            } else {
                                console.error(`样本 ${species_dir}\\${invalid[0]} 的名称不符合规范！`);
                                return resolve();
                            }
                        }
                    } else {
                        console.error(`物种 ${invalid[0]} 的名称不符合规范！`);
                        return resolve();
                    }

                    Promise.every(tree.map(species => resolve => {
                        let check = name => {
                            ns.run(
                                `match (:root{name:'BSCHA'})-[:specialize]->(:class{name:'species'})-[:implement]->(n:instance{name:'${name}'}) return id(n)`
                            ).then(({records}) => {
                                if (records[0]) resolve(Object.assign(species, {id: records[0]._fields[0].low}));
                                else {
                                    let rl = readline.createInterface({
                                        input: process.stdin,
                                        output: process.stdout
                                    });
                                    /*let choose = () => rl.question(`物种 ${name} 不存在！请输入[1:修改物种名称，2:创建该物种]：`, answer => {
                                        switch (answer) {
                                            case '1':
                                                let readName = () => rl.question('请输入物种名: ', answer => {
                                                    if (species_patterns.name.test(answer)) {
                                                        rl.close();
                                                        check(answer);
                                                    } else {
                                                        console.warn(`物种名 ${answer} 不符合规范！`);
                                                        readName();
                                                    }
                                                });
                                                readName();
                                                break;
                                            case '2':
                                                rl.close();
                                                let dt = Math.floor(Date.now() / 1000);
                                                ns.run(
                                                    `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'species'}) create (n)-[:implement]->(n1:instance{name:'${name}',description:'',create_dt:${dt},update_dt:${dt}}) return id(n1)`
                                                ).then(({records}) => resolve(Object.assign(species, {id: records[0]._fields[0].low})));
                                                break;
                                            default:
                                                console.warn('错误的输入！');
                                                choose();
                                        }
                                    });*/
                                    let choose = () => rl.question(`物种 ${name} 不存在！请选择[1:人类，2:动物]：`, answer => {
                                        rl.close();
                                        switch (answer) {
                                            case '1':
                                            case '2':
                                                check({'1': '人类', '2': '动物'}[answer]);
                                                break;
                                            default:
                                                console.warn('错误的输入！');
                                                choose();
                                        }
                                    });
                                    choose();
                                }
                            })
                        };
                        check(species.name);
                    })).then(tree => {
                        console.log('校验完毕，开始录入……');
                        Promise.all(tree.map(species => promise(resolve => {
                            let dt = Math.floor(Date.now() / 1000);
                            Promise.all(species.samples.map(sample => promise(resolve => {
                                count++;
                                ns.run(
                                    `match (:root{name:'BSCHA'})-[:specialize]->(n:class{name:'training'}) create (n)-[:implement]->(:instance{species:'${species.id}',name:'${sample.name}',data:'${sample.data}',create_dt:${dt},update_dt:${dt}})`
                                ).then(() => resolve());
                            }))).then(() => resolve());
                        }))).then(() => resolve());
                    });
                })).then(() => {
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
