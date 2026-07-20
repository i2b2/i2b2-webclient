
export default class NihEnrollTable {
    constructor(componentConfig, qrsRecordInfo, qrsData) {
        try {
            this.config = componentConfig;
            this.record = qrsRecordInfo;
            this.data = qrsData;
            this.isVisible = false;


            // create the table template
            (async function() {
                // retrieve the component frame template
                let response = await fetch(i2b2.CRC.QueryStatus.baseURL + "NihEnrollTable/template.html");
                if (!response.ok) {
                    console.error(`Failed to retrieve NihEnrollTable component template file: ${response.status}`);
                    this.dispTemplate = false;
                } else {
                    this.dispTemplate = await response.text();
                    this.renderTemplate = Handlebars.compile(this.dispTemplate);
                    this.update();
                }
            }).call(this);

        } catch(e) {
            console.error("Error in QueryStatus:Table.constructor()");
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
                if (this.data === null || Object.keys(this.data).length === 0) return false;
            }
            // bail out if the results are an error
            const status = i2b2.h.XPath(inputData,"//query_result_instance/query_status_type/name");
            if (status.length > 0 && i2b2.CRC.QueryStatus.hideVisualizationsOn.includes(status[0].firstChild.nodeValue)) return false;

            // get the breakdown data information (if present)
            let resultXML = i2b2.h.XPath(inputData, "//xml_value");
            if (resultXML.length > 0) {
                resultXML = resultXML[0].firstChild.nodeValue;
                // parse the data and put the results into the new data slot
                this.data = parseData(resultXML);
                if (typeof this.data === 'undefined') return false;
            }

            // convert the data into our data tree format
            const treeStruct = [
                ["American Indian or Alaska Native", "Asian", "Native Hawaiian or Other Pacific Islander", "Black or African American", "White", "Multiple race", "No Race Info"],
                ["Female", "Male","Unknown/Not Reported"],
                ["Not Hispanic", "Hispanic", "No Ethnicity Info"]
            ];

            // create a data tree structure (insert 0 count for any missing)
            let dataTree = {}
            for (const level1 of treeStruct[0]) {
                dataTree[level1] = {};
                for (const level2 of treeStruct[1]) {
                    dataTree[level1][level2] = {};
                    for (const level3 of treeStruct[2]) {
                        // see if the data exist
                        const keyName = level1 + "-" + level2 + "-" + level3;
                        const matched = this.data.result.filter((d)=> d.name === keyName);
                        if (matched.length > 0) {
                            dataTree[level1][level2][level3] = matched[0];
                        } else {
                            dataTree[level1][level2][level3] = {"display": "0", "value": 0};
                        }
                    }
                }
            }


            // create the totals arrays (and populate the render array)
            let renderArray = [];
            let totalEthnicSex = new Array(10).fill(0);
            for (const idx in treeStruct[0]) {
                const race = treeStruct[0][idx];
                renderArray[idx] = new Array(10).fill(0);
                let count = 0;
                let colIdx = 0;
                for (const sexIdx in treeStruct[1]) {
                    const sexKey = treeStruct[1][sexIdx];
                    for (const ethnicityIdx in treeStruct[2]) {
                        const ethnicityKey = treeStruct[2][ethnicityIdx];
                        colIdx = parseInt(ethnicityIdx * 3) + parseInt(sexIdx);
                        // cell value
                        // renderArray[idx][colIdx] = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(dataTree[race][sexKey][ethnicityKey].value);
                        renderArray[idx][colIdx] = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(dataTree[race][sexKey][ethnicityKey].value, 0 ,0);
                        // increment row value
                        count += parseInt(dataTree[race][sexKey][ethnicityKey].value);
                        // increment column value
                        totalEthnicSex[colIdx] += parseInt(dataTree[race][sexKey][ethnicityKey].value);
                    }
                }
                renderArray[idx][9] = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(count, 0 , 0);
            }

            // update the grand total on the last row
            totalEthnicSex[9] = totalEthnicSex.reduce((acc, currentValue) => acc + currentValue, 0);

            // place the updated totals on last row
            for (let idx = 0; idx < 10; idx++) {
                totalEthnicSex[idx] = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(totalEthnicSex[idx], 0, 0);
            }
            renderArray[7] = totalEthnicSex;


            // render the template using the data
            if (typeof this.renderTemplate === 'undefined') return false;
            // this.config.displayEl.innerHTML = this.renderTemplate([
            //     [[1],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[2],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[3],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[4],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[5],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[6],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[7],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
            //     [[8],[1],[2],[3],[4],[5],[6],[7],[8],[9]]
            // ]);
            this.config.displayEl.innerHTML = this.renderTemplate(renderArray);

            // update the viewport element to the height of the visualization
            if (this.isVisible) this.config.displayEl.parentElement.style.height = this.config.displayEl.scrollHeight + "px";
        } catch(e) {
            console.error("Error in QueryStatus:Table.update()");
            return false;
        }
        return true;
    }


    redraw(width) {
        try {
            // update the viewport element to the height of the visualization
            if (this.isVisible) {
                this.config.displayEl.parentElement.style.height = this.config.displayEl.scrollHeight + "px";
                // add style if the display grid is bigger than the viewport window
                setTimeout((()=>{
                    const dispGrid = this.config.displayEl.querySelector('.table-grid');
                    if (dispGrid.scrollWidth > dispGrid.clientWidth) {
                        dispGrid.classList.add('oversized');
                    } else {
                        dispGrid.classList.remove('oversized');
                    }
                }).bind(this),25);
            }
        } catch(e) {
            console.error("Error in QueryStatus:Table.redraw()");
        }
    }


    show() {
        // this is executed before a render and/or displaying of this visualization.
        // returning false will cancel the selection and (re)displaying of this visualization
        try {
            this.isVisible = true;
            if (this.config.dropdownEl) this.config.dropdownEl.style.display = 'block';
            if (this.config.parentTitleEl) this.config.parentTitleEl.innerHTML = this.record.title;
            this.config.displayEl.style.display = 'block';
            this.config.displayEl.parentElement.style.height = this.config.displayEl.scrollHeight + "px";
            return true;
        } catch(e) {
            console.error("Error in QueryStatus:Table.show()");
        }
    }


    hide() {
        try {
            this.isVisible = false;
            this.config.displayEl.style.display = 'none';
            if (this.config.dropdownEl) this.config.dropdownEl.style.display = 'none';
            return true;
        } catch(e) {
            console.error("Error in QueryStatus:Table.hide()");
        }
    }
}



let parseData = function(xmlData) {
    let breakdown = {};
    breakdown.result = [];
    // process "normal" data
    let params = i2b2.h.XPath(xmlData, 'descendant::data[@column]/text()/..');
    // short circuit exit because there is no data
    if (params.length === 0) return;
    for (let i2 = 0; i2 < params.length; i2++) {
        let entryRecord = {}
        entryRecord.name = $('<div>').html(params[i2].getAttribute("column")).text();
        entryRecord.value = parseInt(params[i2].textContent);
        const floorThreshold = params[i2].getAttribute("floorThresholdNumber");
        const obfuscateNumber = params[i2].getAttribute("obfuscatedDisplayNumber");
        entryRecord.display = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(entryRecord.value, floorThreshold, obfuscateNumber);
        // Override the display value if specified by server setting the "display" attribute
        if (typeof params[i2].attributes.display !== 'undefined') {
            entryRecord.value = $('<div>').html(params[i2].textContent).text();
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
                        value: parseInt(siteresult.textContent),
                        display: i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumber(siteresult.textContent, siteData.floorThresholdNumberX, siteData.obfuscatedDisplayNumber)
                    });
                }
            }
            ShrineData.sites.push(siteData);
        }
        breakdown.SHRINE = ShrineData;
    }

    return breakdown;
}


// <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <ns10:i2b2_result_envelope>
//     <body>
//         <ns10:result name="PATIENT_NIH_ENROLLMENT_SHRINE_XML">
//             <data column="Asian-Female-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Asian-Female-Not Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Asian-Male-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Asian-Male-No Ethnicity Info" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Asian-Male-Not Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">65</data>
//             <data column="Black or African American-Female-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Black or African American-Female-No Ethnicity Info" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Black or African American-Female-Not Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">60</data>
//             <data column="Black or African American-Male-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Black or African American-Male-No Ethnicity Info" floorThresholdNumber="20" obfuscatedDisplayNumber="0">0</data>
//             <data column="Black or African American-Male-Not Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">65</data>
//             <data column="No Race Info-Female-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">70</data>
//             <data column="No Race Info-Male-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">75</data>
//             <data column="White-Female-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">55</data>
//             <data column="White-Female-No Ethnicity Info" floorThresholdNumber="20" obfuscatedDisplayNumber="20">40</data>
//             <data column="White-Female-Not Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">410</data>
//             <data column="White-Male-Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">70</data>
//             <data column="White-Male-No Ethnicity Info" floorThresholdNumber="20" obfuscatedDisplayNumber="20">45</data>
//             <data column="White-Male-Not Hispanic" floorThresholdNumber="20" obfuscatedDisplayNumber="20">530</data>
//         </ns10:result>
//         <SHRINE sites="2" complete="2" error="0">
//             <site name="Site 1" status="Completed" binsize="5" stdDev="6.500000000000000e+000" obfuscatedDisplayNumber="10" floorThresholdNumber="10">
//                 <siteresult column="Black or African American-Male-Hispanic" type="int">0</siteresult>
//                 <siteresult column="White-Male-Not Hispanic" type="int">265</siteresult>
//                 <siteresult column="White-Female-No Ethnicity Info" type="int">25</siteresult>
//                 <siteresult column="Asian-Female-Not Hispanic" type="int">0</siteresult>
//                 <siteresult column="No Race Info-Male-Hispanic" type="int">35</siteresult>
//                 <siteresult column="Asian-Male-Hispanic" type="int">0</siteresult>
//                 <siteresult column="Asian-Male-Not Hispanic" type="int">30</siteresult>
//                 <siteresult column="Black or African American-Male-Not Hispanic" type="int">30</siteresult>
//                 <siteresult column="Asian-Male-No Ethnicity Info" type="int">0</siteresult>
//                 <siteresult column="Black or African American-Female-Hispanic" type="int">0</siteresult>
//                 <siteresult column="Black or African American-Male-No Ethnicity Info" type="int">0</siteresult>
//                 <siteresult column="No Race Info-Female-Hispanic" type="int">35</siteresult>
//                 <siteresult column="White-Female-Not Hispanic" type="int">205</siteresult>
//                 <siteresult column="White-Male-Hispanic" type="int">35</siteresult>
//                 <siteresult column="White-Male-No Ethnicity Info" type="int">20</siteresult>
//                 <siteresult column="Black or African American-Female-No Ethnicity Info" type="int">0</siteresult>
//                 <siteresult column="Asian-Female-Hispanic" type="int">0</siteresult>
//                 <siteresult column="Black or African American-Female-Not Hispanic" type="int">35</siteresult>
//                 <siteresult column="White-Female-Hispanic" type="int">30</siteresult>
//             </site>
//             <site name="Site 2" status="Completed" binsize="5" stdDev="6.500000000000000e+000" obfuscatedDisplayNumber="10" floorThresholdNumber="10">
//                 <siteresult column="Black or African American-Male-Hispanic" type="int">0</siteresult>
//                 <siteresult column="White-Male-Not Hispanic" type="int">265</siteresult>
//                 <siteresult column="White-Female-No Ethnicity Info" type="int">15</siteresult>
//                 <siteresult column="Asian-Female-Not Hispanic" type="int">0</siteresult>
//                 <siteresult column="No Race Info-Male-Hispanic" type="int">40</siteresult>
//                 <siteresult column="Asian-Male-Hispanic" type="int">0</siteresult>
//                 <siteresult column="Asian-Male-Not Hispanic" type="int">35</siteresult>
//                 <siteresult column="Black or African American-Male-Not Hispanic" type="int">35</siteresult>
//                 <siteresult column="Asian-Male-No Ethnicity Info" type="int">0</siteresult>
//                 <siteresult column="Black or African American-Female-Hispanic" type="int">0</siteresult>
//                 <siteresult column="Black or African American-Male-No Ethnicity Info" type="int">0</siteresult>
//                 <siteresult column="No Race Info-Female-Hispanic" type="int">35</siteresult>
//                 <siteresult column="White-Female-Not Hispanic" type="int">205</siteresult>
//                 <siteresult column="White-Male-Hispanic" type="int">35</siteresult>
//                 <siteresult column="White-Male-No Ethnicity Info" type="int">25</siteresult>
//                 <siteresult column="Black or African American-Female-No Ethnicity Info" type="int">0</siteresult>
//                 <siteresult column="Asian-Female-Hispanic" type="int">0</siteresult>
//                 <siteresult column="Black or African American-Female-Not Hispanic" type="int">25</siteresult>
//                 <siteresult column="White-Female-Hispanic" type="int">25</siteresult>
//             </site>
//         </SHRINE>
//     </body>
// </ns10:i2b2_result_envelope>



// [
//     {"name":"Asian-Female-Hispanic","value":0,"display":"Less Than 20"},
//     {"name":"Asian-Female-Not Hispanic","value":0,"display":"Less Than 20"},
//     {"name":"Asian-Male-Hispanic","value":0,"display":"Less Than 20"},
//     {"name":"Asian-Male-No Ethnicity Info","value":0,"display":"Less Than 20"},
//     {"name":"Asian-Male-Not Hispanic","value":65,"display":"65+/-20"},
//     {"name":"Black or African American-Female-Hispanic","value":0,"display":"Less Than 20"},
//     {"name":"Black or African American-Female-No Ethnicity Info","value":0,"display":"Less Than 20"},
//     {"name":"Black or African American-Female-Not Hispanic","value":60,"display":"60+/-20"},
//     {"name":"Black or African American-Male-Hispanic","value":0,"display":"Less Than 20"},
//     {"name":"Black or African American-Male-No Ethnicity Info","value":0,"display":"Less Than 20"},
//     {"name":"Black or African American-Male-Not Hispanic","value":65,"display":"65+/-20"},
//     {"name":"No Race Info-Female-Hispanic","value":70,"display":"70+/-20"},
//     {"name":"No Race Info-Male-Hispanic","value":75,"display":"75+/-20"},
//     {"name":"White-Female-Hispanic","value":55,"display":"55+/-20"},
//     {"name":"White-Female-No Ethnicity Info","value":40,"display":"40+/-20"},
//     {"name":"White-Female-Not Hispanic","value":410,"display":"410+/-20"},
//     {"name":"White-Male-Hispanic","value":70,"display":"70+/-20"},
//     {"name":"White-Male-No Ethnicity Info","value":45,"display":"45+/-20"},
//     {"name":"White-Male-Not Hispanic","value":530,"display":"530+/-20"}
// ]
