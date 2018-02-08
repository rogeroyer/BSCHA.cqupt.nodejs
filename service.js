(() => {
    'use strict';

    const child_process = require('child_process');
    require('./extend');

    Promise.all([
        promise(resolve => child_process.exec('tasklist|findstr java.exe', (error, stdout, stderr) => resolve(stdout.length))),
        promise(resolve => child_process.exec('tasklist|findstr node.exe', (error, stdout, stderr) => resolve(stdout.length)))
    ]).then(([database, server]) => {
        if (database && server) {
            console.log('服务正在运行');
        } else Promise.every([
            resolve => {
                let sp = child_process.spawn('npm.cmd', ['install']);
                sp.stdout.on('data', data => console.log(data.toString()));
                sp.on('close', resolve)
            },
            resolve => child_process.spawn('neo4j-community-3.3.2\\bin\\neo4j.bat', ['console']).stdout.on('data', data => {
                data = data.toString();
                console.log(data);
                if (/.*Remote\sinterface\savailable\sat.*/.test(data)) resolve();
            }),
            resolve => child_process.spawn('nnode.bat', ['server.js']).stdout.on('data', data => {
                data = data.toString();
                console.log(data);
                if (/.*listening\son\sport.*/.test(data)) resolve();
            })
        ]).then(() => {
            console.log("服务已启动，欢迎使用血液分类系统，请在浏览器打开：http://localhost:3530。");
        });
    });

})();