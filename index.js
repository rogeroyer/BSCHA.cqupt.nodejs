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
            child_process.spawn('chrome.exe', ['http://localhost:3530']);
        } else Promise.all([
            promise(resolve => {
                console.log("启动数据库……");
                let database = child_process.spawn('neo4j-community-3.3.2\\bin\\neo4j.bat', ['console'])
                database.stdout.on('data', data => {
                    data = data.toString();
                    if (/.*Remote\sinterface\savailable\sat.*/.test(data)) {
                        console.log("数据库已启动；");
                        resolve();
                    }
                });
            }),
            promise(resolve => {
                console.log("启动服务器……");
                let server = child_process.spawn('nnode.bat', ['server.js']);
                server.stdout.on('data', data => {
                    data = data.toString();
                    if (/.*listening\son\sport.*/.test(data)) {
                        console.log("服务器已启动；");
                        resolve();
                    }
                });
            })
        ]).then(() => {
            child_process.spawn('chrome.exe', ['http://localhost:3530']).on('close', () => {
                child_process.exec('taskkill /f /t /im node.exe');
                child_process.exec('taskkill /f /t /im java.exe');
            });
            console.log("欢迎使用血液分类系统，请不要关闭本窗口。");
        });
    });

})();