export default class Count {
    constructor(componentConfig, qrsRecordInfo, qrsData) {
        try {
            this.config = componentConfig;
            this.record = qrsRecordInfo;
            this.data = qrsData;
            this.isVisible = false;

            // see if we are SHRINE count
            if (this.record.QRS_Type.indexOf("_SHRINE_") === -1) {
                this.isShrine = false;
            } else {
                this.isShrine = true;
            }

            (async function() {
                // retrieve the component frame template
                let response = await fetch(i2b2.CRC.QueryStatus.baseURL + "Count/Count.html");
                if (!response.ok) {
                    console.error(`Failed to retrieve Count component template file: ${response.status}`);
                    this.dispTemplate = "";
                } else {
                    this.dispTemplate = await response.text();
                    this.update();
                }
            }).call(this);

        } catch(e) {
            console.error("Error in QueryStatus:Count.constructor()");
        }
    }

    destroy() {
        delete this.config.displayEl;
        delete this.config;
        delete this.record;
        delete this.data;
    }

    update(data) {
        try {
            if (typeof data === 'undefined') {
                if (typeof this.data === 'undefined' || this.data === null) return false;
                data = this.data;
            } else {
                this.data = data;
            }

            // only continue if we have the template loaded (bugfix: race condition)
            if (typeof this.dispTemplate === 'undefined') return false;

            // bail out if the results are an error
            const status = i2b2.h.XPath(data,"//query_result_instance/query_status_type/name");
            if (status.length > 0 && i2b2.CRC.QueryStatus.hideVisualizationsOn.includes(status[0].firstChild.nodeValue)) return false;

            // extract the info from the XML
            let title = i2b2.h.XPath(data, "//query_result_instance/description");
            if (title.length === 0) {
                // deal with PATIENT_COUNT_SHRINE_XML which is different
                title = i2b2.h.XPath(data, "//query_result_instance/query_result_type/description")
            }
            title = title[0].firstChild.nodeValue;

            const count = i2b2.h.XPath(data, "//query_result_instance/set_size")[0].firstChild.nodeValue;
            // do not display if we have invalid data
            if (count === -1) return false;

            // display the info
            this.config.displayEl.innerHTML = this.dispTemplate;
            this.config.displayEl = this.config.displayEl.parentElement.querySelector('.viztype-COUNT.resulttype-' + this.record.QRS_Type);
            let refContainer = this.config.displayEl;
            const titleEl = refContainer.querySelector('.count-title');
            titleEl.innerHTML = title;
            const countEl = refContainer.querySelector('.count-value');
            let rawCount = parseInt(count).toLocaleString();
            if (this.isShrine) {
                // get the extra site information
                let xmlSHRINE = i2b2.h.Unescape(i2b2.h.XPath(data, "//xml_value")[0].innerHTML);
                let sitesTotal = i2b2.h.XPath(xmlSHRINE, "//SHRINE/@sites")
                if (sitesTotal.length > 0) {
                    sitesTotal = parseInt(sitesTotal[0].nodeValue).toLocaleString();
                } else {
                    // no data present, signal that we have nothing to display
                    return false;
                }
                let sitesDone = parseInt(i2b2.h.XPath(xmlSHRINE, "//SHRINE/@complete")[0].nodeValue).toLocaleString();
                let status;
                try {
                    status = i2b2.h.XPath(xmlSHRINE, "//SHRINE/@status")[0].textContent;
                } catch(e) {
                    status = "Unknown";
                }
                let obfuscateFloor = i2b2.h.XPath(xmlSHRINE, "//SHRINE/@floorThresholdNumber");
                if (obfuscateFloor.length > 0) {
                    obfuscateFloor = parseInt(obfuscateFloor[0].nodeValue);
                } else {
                    obfuscateFloor = 0;
                }
                let obfuscateDisplay = i2b2.h.XPath(xmlSHRINE, "//SHRINE/@obfuscatedDisplayNumber");
                if (obfuscateDisplay.length > 0) {
                    obfuscateDisplay = parseInt(obfuscateDisplay[0].nodeValue).toLocaleString();
                } else {
                    obfuscateDisplay = 0;
                }

                // count
                countEl.innerHTML = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumberHtml(count, obfuscateFloor, obfuscateDisplay);

                // sites reporting
                let sitesContainer = refContainer.querySelector('.count-sites');
                sitesContainer.innerHTML = status + ": " + sitesDone + " out of " + sitesTotal + " sites reporting";
                sitesContainer.style.display = "block";
            } else {
                countEl.innerHTML = i2b2.CRC.QueryStatus.obfuscateFloorDisplayNumberHtml(count);
            }
            // show everything
             refContainer.style.display = 'block';
        } catch(e) {
            console.error("Error in QueryStatus:Count.update()");
            return false;
        }
        return true;
    }

    redraw(width) {}

    show() {
        // this is executed before a render and/or displaying of this visualization.
        // returning false will cancel the selection and (re)displaying of this visualization
        try {
            // we only display when we get data
            this.isVisible = true;
            return true;
        } catch(e) {
            console.error("Error in QueryStatus:Count.show()");
        }

    }

    hide() {
        try {
            this.isVisible = true;
            return false;
        } catch(e) {
            console.error("Error in QueryStatus:Count.hide()");
        }
    }
}
