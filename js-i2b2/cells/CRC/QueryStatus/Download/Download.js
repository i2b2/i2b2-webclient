export default class Download {
    constructor(componentConfig, qrsRecordInfo, qrsData) {
        try {
            this.config = componentConfig;
            this.record = qrsRecordInfo;
            this.data = qrsData;
            this.isVisible = false;
        } catch(e) {
            console.error("Error in QueryStatus:Download.constructor()");
        }
    }

    destroy() {
        delete this.config.displayEl;
        delete this.config;
        delete this.record;
        delete this.data;
    }

    update(inputData) {
        try {
            if (typeof inputData === 'undefined') {
                // no data has been set... exit
                return false;
            } else {
                // bail out if the results are an error
                const status = i2b2.h.XPath(inputData,"//query_result_instance/query_status_type/name");
                if (status.length > 0 && i2b2.CRC.QueryStatus.hideVisualizationsOn.includes(status[0].firstChild.nodeValue)) return false;

                // get the breakdown data information (if present)
                let resultXML = i2b2.h.XPath(inputData, "//xml_value");
                if (resultXML.length > 0) {
                    resultXML = resultXML[0].firstChild.nodeValue;
                    // parse the data and put the results into the new data slot
                    this.data = parseData(resultXML);
                    if (typeof this.data === 'undefined') return;
                    // add the query name to the data
                    this.data.title = this.record.description.replaceAll("\"","'"); // replace " with ' to prevent CSV errors
                } else {
                    this.data = false;
                }
            }
        } catch(e) {
            console.error("Error in QueryStatus:Download.update().", e);
        }
        return false;
    }

    redraw(width) {
        // this vizComponent does not have a visual representation
        return true;
    }

    show() {
        // this is executed before a render and/or displaying of this visualization.
        // returning false will cancel the selection and (re)displaying of this visualization
        // USED PRIMARLY BY THE "Download" MODULE
        try {
            if (this.data === false) {
                alert("No data to download for " + this.record.title);
            } else {
                // create download link and associate csv data to it
                let dlLink = document.createElement('a');
                let data = new Blob([generateCSV(this.data)], {'type':'text/csv'});
                dlLink.href = URL.createObjectURL(data);
                dlLink.download = this.record.description.replaceAll(' ','_') + ".csv";
                document.body.appendChild(dlLink);
                // programatically click the link to start download
                dlLink.click()
                // cleanup the generated link (and associated data)
                document.body.removeChild(dlLink);
            }
            this.isVisible = false;
            return false;
        } catch(e) {
            console.error("Error in QueryStatus:Download.show().", e);
        }
    }

    hide() {
        try {
            this.isVisible = false;
            return true;
        } catch(e) {
            console.error("Error in QueryStatus:Download.hide()");
        }
    }
}

// =======================================================================================================================

let generateCSV = (inputData) => {
    let line, csv;

    let siteCnt = 0;
    if (typeof inputData.SHRINE !== 'undefined') siteCnt = inputData.SHRINE.sites.length;

    const func_ProcessLine = (lineArray) => {
        let line = lineArray.map((x) => x.trim().replaceAll(`"`, `'`));
        line = line.map((x) => `"` + x + `"`);
        return line.join(',') + `\n`;
    };

    // title line
    line = [inputData.title];
    line.push("");
    for (let i=0; i<siteCnt; i++) line.push("");
    csv = func_ProcessLine(line);

    // column header line
    line = ["Breakdown Group"];
    if (siteCnt > 0) {
        for (let i=0; i<siteCnt; i++) line.push(inputData.SHRINE.sites[i].name);
    }
    line.push("Total");

    if(inputData.isObfuscated) {
        line.push("Total Obfuscation Noise Clamp");
    }

    csv = csv + func_ProcessLine(line);

    // // add the "All Patients" line if we have SHRINE data
    // if (siteCnt > 0) {
    //     line = ["All Patients"];
    //     let total = 0;
    //     for (let i=0; i<siteCnt; i++) {
    //         let subtotal = inputData.SHRINE.sites[i].results.map((t) => t.value).reduce((parialSum, a) => parialSum + a, 0);
    //         total = total + subtotal;
    //         line.push(String(subtotal));
    //     }
    //     line.push(String(total));
    //     csv = csv + func_ProcessLine(line);
    // }

    for (let grouping of inputData.result) {
        line = [grouping.name];
        if (siteCnt > 0) {
            for (let i=0; i<siteCnt; i++) {
                let temp = [];
                if (typeof inputData.SHRINE.sites[i].results !== "undefined") {
                    temp = inputData.SHRINE.sites[i].results.filter((t) => t.name === grouping.name);
                }
                if (temp.length > 0) {
                    if (typeof temp[0].display !== "undefined") {
                        line.push(temp[0].display);
                    } else {
                        line.push(String(temp[0].value));
                    }
                } else {
                    line.push('');
                }
            }
        }

        if(inputData.isObfuscated){
            const indexOfObfuscation = grouping.display.indexOf("+/-");
            if(indexOfObfuscation !== -1){
                const displayValue = grouping.display.substring(0, indexOfObfuscation).trim();
                line.push(displayValue.replaceAll(",", ""));
                line.push(grouping.display.substring(indexOfObfuscation));
            }else{
                line.push(grouping.display.replaceAll(",", ""));
            }
        }else{
            line.push(grouping.display.replaceAll(",", ""));
        }

        csv = csv + func_ProcessLine(line);
    }
    return csv;
};



let parseData = function(xmlData) {
    let breakdown = {};
    breakdown.result = [];
    breakdown.isObfuscated = false;
    // process "normal" data
    let params = i2b2.h.XPath(xmlData, 'descendant::data[@column]/text()/..');
    // short circuit exit because there is no data
    if (params.length === 0) return;
    for (let i2 = 0; i2 < params.length; i2++) {
        let entryRecord = {}
        entryRecord.name = $('<div>').html(params[i2].getAttribute("column")).text();
        entryRecord.value = parseInt(params[i2].firstChild.nodeValue);
        entryRecord.display = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(params[i2].firstChild.nodeValue);

        if(entryRecord.display.indexOf("+/-") !== -1){
            breakdown.isObfuscated = true;
        }

        // Override the display value if specified by server setting the "display" attribute
        if (typeof params[i2].attributes.display !== 'undefined') {
            entryRecord.value = i2b2.h.Unescape(entryRecord.value);
            entryRecord.display = params[i2].attributes.display.textContent;
        }
        breakdown.result.push(entryRecord);
    }

    // process "SHRINE" data
    let ShrineNode = i2b2.h.XPath(xmlData, 'descendant::SHRINE');
    if (ShrineNode.length) {
        let ShrineData = {
            complete: ShrineNode[0].getAttribute('complete'),
            error: ShrineNode[0].getAttribute('error'),
            sites: []
        };
        for (let site of i2b2.h.XPath(ShrineNode[0], "site")) {
            let siteData = {};
            // deal with attributes
            for (let attrib of site.attributes) {
                siteData[attrib.name] = attrib.value;
            }
            // deal with site data
            let siteResults = i2b2.h.XPath(site, "siteresult");
            if (siteResults.length) {
                siteData.results = [];
                for (let siteresult of siteResults) {
                    siteData.results.push({
                        name: $('<div>').html(siteresult.getAttribute('column')).text(),
                        value: parseInt(siteresult.textContent)
                    });
                }
            }
            ShrineData.sites.push(siteData);
        }
        breakdown.SHRINE = ShrineData;
    }

    return breakdown;
}
