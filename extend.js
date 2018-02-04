(() => {
    'use strict';

    this.promise = (...args) => new Promise(...args);
    Promise.every = function (callbacks) {
        return new Promise((resolve) => {
            let results = [],
                iterate = i => {
                    if (i < callbacks.length) {
                        (new Promise(callbacks[i])).then(rtn => {
                            results.push(rtn);
                            iterate(i + 1);
                        });
                    } else resolve(results);
                };
            iterate(0);
        });
    };
})();