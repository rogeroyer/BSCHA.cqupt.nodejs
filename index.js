(() => {
    'use strict';

    const child_process = require('child_process');
    require('./extend');

    Promise.all([
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
        let client = child_process.spawn('chrome.exe', ['http://localhost:3530']);
        client.on('close', () => {
            Promise.all([
                promise(resolve => {
                    console.log('关闭服务器……');
                    child_process.exec('taskkill /f /t /im node.exe', () => {
                        console.log('服务器已关闭；');
                        resolve()
                    });
                }),
                promise(resolve => {
                    console.log('关闭数据库……');
                    child_process.exec('taskkill /f /t /im java.exe', () => {
                        console.log('数据库已关闭；');
                        resolve()
                    });
                })
            ]).then(() => {
                console.log("系统已关闭。谢谢使用，再见！");
            });
        });
        console.log("欢迎使用血液分类系统，请不要关闭本窗口；若要关闭系统，请在客户端进行操作，谢谢！");
    });
})();