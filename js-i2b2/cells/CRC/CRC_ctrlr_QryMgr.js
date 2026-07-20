/**
 * @projectDescription	The Asynchronous Query Status controller (GUI-only controller).
 * @inherits 	i2b2.CRC.ctrlr
 * @namespace	i2b2.CRC.ctrlr.QueryMgr
 * @author		Nick Benik
 * @version 	1.8
 * ----------------------------------------------------------------------------------------
 */

i2b2.CRC.ctrlr.QueryMgr = {};
// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.tick = function() {
    // this function is the main status update routine that occurs during running of a query
    const secPollInterval = 1;

    // stop running this function
    if (i2b2.CRC.model.runner.finished && i2b2.CRC.model.runner.intervalTimer !== undefined && !i2b2.CRC.model.runner.deleteCurrentQuery) {
        clearInterval(i2b2.CRC.model.runner.intervalTimer);
        delete i2b2.CRC.model.runner.intervalTimer;
    }

    // update the run duration string
    i2b2.CRC.model.runner.elapsedTime = ((new Date() - i2b2.CRC.model.runner.startTime) / 1000).toFixed(1);

    // see if the query is done running
    let stillRunning = false;
    let statusBar = {error:0, running:0, finished: 0};
    if (i2b2.CRC.model.runner.progress) {
        for (let status in i2b2.CRC.model.runner.progress) {
            switch(status) {
                case "INCOMPLETE":
                case "ERROR":
                case "TIMEOUT":
                    statusBar.error += i2b2.CRC.model.runner.progress[status];
                    break;
                case "COMPLETED":
                case "PROCESSING":
                case "FINISHED":
                    statusBar.finished += i2b2.CRC.model.runner.progress[status];
                    break;
                case "WAITTOPROCESS":
                case "QUEUED":
                default:
                    statusBar.running += i2b2.CRC.model.runner.progress[status];
                    break;
            }
            if (!["FINISHED", "COMPLETED", "ERROR"].includes(status)) stillRunning = true;
        }
        // convert the statusBar to percentages
        const totalCnt = statusBar.finished + statusBar.running + statusBar.error;
        statusBar.finished = (statusBar.finished / totalCnt) * 100;
        statusBar.running = (statusBar.running / totalCnt) * 100;
        statusBar.error = (statusBar.error / totalCnt) * 100;
        if (statusBar.finished < 5) statusBar.finished = 5;
    } else {
        stillRunning = true;
    }
    i2b2.CRC.model.runner.progressBar = statusBar;

    // see if wee need to run another poll to get the progress from the server
    if (stillRunning
        && (((new Date()) - i2b2.CRC.model.runner.lastPoll) / 1000) > secPollInterval
        && i2b2.CRC.model.runner.idQueryInstance !== undefined
        && !i2b2.CRC.model.runner.isPolling
        && !i2b2.CRC.model.runner.deleteCurrentQuery
    ) {
        i2b2.CRC.model.runner.lastPoll = new Date();
        i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryInstanceId("CRC:QueryRunner:polling", {qi_key_value: i2b2.CRC.model.runner.idQueryInstance}, i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryStatus);
    }
    if (!stillRunning || (i2b2.CRC.model.runner.finished && (!i2b2.CRC.model.runner.deleteCurrentQuery || (i2b2.CRC.model.runner.deleteCurrentQuery && i2b2.CRC.model.runner.idQueryMaster !== undefined)))) i2b2.CRC.ctrlr.QueryMgr._eventFinishedAll();

    // update the progress display
    i2b2.CRC.view.QueryMgr.updateStatus();
}


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.generateQueryName = function() {
    // generate the initial name for the current query
    i2b2.CRC.ctrlr.QueryMgr._processModel();
    const transformedModel = i2b2.CRC.model.transformedQuery;
    if (transformedModel.panels.length > 0 || transformedModel.subQueries.length > 0) {
        let queryDate = new Date();
        queryDate = String(queryDate.getHours()) + ":" + String(queryDate.getMinutes()) + ":" + String(queryDate.getSeconds());
        let temporalRegex = /^\(t\)/i;

        let names = transformedModel.panels.map((rec)=>{ return rec.items[0].name.replace("(PrevQuery)","").trim().replace("(t)","").trim()});

        // Handle temporal events
        let temporalNames = transformedModel.subQueries.map((subQuery)=>{ return subQuery.panels[0].items[0].name.replace("(PrevQuery)","")
            .trim().replace(temporalRegex,"").trim()});
        names = names.concat(temporalNames);

        let adjuster = 1 / ((names.map((rec) => rec.length ).reduce((acc, val) => acc + val) + names.length - 1) / 120);
        if (adjuster > 1) adjuster = 1;
        names = names.map((rec) => rec.substr(0, Math.floor(rec.length * adjuster)));
        return i2b2.h.Unescape(names.join("-") + "@" + queryDate);
    } else {
        return "";
    }
};


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.startQuery = function(queryName, queryResultTypes, queryExecutionMethod, emailAndMessage) {
    // clear any old results
    i2b2.CRC.model.runner.isLoading = true;
    i2b2.CRC.view.QueryMgr.clearStatus();
    i2b2.CRC.model.runner.isLoading = false;

    if (i2b2.CRC.model.runner.intervalTimer) clearInterval(i2b2.CRC.model.runner.intervalTimer);

    i2b2.CRC.ctrlr.QueryMgr._processModel();
    i2b2.CRC.model.transformedQuery.name = queryName; // i2b2.h.Escape(queryName);
    i2b2.CRC.model.transformedQuery.email = emailAndMessage.email;
    i2b2.CRC.model.transformedQuery.message = emailAndMessage.message;

    let params = {
        result_wait_time: i2b2.CRC.view.QT.params.queryTimeout,
        psm_query_definition: "",
        psm_result_output: "",
        shrine_topic: ""
    };

    // query outputs
    params.psm_result_output = "<result_output_list>";
    queryResultTypes.forEach((rec, idx) => {
        params.psm_result_output += '<result_output priority_index="' + (idx + 1) + '" name="' + rec.toLowerCase() + '"/>';
    });
    params.psm_result_output += "</result_output_list>";

    // query execution method
    if (queryExecutionMethod) {
        params.query_run_method = "<query_method>" + queryExecutionMethod + "</query_method>";
    } else {
        params.query_run_method = "";
    }
    // query definition XML
    params.psm_query_definition = (Handlebars.compile("{{> Query}}"))(i2b2.CRC.model.transformedQuery);

    // start run status Timer
    i2b2.CRC.model.runner = {
        name: queryName,
        definition: params.psm_query_definition,
        elapsedTime: "0",
        startTime: new Date(),
        status: "Running",
        intervalTimer: null,
        lastPoll: new Date(),
        abortable: true,
        finished: false,
        deleteCurrentQuery: false,
        queued: false,
        isPolling: true,
        isRunning: true,
        isLoading: false,
        isCancelled: false,
        hasError: false,
        isShrine: false,
        intervalGraphRefresh: false
    };

    delete i2b2.CRC.model.runner.progress;
    i2b2.CRC.model.runner.intervalTimer = setInterval(i2b2.CRC.ctrlr.QueryMgr.tick, 100);

    // show run status HTML
    i2b2.CRC.view.QueryMgr.updateStatus(); // we need to pass the query runner status over first!
    let queryInstanceId = i2b2.CRC.model.runner.idQueryInstance;
    //TODO: set a specific value for query instance id in order to catch the error later
    //until the error with sending an undefined query instance id is addressed
    if(!queryInstanceId){
        queryInstanceId = "QUERY_INSTANCE_ID_UNKNOWN";
    }
    i2b2.CRC.QueryStatus.start(queryInstanceId, $(".CRC_QS_view")[0]);//

    // run query and get back the query master ID
    i2b2.CRC.ajax.runQueryInstance_fromQueryDefinition("CRC:QueryManager", params, i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryMaster);

    // refresh the query history window since we are running a new query
    setTimeout(i2b2.CRC.view.history.doRefreshAll, 500);
};


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.loadQuery = function(idQueryMaster, queryName) {
    if (i2b2.CRC.model.runner.intervalTimer !== undefined) {
        clearInterval(i2b2.CRC.model.runner.intervalTimer);
        delete i2b2.CRC.model.runner.intervalTimer;
    }
    i2b2.CRC.model.runner.name = queryName;
    i2b2.CRC.model.runner.abortable = false;
    i2b2.CRC.model.runner.finished = true;
    i2b2.CRC.model.runner.isLoading = true;
    i2b2.CRC.model.runner.isRunning = false;
    i2b2.CRC.model.runner.isPolling = false;
    i2b2.CRC.model.runner.isCancelled = false;
    i2b2.CRC.model.runner.deleteCurrentQuery = false;
    i2b2.CRC.model.runner.hasError = false;
    i2b2.CRC.model.runner.queued = false;
    delete i2b2.CRC.model.runner.progress;


    let cb = new i2b2_scopedCallback();
    cb.scope = this;
    cb.callback = function(results) {
        // TODO: Error checking!!!
        let qi_id = results.refXML.getElementsByTagName('query_instance_id')[0].textContent;
        try {
            let datestart = Date.parse(results.refXML.getElementsByTagName('start_date')[0].textContent);
            let dateend = Date.parse(results.refXML.getElementsByTagName('end_date')[0].textContent);
            i2b2.CRC.model.runner.startTime = new Date(datestart);
            i2b2.CRC.model.runner.endTime = new Date(dateend);
        } catch(e) {
            i2b2.CRC.model.runner.startTime = 0;
            i2b2.CRC.model.runner.endTime = 0;
        }
        i2b2.CRC.model.runner.elapsedTime = ((i2b2.CRC.model.runner.endTime - i2b2.CRC.model.runner.startTime) / 1000).toFixed(1);

        cb_hack = new i2b2_scopedCallback();
        cb_hack.scope = results;
        cb_hack.callback = i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryMaster.callback;
        i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryInstanceId("CRC:QueryMgr:loadQuery",{qi_key_value: qi_id}, cb_hack);
    };
    i2b2.CRC.ajax.getQueryInstanceList_fromQueryMasterId("CRC:QueryMgr:loadQuery", {qm_key_value: idQueryMaster}, cb);

    // make sure that the Query Status window is visible
    i2b2.layout.selectTab('i2b2.CRC.view.QueryMgr');
};


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.cancelQuery = function() {
    // Aborts a running query
    i2b2.CRC.model.runner.deleteCurrentQuery = true;
    i2b2.CRC.ctrlr.QueryMgr.stopQuery();
    i2b2.CRC.model.runner.queued = false;

    // stop the Query Status subsystem from polling
    i2b2.CRC.QueryStatus.stopPolling();

    // update the screen to show status as cancelled
    $("#infoQueryStatusText .statusButtons").removeClass("running").addClass("cancelled");
}

// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.stopQuery = function() {
    if (i2b2.CRC.model.runner.isLoading) return;
    // Stops a running query
    i2b2.CRC.model.runner.isRunning = false;
    i2b2.CRC.model.runner.isLoading = false;
    i2b2.CRC.model.runner.isCancelled = true;
    i2b2.CRC.model.runner.finished = true;
    i2b2.CRC.model.runner.queued = true;

    // stop the Query Status subsystem from polling
    i2b2.CRC.QueryStatus.stopPolling();

    if (i2b2.CRC.model.runner.intervalTimer !== undefined) {
        clearInterval(i2b2.CRC.model.runner.intervalTimer);
        delete i2b2.CRC.model.runner.intervalTimer;
    }
};


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr.clearQuery = function() {
    // reset Query History view to default listing
    i2b2.CRC.view.search.reset();
    $("#i2b2TreeviewQueryHistoryFinder").hide();
    $("#i2b2TreeviewQueryHistory").show();

    // clear the query in the query tool
    i2b2.CRC.ctrlr.QT.clearQuery();

    // clear the display window
    i2b2.CRC.view.QueryMgr.clearStatus();
};


// 1st callback in query execution (submit query XML and get query master ID)
// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryMaster = new i2b2_scopedCallback();
i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryMaster.scope = this;
i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryMaster.callback = function(results) {

    if (i2b2.CRC.model.runner.finished && !i2b2.CRC.model.runner.isRunning && !i2b2.CRC.model.runner.isLoading && !i2b2.CRC.model.runner.deleteCurrentQuery) return false;

    i2b2.CRC.model.QueryResults = results;
    i2b2.CRC.model.runner.hasError = false;

    // see if error
    if (results.error) {
        i2b2.CRC.model.runner.status = "ERROR";
        i2b2.CRC.model.runner.abortable = false;
        i2b2.CRC.model.runner.finished = true;
        alert(results.errorMsg);
        return;
    }

    // get the query instance id
    let qiID = false;

    // try loading the query instance elements from the server results
    let qiList = results.refXML.getElementsByTagName('query_instance');

    // if the query instance info is not in the returned results then this callback was called by loading a previously
    // run query. Since the messages from the i2b2 server differ between a 1st time run and loading a previously run
    // query we use a hack in which the query_instance list from the 1st call to the server is loaded into the "this"
    // scope variable.  If this is the case then load the query_instance data from there.
    if (qiList.length === 0) qiList = this.refXML.getElementsByTagName('query_instance');

    // at this point we should have a list of query instances ready for processing
    if (qiList.length > 0) {
        qiID = i2b2.h.XPath(qiList[0], 'descendant-or-self::query_instance_id')[0].firstChild.nodeValue;
        i2b2.CRC.model.runner.idQueryMaster = i2b2.h.XPath(qiList[0], 'descendant-or-self::query_master_id')[0].firstChild.nodeValue;
        i2b2.CRC.model.runner.idQueryInstance = qiID;

        //check if query name changed
        let queryName = results.refXML.getElementsByTagName('query_master')[0];
        queryName = i2b2.h.XPath(queryName, 'descendant-or-self::name');
        if(queryName.length !==0 && queryName[0].firstChild.nodeValue !==  i2b2.CRC.model.runner.name){
            //query name changed so refresh the name in query history
            i2b2.CRC.model.runner.name = queryName[0].firstChild.nodeValue;

            let qmNode = i2b2.CRC.view.history.treeview.treeview("getNodes", (snode)=> (snode.i2b2.origData.id === i2b2.CRC.model.runner.idQueryMaster));
            if(qmNode.length > 0){
                qmNode[0].text =  i2b2.CRC.model.runner.name;
                i2b2.CRC.view.history.treeview.treeview('redraw', []);
            }
        }

        let idQRI = {};
        let stats = {};
        let qriList = results.refXML.getElementsByTagName('query_result_instance');
        // process all query result instances
        for (let qri of qriList) {
            let rec = {};
            rec.id = i2b2.h.XPath(qri, 'descendant-or-self::result_instance_id')[0].firstChild.nodeValue;
            rec.desc = i2b2.h.XPath(qri, 'descendant-or-self::query_result_type/description')[0].firstChild.nodeValue;
            rec.status = i2b2.h.XPath(qri, 'descendant-or-self::query_status_type/name')[0].firstChild.nodeValue;
            rec.type = i2b2.h.XPath(qri, 'descendant-or-self::query_result_type/name')[0].firstChild.nodeValue;
            if (rec.type.indexOf('_SHRINE_') > -1) i2b2.CRC.model.runner.isShrine = true;
            idQRI[rec.id] = rec;

            // check for errors
            if (rec.status === "ERROR") i2b2.CRC.model.runner.hasError = true;

            // update counter
            if (stats[rec.status] === undefined) stats[rec.status] = 0;
            stats[rec.status]++;

            // get the patient count
            try {
                let pCount = parseInt(i2b2.h.XPath(qriList[0], 'descendant-or-self::set_size')[0].firstChild.nodeValue);
                if (i2b2.PM.model.isObfuscated) {
                    if (i2b2.UI.cfg.useFloorThreshold && pCount < i2b2.UI.cfg.floorThresholdNumber) {
                        pCount = i2b2.UI.cfg.floorThresholdText + i2b2.UI.cfg.floorThresholdNumber;
                    } else {
                        pCount = i2b2.CRC.QueryStatus.formatObfuscation(pCount, i2b2.UI.cfg.obfuscatedDisplayNumber);
                    }
                }
                i2b2.CRC.model.runner.patientCount = pCount
            } catch(e) {}
        }
        i2b2.CRC.model.runner.queryResultInstances = idQRI;
        i2b2.CRC.model.runner.progress = stats;

        // see if all processing is done
        if (Object.keys(stats).length === 1 && (stats["FINISHED"] || stats["ERROR"])) {
            i2b2.CRC.ctrlr.QueryMgr._eventFinishedAll();
        } else {
            i2b2.CRC.model.runner.lastPoll = new Date();
            i2b2.CRC.model.runner.isPolling = false;
            i2b2.CRC.model.runner.queued = true;
        }

        // Start the query status panel (but only if real-time polling is enabled)!
        if (!i2b2.CRC.model.runner.isCancelled && i2b2.CRC.QueryStatus.realtimePolling) i2b2.CRC.QueryStatus.start(i2b2.CRC.model.runner.idQueryInstance, $(".CRC_QS_view")[0]);
    }
};


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr._eventFinishedAll = function() {
    // don't show status if query has been cancelled
    let showStatus = true;

    if (i2b2.CRC.model.runner.deleteCurrentQuery) showStatus = false;

    i2b2.CRC.model.runner.status = "Finished";
    i2b2.CRC.model.runner.abortable = false;
    i2b2.CRC.model.runner.finished = true;
    i2b2.CRC.model.runner.isPolling = false;
    i2b2.CRC.model.runner.queued = false;
    i2b2.CRC.model.runner.isRunning = false;
    i2b2.CRC.model.runner.isLoading = false;
    if (i2b2.CRC.model.runner.endTime === undefined) i2b2.CRC.model.runner.endTime = new Date();

    // stop the run timer
    if (i2b2.CRC.model.runner.intervalTimer !== undefined) {
        clearInterval(i2b2.CRC.model.runner.intervalTimer);
        delete i2b2.CRC.model.runner.intervalTimer;
    }

    // deleted the query if it was requested
    if (i2b2.CRC.model.runner.deleteCurrentQuery) {
        // delete the query master
        let qmId = i2b2.CRC.model.runner?.idQueryMaster;
        // query history window is refreshed by this call
        i2b2.CRC.ctrlr.history.queryDeleteNoPrompt(qmId);
    } else {
        // render the results tables/graphs (but only if we have a proper QI reference)
        if (typeof i2b2.CRC.model.runner.idQueryInstance === 'undefined') {
            showStatus = false;
        } else {
            // this is the location that QueryStatus will be updated if real-time polling is turned off
            i2b2.CRC.QueryStatus.start(i2b2.CRC.model.runner.idQueryInstance, $(".CRC_QS_view")[0]);
        }
    }

    // re-render status
    if (showStatus) i2b2.CRC.view.QueryMgr.updateStatus();
};


// subsequent polling callback in query execution (submit query instance ID and get results instance status)
// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryStatus = new i2b2_scopedCallback();
i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryStatus.scope = this;
i2b2.CRC.ctrlr.QueryMgr._callbackGetQueryStatus.callback = function(results) {
    // see if error
    if (results.error) {
        i2b2.CRC.model.runner.status = "ERROR";
        i2b2.CRC.model.runner.abortable = false;
        i2b2.CRC.model.runner.finished = true;
        i2b2.CRC.model.runner.hasError = true;
        alert(results.errorMsg);
        return;
    }

    let idQRI = {};
    let stats = {};
    let qriList = results.refXML.getElementsByTagName('query_result_instance');
    for (let qri of qriList) {
        let rec = {};
        rec.id = i2b2.h.XPath(qri, 'descendant-or-self::result_instance_id')[0].firstChild.nodeValue;
        rec.desc = i2b2.h.XPath(qri, 'descendant-or-self::query_result_type/description')[0].firstChild.nodeValue;
        rec.status = i2b2.h.XPath(qri, 'descendant-or-self::query_status_type/name')[0].firstChild.nodeValue;
        idQRI[rec.id] = rec;

        // update counter
        if (stats[rec.status] === undefined) stats[rec.status] = 0;
        stats[rec.status]++;

        // get the patient count
        try {
            let pCount = parseInt(i2b2.h.XPath(qriList[0], 'descendant-or-self::set_size')[0].firstChild.nodeValue);
            if (i2b2.PM.model.isObfuscated) {
                if (i2b2.UI.cfg.useFloorThreshold && pCount < i2b2.UI.cfg.floorThresholdNumber) {
                    pCount = i2b2.UI.cfg.floorThresholdText + i2b2.UI.cfg.floorThresholdNumber;
                } else {
                    pCount = i2b2.CRC.QueryStatus.formatObfuscation(pCount, i2b2.UI.cfg.obfuscatedDisplayNumber);
                }
            }
            i2b2.CRC.model.runner.patientCount = pCount
        } catch(e) {}
    }

    // check for errors
    if (typeof stats["ERROR"] !== "undefined") i2b2.CRC.model.runner.hasError = true;

    i2b2.CRC.model.runner.queryResultInstances = idQRI;
    i2b2.CRC.model.runner.progress = stats;

    // see if all processing is done
    if (Object.keys(stats).length === 1 && (stats["FINISHED"] || stats["ERROR"])) {
        i2b2.CRC.ctrlr.QueryMgr._eventFinishedAll();
    } else {
        i2b2.CRC.model.runner.isPolling = false;
    }
};


// ================================================================================================== //
i2b2.CRC.ctrlr.QueryMgr._processModel = function() {
    let funcTranslateDate = function(trgtdate) {
        // this does proper setting of the timezone based on the browser's current timezone
        return String(trgtdate.getFullYear())+"-"+String(trgtdate.getMonth()+1).padStart(2, "0")+"-"+String(trgtdate.getDate()).padStart(2, "0")
            +'T00:00:00';
    };

    let createPanelItem = function(item){
        let tempItem = {};
        let name;
        // TODO: how/if we need to handle "<constrain_by_date><date_from/><date_to/></>"
        switch (item.sdxInfo.sdxType) {
            case "PRS":
                tempItem.key = "patient_set_coll_id:" + i2b2.h.Escape(item.sdxInfo.sdxKeyValue);
                name = item.origData.titleCRC ? item.origData.titleCRC : item.origData.title;
                let trimPos = name.lastIndexOf(" - ");
                name = trimPos === -1 ? name : name.substring(0, trimPos);
                tempItem.name = i2b2.h.Escape(name);
                tempItem.tooltip = i2b2.h.Escape(item.origData.title);
                tempItem.isSynonym = "false";
                tempItem.hlevel = 0;
                break;
            case "PR":
                tempItem.key = "PATIENT:HIVE:" + i2b2.h.Escape(item.sdxInfo.sdxKeyValue);
                name = item.origData.titleCRC ? item.origData.titleCRC : item.origData.title;
                // perhaps this is an encounter
                if (name) {
                    let subsetPos = name.indexOf(" [");
                    name = subsetPos === -1 ? name : "PATIENT:HIVE:" + name.substring(0, subsetPos);
                    tempItem.tooltip = i2b2.h.Escape(item.origData.title);
                } else if (item.origData.event_id) {
                    name = "PATIENT:HIVE:" + item.origData.patient_id;
                }
                tempItem.name = i2b2.h.Escape(name);
                tempItem.isSynonym = "false";
                tempItem.hlevel = 0;
                break;
            case "QM":
                tempItem.key = "masterid:" + i2b2.h.Escape(item.sdxInfo.sdxKeyValue);
                name = item.origData.name;
                name = name.substring(0, name.indexOf(" ", name.lastIndexOf("@")));
                tempItem.name = "(PrevQuery) " + i2b2.h.Escape(name);
                tempItem.tooltip = i2b2.h.Escape(item.origData.name);
                tempItem.isSynonym = "false";
                tempItem.hlevel = 0;
                break;
            case "ENS":
                tempItem.key= "patient_set_enc_id:" +  i2b2.h.Escape(item.sdxInfo.sdxKeyValue);
                tempItem.name = i2b2.h.Escape(item.sdxInfo.sdxDisplayName);
                tempItem.tooltip = i2b2.h.Escape(item.sdxInfo.sdxDisplayName);
                tempItem.isSynonym = "false";
                tempItem.hlevel = 0;
                break;
            case "CONCPT":
                tempItem.key = i2b2.h.Escape(item.sdxInfo.sdxKeyValue);
                tempItem.name = i2b2.h.Escape(item.origData.name);
                if (item.origData.tooltip) tempItem.tooltip = i2b2.h.Escape(item.origData.tooltip);
                tempItem.hlevel = item.origData.level;
                tempItem.class = "ENC";
                tempItem.icon = item.origData.hasChildren;
                if (item.origData.synonym_cd !== undefined) {
                    if (item.origData.synonym_cd === true || item.origData.synonym_cd === "Y") {
                        tempItem.isSynonym = "true";
                    } else {
                        tempItem.isSynonym = "false";
                    }
                } else {
                    tempItem.isSynonym = "false";
                }

                if (item.origData.isModifier) {
                    tempItem.modName = i2b2.h.Escape(tempItem.name);
                    tempItem.modKey = i2b2.h.Escape(tempItem.key);
                    tempItem.name = i2b2.h.Escape(item.origData.conceptModified.origData.name != null ? item.origData.conceptModified.origData.name : tempItem.name);
                    tempItem.key = i2b2.h.Escape(item.origData.conceptModified.origData.key);
                    tempItem.isModifier = true;
                    tempItem.applied_path = i2b2.h.Escape(item.origData.applied_path);
                    let modParent = item.origData.conceptModified.origData;
                    while (modParent != null) {
                        if (modParent.isModifier) {
                            modParent = modParent.conceptModified;
                        } else {
                            tempItem.level = modParent.level;
                            tempItem.key = i2b2.h.Escape(modParent.key);
                            tempItem.name = i2b2.h.Escape(modParent.name);
                            tempItem.tooltip = i2b2.h.Escape(modParent.tooltip);
                            tempItem.icon = modParent.hasChildren;
                            break;
                        }
                    }
                }

                if (item.LabValues) {
                    tempItem.ValueType = item.LabValues.ValueType;
                    tempItem.ValueOperator = item.LabValues.ValueOperator;
                    tempItem.ValueUnit= item.LabValues.ValueUnit;

                    if (item.LabValues.ValueLow) {
                        tempItem.Value = item.LabValues.ValueLow + " and " + item.LabValues.ValueHigh;
                    } else if (tempItem.ValueType === i2b2.CRC.ctrlr.labValues.ValueTypes.GENERAL_VALUE.FLAG){
                        tempItem.Value = item.LabValues.ValueFlag;
                    } else {
                        if(Array.isArray(item.LabValues.Value)){
                            item.LabValues.Value.forEach(element => i2b2.h.Escape(element));
                            tempItem.Value = item.LabValues.Value;
                        }
                        else{
                            tempItem.Value = i2b2.h.Escape(item.LabValues.Value);
                        }
                    }
                    tempItem.isString = item.LabValues.isString;
                    tempItem.isEnum = item.LabValues.isEnum;
                }

                if (item.dateRange !== undefined) {
                    if (item.dateRange.start !== undefined && item.dateRange.start !== "") {
                        tempItem.dateFrom = funcTranslateDate(new Date(item.dateRange.start));
                        tempItem.hasDate = true;
                    }
                    if (item.dateRange.end !== undefined && item.dateRange.end !== "") {
                        tempItem.dateTo = funcTranslateDate(new Date(item.dateRange.end));
                        tempItem.hasDate = true;
                    }
                }
                break;
        }

        return tempItem;
    }

    let createPanel = function(panelNumber, invert, occursCount, timing){
        let tempPanel = {};
        tempPanel.number = panelNumber;
        tempPanel.invert = invert ? "1" : "0";
        tempPanel.timing = timing;
        tempPanel.occursCount = occursCount;

        return tempPanel;
    }
    let transformedModel = {};
    transformedModel.name = i2b2.CRC.model.query.name;
    transformedModel.specificity = "0";
    transformedModel.queryTiming = "ANY";
    transformedModel.useShrine = false;
    transformedModel.panels = [];
    transformedModel.subQueries = [];
    for (let qgIdx=0; qgIdx < i2b2.CRC.model.query.groups.length; qgIdx++) {
        let qgData = i2b2.CRC.model.query.groups[qgIdx];
        let invert = qgData.without === true;
        switch (qgData.display) {
            case "when":
                qgData.events.forEach((item, idx) => {
                    let subQuery  = {};
                    subQuery.name = "Event " + String(idx+1);
                    subQuery.id = subQuery.name;
                    subQuery.type= "EVENT";
                    subQuery.timing = "SAMEINSTANCENUM";
                    subQuery.specificity = "0";
                    subQuery.panels = [];
                    let number = String(qgIdx+1);
                    let timing = "SAMEINSTANCENUM";
                    let occursCount = item.instances;
                    let tempPanel = createPanel(number, invert, occursCount, timing);
                    tempPanel.items = [];
                    item.concepts.forEach((item) => {
                        let tempItem = createPanelItem(item);
                        tempPanel.items.push(tempItem);
                    });
                    if (tempPanel.items.length > 0) {
                        subQuery.panels.push(tempPanel);
                        transformedModel.subQueries.push(subQuery);
                    }
                });
                let subQueryConstraints  = [];
                qgData.eventLinks.forEach((link, idx) => {
                    //check if event has terms
                    if(transformedModel.subQueries.length > idx+1) {
                        let constraints = {};
                        constraints.firstQuery = {};
                        constraints.firstQuery.id = transformedModel.subQueries[idx].name;
                        constraints.firstQuery.aggregateOp = link.aggregateOp1;
                        constraints.firstQuery.joinColumn = link.joinColumn1;
                        constraints.operator = link.operator;

                        constraints.secondQuery = {};
                        constraints.secondQuery.id = transformedModel.subQueries[idx + 1].name;
                        constraints.secondQuery.aggregateOp = link.aggregateOp2;
                        constraints.secondQuery.joinColumn = link.joinColumn2;

                        constraints.timeSpans = [];
                        link.timeSpans.forEach((timeSpan) => {
                            if(timeSpan.operator && timeSpan.value && timeSpan.unit
                                && timeSpan.operator.length > 0 && timeSpan.value.length > 0 && timeSpan.unit.length > 0) {
                                constraints.timeSpans.push(timeSpan);
                            }
                        });

                        subQueryConstraints.push(constraints);
                    }
                });

                transformedModel.subQueryConstraints = subQueryConstraints;
                break;
            case "without":
            case "with":
                let number =String(qgIdx+1);
                let timing = qgData.timing;
                let occursCount = qgData.events[0].instances;
                let tempPanel = createPanel(number, invert, occursCount, timing);
                tempPanel.items = [];
                qgData.events[0].concepts.forEach((item) => {
                    let tempItem = createPanelItem(item);
                    tempPanel.items.push(tempItem);
                });
                if (tempPanel.items.length > 0) transformedModel.panels.push(tempPanel);
                break;
        }
    }

    // generate the initial name for query
    transformedModel.name  = "";

    i2b2.CRC.model.transformedQuery = transformedModel;
};


// set up the model used by the QueryManager subsystem
// ================================================================================================== //
i2b2.CRC.model.runner = {
    name: "",
    definition: null,
    elapsedTime: "0",
    startTime: new Date(),
    status: "Running",
    intervalTimer: null,
    abortable: true,
    finished: false,
    deleteCurrentQuery: false,
    queued: false,
    isPolling: true,
    isRunning: true,
    isLoading: false,
    isCancelled: false,
    hasError: false,
    isShrine: false
};
