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
        } else Promise.all([
            promise(resolve => {
                console.log("启动数据库……");
                child_process.spawn('neo4j-community-3.3.2\\bin\\neo4j.bat', ['console']).stdout.on('data', data => {
                    data = data.toString();
                    if (/.*Remote\sinterface\savailable\sat.*/.test(data)) {
                        console.log("数据库已启动；");
                        resolve();
                    }
                });
            }),
            promise(resolve => {
                console.log("启动服务器……");
                child_process.spawn('nnode.bat', ['server.js']).stdout.on('data', data => {
                    data = data.toString();
                    if (/.*listening\son\sport.*/.test(data)) {
                        console.log("服务器已启动；");
                        resolve();
                    }
                });
            })
        ]).then(() => {
            console.log("服务已启动，欢迎使用血液分类系统，请在浏览器打开：http://localhost:3530。");
        });
    });

})();