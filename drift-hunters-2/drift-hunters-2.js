(function() {
    const dataParts = [
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part0",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part1",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part2",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part3",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part4",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part5",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part6",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part7",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part8",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part9",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part10",
        "Build/DriftHunters_V156_Low_BR.data.unityweb.part11",
    ];


    function updateProgress(current, total) {
        const percent = Math.floor((current / total) * 100);
        document.getElementById("progress").style.width = percent + "%";
    }


    async function loadDataParts(parts) {
        let buffers = [];
        let cnt= 1;
        for (let url of parts) {
            console.log("Loading part:", url);
            let res = await fetch(url);
            let buf = await res.arrayBuffer();
            buffers.push(buf);
            updateProgress(cnt++, parts.length);
        }
        // ghép buffer
        let totalLength = buffers.reduce((s, b) => s + b.byteLength, 0);
        let merged = new Uint8Array(totalLength);
        let offset = 0;
        for (let b of buffers) {
            merged.set(new Uint8Array(b), offset);
            offset += b.byteLength;
        }
        setTimeout(() => {
            document.getElementById("progress-container").style.display = "none";
        }, 500);
        return merged.buffer;
    }

    const OriginalXHR = window.XMLHttpRequest;

    function PatchedXHR() {
        const xhr = new OriginalXHR();

        let targetUrl = null;
        let isDataFile = false;

        const open = xhr.open;
        xhr.open = function(method, url, async, user, pass) {
        targetUrl = url;
        isDataFile = url.endsWith(".data.unityweb");
        return open.apply(xhr, arguments);
        };

        const send = xhr.send;
        xhr.send = function(body) {
            if (isDataFile) {
                console.log("Intercept XHR for Unity data:", targetUrl);
                loadDataParts(dataParts).then(buffer => {
                // giả lập response
                Object.defineProperty(xhr, "response", { value: buffer });
                Object.defineProperty(xhr, "responseText", { value: "" });
                Object.defineProperty(xhr, "readyState", { value: 4 });
                Object.defineProperty(xhr, "status", { value: 200 });
                // gọi callback onload
                if (xhr.onload) xhr.onload();
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                });
            } else {
                return send.apply(xhr, arguments);
            }
        };
        return xhr;
    }

    window.XMLHttpRequest = PatchedXHR;

    // Patch loader fetch
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.endsWith(".data.unityweb")) {
            // load part and Response
            return loadDataParts(dataParts).then(buffer => {
                return new Response(buffer, {
                    headers: { "Content-Type": "application/octet-stream" }
                });
            });
        }
        return originalFetch(url, options);
    };
})();
