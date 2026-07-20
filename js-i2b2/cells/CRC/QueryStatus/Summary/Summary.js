export default class Summary {

    constructor(componentConfig, qrsRecordInfo, qrsData) {
        try {
            this.config = componentConfig;
            this.record = qrsRecordInfo;
            this.data = qrsData;
            this.isVisible = false;

            $.ajax("js-i2b2/cells/CRC/QueryStatus/Summary/QueryStatus.html", {
                success: (template, status, req) => {
                    // re-identify the "this" value
                    let thisClassInstance = i2b2.CRC.QueryStatus.model.visualizations["INTERNAL_SUMMARY"].componentInstances[0].visualization;
                    if (typeof thisClassInstance.template !== "undefined") return;

                    // don't pollute the global Handlebars space
                    thisClassInstance.template = Handlebars.compile(req.responseText);

                    // display the initial info that was passed (if we are ready)
                    if (typeof thisClassInstance.record !== "undefined") thisClassInstance.update(thisClassInstance.record);
                    // // make sure we are visible
                    // thisClassInstance.show();
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: CRC/QueryStatus/Summary/QueryStatus.html"); }
            });
        } catch(e) {
            console.error("Error in QueryStatus:Summary.constructor()");
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
            if (typeof data !== 'undefined') {
                this.record = data;
            }
            if (typeof this.template !== 'undefined') {
                // update the display
                $(this.config.displayEl).empty();
                const renderData = {...this.record, showQueryButton: this.config.definition.showQueryButton};
                if (typeof renderData.patientCount !== "undefined") {
                    renderData.patientCountHtml = String(renderData.patientCount).replaceAll("+/-", i2b2.CRC.QueryStatus.plusMinus("html"));
                }
                $(this.template(renderData)).appendTo(this.config.displayEl);
            }
            return true;
        } catch(e) {
            console.error("Error in QueryStatus:Summary.update()");
            return false;
        }
    }

    redraw(width) {}

    show() {
        // this is executed before a render and/or displaying of this visualization.
        // returning false will cancel the selection and (re)displaying of this visualization
        try {
            this.config.displayEl.style.display = 'block';
            this.isVisible = true;
            return true;
        } catch(e) {
            console.error("Error in QueryStatus:Summary.show()");
            return false;
        }
    }

    hide() {
        this.isVisible = true;
        return false;
    }

}
