(f => {
    'use strict';

    try {
        f(window);
    } catch (e) {
    }
    try {
        f(global);
    } catch (e) {
    }
})((global) => {
    'use strict';

    global.promise = (...args) => new Promise(...args);

    Promise.every = callbacks => new Promise(resolve => {
        let results = [],
            iterate = i => {
                if (i < callbacks.length) {
                    promise(callbacks[i]).then(rtn => {
                        results.push(rtn);
                        iterate(i + 1);
                    });
                } else resolve(results);
            };
        iterate(0);
    });
    Promise.some = callbacks => new Promise((resolve, reject) => {
        let iterate = i => {
            if (i < callbacks.length - 1) promise(callbacks[i]).then(resolve).catch(() => iterate(i + 1));
            else if (i < callbacks.length) promise(callbacks[i]).then(resolve).catch(reject);
        };
        iterate(0);
    });
});