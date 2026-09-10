/**
 * @projectDescription	Standard Data Exchange (SDX) subsystem's core message router.
 * @inherits 	i2b2
 * @namespace	i2b2
 * @author		Nick Benik, Griffin Weber MD PhD
 * @version 	1.3
 **/

i2b2.hive.communicatorFactory = function(cellCode){

    try {
        var cellURL = i2b2[cellCode].cfg.cellURL;
    } catch (e) {}

    if (!cellURL) console.warn("communicatorFactory: '"+cellCode+"' does not have a cellURL specified");

    let pendingAsyncRequestCount = 0;
    function i2b2Base_communicator(){}
    var retCommObj = new i2b2Base_communicator;
    retCommObj.ParentCell = cellCode;
    retCommObj.globalParams = {}; //TODO: remove this => new Hash;
    retCommObj.cellParams = {}; //TODO: remove this => new Hash;
    retCommObj._commData = {};

    retCommObj._addFunctionCall = function(name, url_string, xmlmsg, escapeless_params, parseFunc){
        var protectedNames = ["ParentCell", "globalParams", "cellParams", "_commMsgs", "_addFunctionCall", "_doSendMsg", "_defaultCallbackOK", "_defaultCallbackFAIL"];
        if (protectedNames.indexOf(name) !== -1) {
            console.error("Attempt to build communicator call [" + name + "] failed because it is a protected name");
            return false;
        }
        if (!Array.isArray(escapeless_params)) { escapeless_params = []; }
        escapeless_params.push("proxy_info");
        escapeless_params.push("sec_pass_node");
        this._commData[name] = {
            msg: xmlmsg,
            url: url_string,
            dont_escape_params: escapeless_params
        };
        // create a named redirector function on the main communicator object
        this[name] = new Function("return this._doSendMsg.call(this, '"+name+"', arguments[0], arguments[1], arguments[2], arguments[3]);");
        // save the passed parse() function

        if (parseFunc) {
            // - the parse() function will be passed the communicator packet and is expected to return the reference to the communicator packet.
            // - the parse() function is responsible for creating and populating the "model" namespace withing the communicator packet.
            this._commData[name].parser = parseFunc;
        }

        let msg = {
            channelName: this.ParentCell,
            channelActions: Object.keys(this._commData)
        };
        i2b2.hive.msgSniffer.registerMessageSource(msg);
    };


    retCommObj._doSendMsg = function(funcName, originName, parameters, callback, transportOptions){
        let snifferPackage = {
            cell: this.ParentCell,
            function: funcName,
            requester: originName
        };
        if (!this._commData[funcName]) {
            console.error("Requested function does not exist [" +this.ParentCell+"->"+funcName+"] called by "+originName);
            return false;
        }
        var commOptions = {
            contentType: 'text/xml',
            method: 'post',
            asynchronous: true,
            evalJS: false,
            evalJSON: false
        };

        var execBubble = {
            self: this,
            reqOrigin: originName,
            cellName: this.ParentCell,
            funcName: funcName,
            callback: callback,
            params: parameters
        };
        // mix in our transport options from the originator call
        Object.assign(commOptions, transportOptions);
        // if no callback is set then we want to make this interaction synchronous
        if (!callback) { commOptions.asynchronous = false; }
        // collect message values
        var sMsgValues = {};
        Object.assign(sMsgValues, parameters);
        // proxy server data
        sMsgValues.proxy_info = '';
        if (commOptions.url !== undefined) {
            var sUrl = commOptions.url;
        } else {
            var sUrl = i2b2[this.ParentCell].cfg.cellURL;
        }
        sUrl = i2b2.h.Escape(sUrl);
        sUrl = this._commData[funcName].url.replace("{{{URL}}}",sUrl);
        execBubble.funcURL = sUrl;
        var sProxy_Url = i2b2.h.getProxy();
        if (sProxy_Url) {
            sMsgValues.proxy_info = '<proxy>\n            <redirect_url>' + sUrl + '</redirect_url>\n        </proxy>\n';
        } else {
            sProxy_Url = sUrl;
        }
        execBubble.proxyURL = sProxy_Url;
        snifferPackage.urlService = sUrl;
        snifferPackage.urlProxy = sProxy_Url;

        // PM + security info
        if (commOptions.user !== undefined) {
            sMsgValues.sec_user = commOptions.user;
        } else {
            sMsgValues.sec_user = i2b2.h.getUser();
        }
        if (commOptions.password !== undefined) {
            sMsgValues.sec_pass_node = commOptions.password;
        } else {
            sMsgValues.sec_pass_node = i2b2.h.getPass();
        }
        if (commOptions.password !== undefined) {
            sMsgValues.sec_domain = commOptions.domain;
        } else {
            sMsgValues.sec_domain = i2b2.h.getDomain();
        }
        if (commOptions.project !== undefined) {
            sMsgValues.sec_project = commOptions.project;
        }  else if (sMsgValues.sec_project === undefined) {
            sMsgValues.sec_project = i2b2.h.getProject();
        }
        if (commOptions.msg_id !== undefined) {
            sMsgValues.header_msg_id = commOptions.msg_id;
        } else {
            sMsgValues.header_msg_id = i2b2.h.GenerateAlphaNumId(20);
        }
        if (commOptions.msg_datetime !== undefined) {
            sMsgValues.header_msg_datetime = commOptions.msg_datetime;
        } else {
            sMsgValues.header_msg_datetime = luxon.DateTime.now().toISO({includeOffset: true});
        }

        if (parameters == undefined) { parameters = {}; }
        if (commOptions.result_wait_time !== undefined || parameters.result_wait_time !== undefined) {
            if (commOptions.result_wait_time !== undefined) { sMsgValues.result_wait_time = commOptions.result_wait_time; }
            if (parameters.result_wait_time !== undefined) { sMsgValues.result_wait_time = parameters.result_wait_time; }
        } else {
            sMsgValues.result_wait_time = 180;  // default to 180 second timeout within the cell if a specific timeout period was not passed
        }

        // apply message values to message template
        i2b2.h.EscapeTemplateVars(sMsgValues, this._commData[funcName].dont_escape_params);
        execBubble.params = sMsgValues;
        var sMessage = this._commData[funcName].msg;
        for (var tag in sMsgValues) {
            sMessage = sMessage.replace(new RegExp("{{{"+tag+"}}}", 'g'), sMsgValues[tag]);
        }
        // create a version that removes the password and session token from the msg
        let sMessageNoPWD = new String(sMessage);
        let posStart = sMessageNoPWD.indexOf("<password");
        posStart = sMessageNoPWD.indexOf(">",posStart) + 1;
        posEnd = sMessageNoPWD.indexOf("</password>", posStart);
        sMessageNoPWD = sMessageNoPWD.substring(0,posStart) + "*****" + sMessageNoPWD.substring(posEnd);
        execBubble.msgSent = sMessageNoPWD;
        snifferPackage.msgSent = {
            msg: sMessageNoPWD,
            when: new Date()
        }

        var verify = i2b2.h.parseXml(sMessage);
        var verify_status = verify.getElementsByTagName('proxy')[0];
        if (!verify_status) {
            sMessage = sMessage.replace(/\&amp;/g,'&');
            sMessage = sMessage.replace(/\&/g, '\&amp;');
        }
        //escape & from password:
        let sMessageEscapPWD = String(sMessage);
        let posStartPwd = sMessageEscapPWD.indexOf("<password");
        posStartPwd = sMessageEscapPWD.indexOf(">",posStartPwd) + 1;
        let posEndPwd = sMessageEscapPWD.indexOf("</password>", posStartPwd);
        let pswd = sMessageEscapPWD.substring(posStartPwd, posEndPwd);
        pswd = pswd.replace(/\&/g, '\&amp;');
        sMessageEscapPWD = sMessageEscapPWD.substring(0,posStartPwd) + pswd + sMessageEscapPWD.substring(posEndPwd);

        commOptions.postBody = sMessageEscapPWD;
        //if (commOptions.asynchronous) {
            commOptions.onSuccess = this._defaultCallbackOK;
            commOptions.onFailure = this._defaultCallbackFAIL;
        //}
        var removeKeys = [
            "asynchronous",
            "contentType",
            "encoding",
            "method",
            "parameters",
            "postBody",
            "requestHeaders",
            "evalJS",
            "evalJSON",
            "sanitizeJSON",
            "onCreate",
            "onComplete",
            "onException",
            "onFailure",
            "onInteractive",
            "onLoaded",
            "onLoading",
            "onSuccess",
            "onUninitialized"
        ];
        var tmp = Object.keys(commOptions);
        tmp = tmp.filter(function(v) { return (removeKeys.indexOf(v) === -1) });
        execBubble.timeSent = new Date();
        commOptions.i2b2_execBubble = execBubble;

        var myCallback = {
                  success: function(o, status, xhr) {
                      pendingAsyncRequestCount = pendingAsyncRequestCount-1;
                      if(pendingAsyncRequestCount > 1){
                          $("body").addClass("pendingRequest");
                      }else{
                          $("body").removeClass("pendingRequest");
                      }
                      // Message logging for debug purposes
                      const responseText = xhr.responseText !== undefined ? String(xhr.responseText) : String(o.responseText);

                      snifferPackage.status = xhr.status;
                      snifferPackage.msgRecv = {
                          when: new Date(),
                          msg: responseText,
                          hasErrors: i2b2.h.checkXmlResponseForErrors(responseText, true)
                      }

                      if (i2b2.hive.msgSniffer) i2b2.hive.msgSniffer.add(snifferPackage);
                      i2b2.hive.errorMsgDisplay.show(snifferPackage);

                      if (typeof o !== "object") {
                          /* error handler code */
                          let retObj = {
                              request: {
                                  options: {
                                      i2b2_execBubble: commOptions.i2b2_execBubble
                                  }
                              },
                              responseText: o
                          };
                          retCommObj._defaultCallbackFAIL(retObj);
                      } else {
                          /* success handler code */
                          o.request = {};
                          o.request.options = {};
                          o.request.options.i2b2_execBubble = commOptions.i2b2_execBubble;
                          retCommObj._defaultCallbackOK(o);
                      }
                  },
                  failure: function(o, status, xhr) {
                      pendingAsyncRequestCount = pendingAsyncRequestCount-1;
                      if(pendingAsyncRequestCount > 1){
                          $("body").addClass("pendingRequest");
                      }else{
                          $("body").removeClass("pendingRequest");
                      }
                      // Message logging for debug purposes
                      const responseText = xhr.responseText !== undefined ? String(xhr.responseText) : String(o.responseText);

                      snifferPackage.status = xhr.status;
                      snifferPackage.msgRecv = {
                          when: new Date(),
                          msg: responseText,
                          hasErrors: i2b2.h.checkXmlResponseForErrors(responseText, true)
                      }
                      if (i2b2.hive.msgSniffer) i2b2.hive.msgSniffer.add(snifferPackage);
                      i2b2.hive.errorMsgDisplay.show(snifferPackage);

                      /* failure handler code */
                      o.request = {};
                      o.request.options = {};
                      o.request.options.i2b2_execBubble = commOptions.i2b2_execBubble;
                      retCommObj._defaultCallbackFAIL(o);
                  }
        };

        if (commOptions.asynchronous) {
            pendingAsyncRequestCount= pendingAsyncRequestCount+1;
            if(pendingAsyncRequestCount > 1){
                $("body").addClass("pendingRequest");
            }else{
                $("body").removeClass("pendingRequest");
            }
            // perform an ASYNC query
            $.ajax({
                type: "POST",
                url: sProxy_Url,
                data: commOptions.postBody})
                .done(myCallback.success)
                .fail(myCallback.failure);
        } else {
            // perform a SYNC query
            $.ajax({
                type: "POST",
                url: sProxy_Url,
                async: false,
                data: commOptions.postBody})
                .done(myCallback.success)
                .fail(myCallback.failure);
        }
        return true;
    };



    retCommObj._defaultCallbackOK = function(transport){
        var execBubble = transport.request.options.i2b2_execBubble;
        execBubble.timeRecv = new Date();
        var origCallback = execBubble.callback;

       // update timeout
        i2b2.PM.model.IdleTimer.resetTimeout();

        // debug messages
        console.info("[AJAX SUCCESS] i2b2." + execBubble.cellName + ".ajax." + execBubble.funcName);

        // create our data message to send to the callback function
        var cbMsg = {
            msgParams: execBubble.params,
            msgRequest: execBubble.msgSent,
            msgResponse: transport.documentElement.outerHTML,
            timeStart: execBubble.timeSent,
            timeEnd: execBubble.timeRecv,
            msgUrl: execBubble.funcURL,
            proxyUrl: execBubble.proxyURL,
            error: false
        };
        // check the status from the message
        var xmlRecv = transport; // jQuery returns a full XMLDocument
        if (!xmlRecv) {
            cbMsg.error = true;
            cbMsg.errorStatus = transport.status;
            cbMsg.errorMsg = "The cell's message could not be interpreted as valid XML.";
            console.error(transport.responseText);
        }
        else {
            cbMsg.refXML = xmlRecv;
            var result_status = xmlRecv.getElementsByTagName('result_status');
            if (!result_status[0]) {
                var has_error = true;
            } else {
                var s = xmlRecv.getElementsByTagName('status')[0];
            }
            if (has_error || s.getAttribute('type') != 'DONE') {
                cbMsg.error = true;
                cbMsg.errorStatus = transport.status;
                cbMsg.errorMsg = "The cell's status message could not be understood.";
                console.error(transport.responseText);
            }
        }
        // attach the parse() function
        if (cbMsg.error || !execBubble.self._commData[execBubble.funcName]) {
            cbMsg.parse = function(){
                this.model = false;
                return this;
            }
        }
        else {
            cbMsg.parse = execBubble.self._commData[execBubble.funcName].parser;
        }

        // return results to caller
        if (origCallback !== undefined )
        if (i2b2.h.getObjectClass(origCallback)=='i2b2_scopedCallback') {
            origCallback.callback.call(origCallback.scope, cbMsg);
        } else {
            origCallback(cbMsg);
        }
    };



    retCommObj._defaultCallbackFAIL = function(transport) {
        var execBubble = transport.request.options.i2b2_execBubble;
        execBubble.timeRecv = new Date();
        var origCallback = execBubble.callback;

        console.error("[AJAX FAILURE] i2b2." + execBubble.cellName + ".ajax." + execBubble.funcName);

        // create our data message to send to the callback fuction
        var cbMsg = {
            msgParams: execBubble.params,
            msgRequest: execBubble.msgSent,
            msgResponse: transport.responseText,
            timeStart: execBubble.timeSent,
            timeEnd: execBubble.timeRecv,
            msgUrl: execBubble.funcURL,
            proxyUrl: execBubble.proxyURL,
            error: true
        };

        // return results to caller
        if (origCallback !== undefined)
        if (i2b2.h.getObjectClass(origCallback)=='i2b2_scopedCallback') {
            origCallback.callback.call(origCallback.scope, cbMsg);
        } else {
            origCallback(cbMsg);
        }
    };

    return retCommObj;
};