/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
function Datatype(value) {
    switch (typeof value) {
        case 'string':
            if (value.includes("::")) {
                return value;
            } else {
                return "String::" + value;
            }
            break;
        case 'number':
            return "int::" + value;
        case 'boolean':
            return "boolean::" + value;
        case 'null':
            return "null";
        default:
            return "json::" + JSON.stringify(value);
    }
}

function handlefile(xhr) {
    var filename = "";
    var disposition = xhr.getResponseHeader('Content-Disposition');
    if (disposition && disposition.indexOf('attachment') !== -1) {
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        var matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1])
            filename = matches[1].replace(/['"]/g, '');
    }
    var file = window.URL.createObjectURL(xhr.response);
    var a = document.createElement("a");
    a.href = file;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
}

function erlog(val, dd) {
    var data = JSON.parse(dd);
    data.run = val;
    if (data.ErrorMsg) {
        showError(data.ErrorMsg);
    }
}

function JSframwork(name, callback) {
    this.filename = name;
    var that = this;
    this.methodsreadback = function (data) {
        for (var i = 0; i < data.Methods.length; i++) {
            var blobdata = data.Methods[i].endsWith("_File");
            if (data.Methods[i].startsWith("Multi_")) {
                var methodname = data.Methods[i].replace("Multi_", "");
                if (blobdata)
                    methodname = methodname.replace("_File", "");
                that[methodname] = new Function("\
                    var oldcallback = arguments[arguments.length-1];\
                    var fun = (typeof oldcallback === 'function');\
                    var datagg = arguments[0];\
                    var data = new FormData();\
                    for ( var key in datagg ) {\
                        data.append(key, datagg[key]['$file']?datagg[key]['$file']:datagg[key]);\
                    }\
                    data.append('run','" + methodname + "');\
                    var callback = function (respdata){\
                        if (typeof(respdata.response)=='object') {\
                            handlefile(respdata);\
                            oldcallback(true);\
                        }else{\
                            if(respdata.responseText.length<2) return oldcallback();\
                            var obj = JSON.parse(respdata.responseText);\
                            erlog('" + methodname + "',respdata.responseText);\
                            oldcallback(obj.Return);\
                        }\
                    };\
                    var requset = new XMLHttpRequest();\
                    " + (blobdata ? "requset.responseType='blob';" : "") + "\
                    requset.onreadystatechange = function () {\
                        if (requset.status == 200 && requset.readyState == 4) {\
                            if(fun){\
                                callback(requset);\
                            }\
                        }\
                    };\
                    requset.open('POST','" + that.filename + "', true);\
                    requset.send(data);\
                ");
            } else if (data.Methods[i].startsWith("Sync_")) {
                var methodname = data.Methods[i].replace("Sync_", "");
                if (blobdata)
                    methodname = methodname.replace("_File", "");
                that[methodname] = new Function("\
                    var paras = '';\
                    for (var i = 0; i < arguments.length; i++){\
                       paras += '&para[]='+Datatype(arguments[i]);\
                    }\
                    var data = 'run=" + methodname + "'+paras;\
                    var requset = new XMLHttpRequest();\
                    " + (blobdata ? "requset.responseType='blob';" : "") + "\
                    requset.open('POST','" + that.filename + "', false);\
                    requset.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');\
                    requset.send(data);\
                    if (typeof(requset.response)=='object') {\
                        handlefile(requset);\
                        return true;\
                    }else{\
                        erlog('" + methodname + "',requset.responseText);\
                        return JSON.parse(requset.responseText).Return;\
                    }\
                ");
            } else {
                var methodname = data.Methods[i];
                if (blobdata)
                    methodname = methodname.replace("_File", "");
                that[methodname] = new Function("\
                    var paras = '';\
                    var oldcallback = arguments[arguments.length-1];\
                    var fun = (typeof oldcallback === 'function');\
                    var callback = function (respdata){\
                        if (typeof(respdata.response)=='object') {\
                            handlefile(respdata);\
                            oldcallback(true);\
                        }else{\
                            if(respdata.responseText.length<2) return oldcallback();\
                            var obj = JSON.parse(respdata.responseText);\
                            erlog('" + methodname + "',respdata.responseText);\
                            oldcallback(obj.Return);\
                        }\
                    };\
                    if(fun){\
                        for (var i = 0; i < arguments.length-1; i++){\
                            paras += '&para[]='+Datatype(arguments[i]);\
                        }\
                    }else{\
                        for (var i = 0; i < arguments.length; i++){\
                            paras += '&para[]='+Datatype(arguments[i]);\
                        }\
                    }\
                    var data = 'run=" + methodname + "'+paras;\
                    var requset = new XMLHttpRequest();\
                    " + (blobdata ? "requset.responseType='blob';" : "") + "\
                    requset.onreadystatechange = function () {\
                        if (requset.status == 200 && requset.readyState == 4) {\
                            if(fun){\
                                callback(requset);\
                            }\
                        }\
                    };\
                    requset.open('POST','" + that.filename + "', true);\
                    requset.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');\
                    requset.send(data);\
                ");
            }
        }
        if (callback) {
            callback(that);
        }
    };
    this.getMethods = function () {
        var requset = new XMLHttpRequest();
        requset.onreadystatechange = function () {
            if (requset.status == 200 && requset.readyState == 4) {
                var gg = requset.responseText;
                that.methodsreadback(JSON.parse(gg));
            }
        };
        requset.open("GET", this.filename, false);
        requset.send();
    };
    this.getMethods();
}