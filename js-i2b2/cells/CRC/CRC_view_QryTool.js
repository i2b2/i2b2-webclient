/**
 * @projectDescription	View controller for CRC Query Tool window.
 * @inherits 	i2b2.CRC.view
 * @namespace	i2b2.CRC.view.QT
 * @version 	2.0
 **/

// create and save the view objects
i2b2.CRC.view.QT = new i2b2Base_cellViewController(i2b2.CRC, 'QT');

i2b2.CRC.view.QT.allowedDropTypes = ["CONCPT","QM","PRS", "PR", "WRK", "ENS"];

// ================================================================================================== //
i2b2.CRC.view.QT.updateQueryName = function() {
    // update the transformed model and set the title
    $('.CRC_QT_runbar input.name').attr({placeholder : i2b2.CRC.ctrlr.QueryMgr.generateQueryName(), value : ''});
};


// ================================================================================================== //
i2b2.CRC.view.QT.resetToCRCHistoryView = function() {
    i2b2.CRC.view.search.reset();
    $("#i2b2TreeviewQueryHistoryFinder").hide();
    $("#i2b2TreeviewQueryHistory").show();
}
// ================================================================================================== //

i2b2.CRC.view.QT.handleConceptValidation = function(){
    let validQuery = true;
    let whenElems = $(".QueryGroup.when .event");
    whenElems.each((index, elem) => {
        let termList = $(elem).find(".TermList .concept");
        if (termList.length === 0) {
            $(elem).find(".required").removeClass("hidden");
            validQuery = false;
        } else {
            $(elem).find(".required").addClass("hidden");
        }
    });

    if(validQuery){
        //handle non-temporal case
        let whenElemsConcepts = whenElems.find(".TermList .concept");
        let withElemsConcepts = $(".QueryGroup.with .event").filter(function() {
            return $(this).find(".TermList .concept").length > 0;
        });
        let withoutElemsConcepts = $(".QueryGroup.without .event").filter(function() {
            return $(this).find(".TermList .concept").length > 0;
        });

        if (whenElemsConcepts.length === 0 && withElemsConcepts.length === 0 && withoutElemsConcepts.length === 0) {
            $(".QueryGroup .event").first().find(".required").removeClass("hidden");
            validQuery = false;
        }else{
            $(".QueryGroup .event").first().find(".required").addClass("hidden");
        }
    }

    return validQuery;
}

// ================================================================================================== //
i2b2.CRC.view.QT.validateQuery = function() {
    let validQuery = true;
    $(".SequenceBar .timeSpan").each((index, elem) => {
        if($(elem).find(".form-check-input").is(":checked")){
            let timeSpanValueElem = $(elem).find(".timeSpanValue");
            if(timeSpanValueElem.val().length === 0){
                timeSpanValueElem.addClass("required");
                timeSpanValueElem.parent().find(".timeSpanError").removeClass("vhidden");
                $(timeSpanValueElem.closest('.DateRelationship')).collapse('show');
                validQuery = false;
                i2b2.CRC.view.QT.handleConceptValidation();
            }else{
                timeSpanValueElem.removeClass("required");
                timeSpanValueElem.parent().find(".timeSpanError").addClass("vhidden");
            }
        }
    });
    //show or hide validation messages
    validQuery = validQuery && i2b2.CRC.view.QT.handleConceptValidation();

    return validQuery;
}
// ================================================================================================== //
i2b2.CRC.view.QT.showRun = function() {

    $(".CRC_QT_runbar .button-run").prop("disabled", false);

    let crcModal = $('body #crcModal');
    // show the options modal screen
    if (crcModal.length === 0) {
        crcModal = $("<div id='crcModal'/>").appendTo('body');
    }

    // if the user presses enter in one of the input fields on the crcModal form then run the query
    crcModal.submit(function(evt) {
        $(".CRC_QT_runbar .button-run").prop("disabled", false);
        $('body #crcModal button.i2b2-save').click();
        evt.preventDefault();
    });

    function updateSelectedResultTypes(description){
        const containsDescription = i2b2.CRC.model.selectedResultTypes.filter(n => n === description);
        if(containsDescription.length > 0) {
            i2b2.CRC.model.selectedResultTypes = i2b2.CRC.model.selectedResultTypes.filter(n => n !== description);
        }
        else{
            if(description !== 'Timeline') {
                i2b2.CRC.model.selectedResultTypes.push(description);
            }
        }
    }
    crcModal.load('js-i2b2/cells/CRC/assets/modalRunQuery.html', function() {
        document.getElementById("DataRequestDiv").style.display = "none";
        document.getElementById("DataExportDiv").style.display = "none";

        // populate the results list based on...
        // ==> i2b2.CRC.model.resultTypes
        // ==> i2b2.CRC.model.selectedResultTypes
        let checkContainer = $("#crcModal .ResultTypes");
        for (let code in i2b2.CRC.model.resultTypes) {
            let descriptions = i2b2.CRC.model.resultTypes[code];
            descriptions.forEach(description => {
                let checked = '';
                if (i2b2.CRC.model.selectedResultTypes.includes(description)) checked = ' checked="checked" ';

                let disabled='';
                if(code === 'PATIENT_COUNT_XML'){
                    disabled = 'disabled';
                }
                $('<div id="crcDlgResultOutput' + code + '">' +
                    '<input type="checkbox" class="chkQueryType" name="queryType" value="' + code + '"' + checked +  ' '+ disabled +'> '
                    + description + '</div>').click(function(){
                        updateSelectedResultTypes(description);
                }).appendTo(checkContainer);
            });
        }

        if(Object.keys(i2b2.CRC.model.requestTypes).length === 0 && Object.keys(i2b2.CRC.model.userRequestTypes).length === 0
            && Object.keys(i2b2.CRC.model.projectRequestTypes).length === 0){
            $('#DataRequestDiv').hide();
        }else{
            $('#DataRequestDiv').show();
        }

        const selectPatientSetForDataRequest = () => {
            const patientSetResultDiv =  $('.ResultTypes').find('#crcDlgResultOutputPATIENTSET:contains("Patient set")');
            const patientSetResultCheckbox = patientSetResultDiv.find('.chkQueryType');

            if( $('.chkRequestQueryType').is(":checked")) {
                if($('#requiredForExportText').length === 0){
                    patientSetResultDiv.append("<span id='requiredForExportText'> (required for data exports)</span>");
                }
                if(patientSetResultCheckbox.is(":not(:checked)")){
                    patientSetResultCheckbox.click();
                }
                patientSetResultCheckbox.prop('disabled', true);
            }else{
                $('#requiredForExportText').remove();
                patientSetResultCheckbox.prop('disabled', false);
            }
        };

        let requestContainer = $("#crcModal .RequestTypes");
        for (let code in i2b2.CRC.model.requestTypes) {
            let descriptions = i2b2.CRC.model.requestTypes[code];
            descriptions.forEach(description => {
                let checked = '';
                const dataRequestSelection = $('<input type="checkbox" class="chkQueryType chkRequestQueryType" name="queryType" value="' + code + '"' + checked + '>');
                dataRequestSelection.click(selectPatientSetForDataRequest);

                $('<div id="crcDlgResultOutput' + code + '">' + description + '</div>').prepend(dataRequestSelection).appendTo(requestContainer);
            });
        }

        const projectRequestTypesDescriptions = {};
        for (let code in i2b2.CRC.model.projectRequestTypes) {
            const descriptions = i2b2.CRC.model.projectRequestTypes[code];
            descriptions.forEach(description => {
                if(projectRequestTypesDescriptions[description] === undefined){
                    projectRequestTypesDescriptions[description] = [];
                }
                projectRequestTypesDescriptions[description].push(code);
            });
        }

        const sortAlphaNum = (a, b) => a.toUpperCase().localeCompare(b.toUpperCase(), undefined, { numeric: true })

        const projectRequestTypesDescKeys = Object.keys(projectRequestTypesDescriptions).sort(sortAlphaNum);
        projectRequestTypesDescKeys.forEach( description =>  {
            let codes = projectRequestTypesDescriptions[description];
            codes.forEach(code => {
                let checked = '';
                const dataRequestSelection = $('<input type="checkbox" class="chkQueryType chkRequestQueryType" name="queryType" value="' + code + '"' + checked + '>');
                dataRequestSelection.click(selectPatientSetForDataRequest);

                $('<div id="crcDlgResultOutput' + code + '"> Project Created: ' + description + '</div>').prepend(dataRequestSelection).appendTo(requestContainer);
            });
        })

        const userRequestTypesDescriptions = {};
        for (let code in i2b2.CRC.model.userRequestTypes) {
            const descriptions = i2b2.CRC.model.userRequestTypes[code];
            descriptions.forEach(description => {
                if(userRequestTypesDescriptions[description] === undefined){
                    userRequestTypesDescriptions[description] = [];
                }
                userRequestTypesDescriptions[description].push(code);
            });
        }
        const userRequestTypesDescKeys = Object.keys(userRequestTypesDescriptions ).sort(sortAlphaNum);
        userRequestTypesDescKeys.forEach( description =>  {
            let codes = userRequestTypesDescriptions[description];
            codes.forEach(code => {
                let checked = '';
                const dataRequestSelection = $('<input type="checkbox" class="chkQueryType chkRequestQueryType" name="queryType" value="' + code + '"' + checked + '>');
                dataRequestSelection.click(selectPatientSetForDataRequest);
                $('<div id="crcDlgResultOutput' + code + '"> User Created: ' + description + '</div>').prepend(dataRequestSelection).appendTo(requestContainer);
            });
        });

        $("#dataRequestInfoEmail").val(i2b2.PM.model.email);
        let dataExportContainer = $("#crcModal .DataExportTypes");
        for (let code in i2b2.CRC.model.dataExportTypes) {
            document.getElementById("DataExportDiv").style.display = "";
            let descriptions = i2b2.CRC.model.dataExportTypes[code];
            descriptions.forEach(description => {
                let checked = '';
                $('<div id="crcDlgResultOutput' + code + '"><input type="checkbox" class="chkQueryType" name="queryType" value="' + code + '"' + checked + '> ' + description + '</div>').appendTo(dataExportContainer);
            });
        }

        // populate/delete the query run methods
        if (!i2b2.CRC.model.queryExecutionOptions) {
            // no query execution options, remove input from form
            $("#crcModal .QueryMethodInput").remove();
        } else {
            // populate the query execution options
            let targetSelect = $('#crcModal .QueryMethodInput select');
            for (const [code, description] of Object.entries(i2b2.CRC.model.queryExecutionOptions)) {
                $('<option value="' + code + '">' + description + '</option>').appendTo(targetSelect);
            }
        }

        let runBox = $('#queryName').val();
        let queryName;
        if (runBox.length ==0) {
            queryName = i2b2.CRC.ctrlr.QueryMgr.generateQueryName();
        } else {
            queryName = runBox;
        }
        $("#crcQtQueryName").val(queryName).attr({placeholder: queryName, value: queryName });

        // now show the modal form
        $('body #crcModal div:eq(0)').modal('show');

        // run the query on button press
        $('body #crcModal button.i2b2-save').on('click', (evt) => {
            i2b2.CRC.view.QT.resetToCRCHistoryView();

            const selectedDataRequests = $('body #DataRequestDiv .chkQueryType:checked');
            if(selectedDataRequests.length > 0){
                const dataRequestInfoEmail = $("#dataRequestInfoEmail");
                const email = dataRequestInfoEmail.val();
                const emailRegex = /\S+@\S+\.\S+/;
                const isValidEmail = emailRegex.test(email);

                if(!isValidEmail) {
                    dataRequestInfoEmail.css('border', '1px solid red');
                    document.getElementById("dataRequestInfoEmailLabel").scrollIntoView();
                    $("#emailErrorMsg").show();
                    return;
                }else{
                    dataRequestInfoEmail.css('border', '');
                    $("#emailErrorMsg").hide();
                }
            }

            // get the query name
            let queryName = $("#crcQtQueryName").val().trim();
            // add (t) prefix  if this is a temporal query
            let queryNamePrefix = "";
            if (i2b2.CRC.model.transformedQuery.subQueries?.length > 1 && !queryName.startsWith("(t) ")) queryNamePrefix = "(t) ";
            if (queryName.length === 0) {
                queryName =  queryNamePrefix + i2b2.CRC.ctrlr.QueryMgr.generateQueryName();
            } else {
                queryName = queryNamePrefix  + queryName;
            }

            // update the query name field
            $('.CRC_QT_runbar input.name').attr({placeholder: queryName, value: queryName });

            // build list of selected result types
            let reqResultTypes = $('body #crcModal .chkQueryType:checked').map((idx, rec) => { return rec.value; }).toArray();
            reqResultTypes = [...new Set(reqResultTypes)];

            if (reqResultTypes.length > 0) {
                $(".errorMsg", "#crcModal").addClass("hidden");
                let reqExecutionMethod = $('#crcModal .QueryMethodInput select').val();

                let emailAndComments = {};
                if(selectedDataRequests.length > 0) {
                    const email = $("#dataRequestInfoEmail").val();
                    if (email.length > 0) {
                        emailAndComments.email = email;
                    }

                    const message = $("#dataRequestInfoComment").val();
                    if (message.length > 0) {
                        emailAndComments.message = message;
                    }
                }

                // start the query run
                i2b2.CRC.ctrlr.QueryMgr.startQuery(queryName, reqResultTypes, reqExecutionMethod, emailAndComments);
                // make sure that the Query Status window is visible
                let QueryStatusTab =  i2b2.layout.getItemsByComponentName(i2b2.layout.gl_instances.rightCol, 'i2b2.CRC.view.QueryMgr')[0];

                QueryStatusTab.parent.setActiveContentItem(QueryStatusTab);
                // close the modal
                $('body #crcModal div:eq(0)').modal('hide');
            } else {
                $(".errorMsg", "#crcModal").removeClass("hidden");
            }
        });
    });
};
// ================================================================================================== //
i2b2.CRC.view.QT.loadResultTypesAndShowRun = function() {

    // ==== Update the Query Result Types via ajax call ====
    var scopedCallback = new i2b2_scopedCallback();
    scopedCallback.callback = function(results) {
        //var cl_onCompleteCB = onCompleteCallback;
        // THIS function is used to process the AJAX results of the getChild call
        //		results data object contains the following attributes:
        //			refXML: xmlDomObject <--- for data processing
        //			msgRequest: xml (string)
        //			msgResponse: xml (string)
        //			error: boolean
        //			errorStatus: string [only with error=true]
        //			errorMsg: string [only with error=true]
        i2b2.CRC.model.resultTypes = {};
        i2b2.CRC.model.requestTypes = {};
        i2b2.CRC.model.userRequestTypes = {};
        i2b2.CRC.model.projectRequestTypes = {};
        i2b2.CRC.model.dataExportTypes = {};

        if (results.error){
            console.log("ERROR: Unable to retrieve result types from server", results.msgResponse);
        } else {
            // extract records from XML msg
            let ps = results.refXML.getElementsByTagName('query_result_type');
            if(!i2b2.CRC.model.selectedResultTypes || i2b2.CRC.model.selectedResultTypes.length === 0) {
                i2b2.CRC.model.selectedResultTypes = [];
            }
            for (let i1=0; i1<ps.length; i1++) {
                let name = i2b2.h.getXNodeVal(ps[i1],'name');
                let visual_attribute_type = i2b2.h.getXNodeVal(ps[i1],'visual_attribute_type');
                if (visual_attribute_type === "LA") {
                    if(i2b2.CRC.model.resultTypes[name] === undefined){
                        i2b2.CRC.model.resultTypes[name] = [];
                    }

                    let description = i2b2.h.getXNodeVal(ps[i1],'description');
                    i2b2.CRC.model.resultTypes[name].push(description);
                    if (name === "PATIENT_COUNT_XML") {
                        const selectedPatientCount = i2b2.CRC.model.selectedResultTypes.filter(n => n === description);
                        if(selectedPatientCount.length === 0) {
                            i2b2.CRC.model.selectedResultTypes.push(description);
                        }
                    }
                } else if (visual_attribute_type === "LR") {
                    if(i2b2.CRC.model.requestTypes[name] === undefined){
                        i2b2.CRC.model.requestTypes[name] = [];
                    }
                    i2b2.CRC.model.requestTypes[name].push(i2b2.h.getXNodeVal(ps[i1],'description'));
                } else if (visual_attribute_type === "LU") {
                    if(i2b2.CRC.model.userRequestTypes[name] === undefined){
                        i2b2.CRC.model.userRequestTypes[name] = [];
                    }
                    i2b2.CRC.model.userRequestTypes[name].push(i2b2.h.getXNodeVal(ps[i1],'description'));
                }else if (visual_attribute_type === "LP") {
                    if(i2b2.CRC.model.projectRequestTypes[name] === undefined){
                        i2b2.CRC.model.projectRequestTypes[name] = [];
                    }
                    i2b2.CRC.model.projectRequestTypes[name].push(i2b2.h.getXNodeVal(ps[i1],'description'));
                }else if (visual_attribute_type === "LX") {
                    if(i2b2.CRC.model.dataExportTypes[name] === undefined){
                        i2b2.CRC.model.dataExportTypes[name] = [];
                    }
                    i2b2.CRC.model.dataExportTypes[name].push(i2b2.h.getXNodeVal(ps[i1],'description'));
                }
            }
        }
        i2b2.CRC.view.QT.showRun();
    }
    i2b2.CRC.ajax.getQRY_getResultType("CRC:QueryTool", null, scopedCallback);
}

// ================================================================================================== //

i2b2.CRC.view.QT._correctQgTitles = function() {
    // this function makes sure that the first query group always says "Find Patients"
    $(" .JoinText:first", i2b2.CRC.view.QT.containerDiv).text("Find Patients");
};
// ================================================================================================== //
i2b2.CRC.view.QT.enableWhenIfAvail = function() {
    let selectedWhen = $(".QueryGroup.when");

    if(selectedWhen.length === 0){
        $(".whenItem").removeClass("disabled");       
    }else{
        $(".whenItem").addClass("disabled");
        selectedWhen.find(".whenItem").removeClass("disabled");
    }
};
// ================================================================================================== //
i2b2.CRC.view.QT.createEventLink = function() {
    let eventLink = {
        aggregateOp1: "FIRST",
        aggregateOp2: "FIRST",
        operator: "LESS",
        joinColumn1: "STARTDATE",
        joinColumn2: "STARTDATE",
        timeSpans: [
            {
                "operator": "GREATEREQUAL",
                "unit": "DAY"
            },
            {
                "operator": "GREATEREQUAL",
                "unit": "DAY"
            }
        ]
    }

    return eventLink;
};
// ================================================================================================== //
i2b2.CRC.view.QT.createEvent = function() {
    let event = {
        dateRange: {
            start: "",
            end: ""
        },
        instances: 1,
        concepts: []
    };

    return event;
};

// ================================================================================================== //
i2b2.CRC.view.QT.extractEventLinkFromElem = function(elem) {
    let eventLinkIdx = $(elem).parents('.eventLink').first().data('eventLinkIdx');
    let queryGroupIdx = $(elem).parents('.QueryGroup').first().data("queryGroup");

    return i2b2.CRC.model.query.groups[queryGroupIdx].eventLinks[eventLinkIdx];
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateEventLinkOperator = function(elem) {
    let eventLink = i2b2.CRC.view.QT.extractEventLinkFromElem(elem);
    eventLink.operator = $(elem).val();
    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateEventLinkAggregateOp = function(elem) {
    let eventLink = i2b2.CRC.view.QT.extractEventLinkFromElem(elem);
    let eventLinkOpName = $(elem).data('aggregateOp');
    eventLink[eventLinkOpName] = $(elem).val();
    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateEventLinkJoinColumn = function(elem) {
    let eventLink = i2b2.CRC.view.QT.extractEventLinkFromElem(elem);  
    let eventLinkOpName = $(elem).data('joinColumn');    
    eventLink[eventLinkOpName] = $(elem).val();
    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //


i2b2.CRC.view.QT.generateSequenceBarText = function(elem) {
    let eventLinkIdx = $(elem).parents('.eventLink').first().data('eventLinkIdx'); // eventlink idx +1     
    let baseEvent = $(elem).parents('.eventLink')[0]; 
    let text = 'The ';

    text = text + $('.joinColumn.day1 option:selected', baseEvent).text();
    text = text + ' ' + $('.aggregateOp.frame1 option:selected', baseEvent).text();
    text = text + ' ' + 'occurrence of Event ' + (eventLinkIdx+1); 
    text = text + ' ' + $('.occurs.occOp option:selected', baseEvent).text();
    text = text + ' ' + 'the ' + $('.joinColumn.day2 option:selected', baseEvent).text();
    text = text + ' ' + $('.aggregateOp.frame2 option:selected', baseEvent).text() + ' occurrence of Event ' + (eventLinkIdx+2);
    if($('.check1', baseEvent).prop('checked')){
        text = text + ' ' + 'by';
        text = text + ' ' + $('.op1 option:selected', baseEvent).text();
        if ($('.incInt1', baseEvent).val().length === 0){
            text = text + ' ' + '0'; 
        } else{
            text = text + ' ' + $('.incInt1', baseEvent).val();
        }        
        text = text + ' ' + $('.time1 option:selected', baseEvent).text();
    }
    if($('.check2', baseEvent).prop('checked')){
        text = text + ' ' + 'and';
        text = text + ' ' + $('.op2 option:selected', baseEvent).text();
        if ($('.incInt2', baseEvent).val().length === 0){
            text = text + ' ' + '0'; 
        } else{
            text = text + ' ' + $('.incInt2', baseEvent).val();
        }        
        text = text + ' ' + $('.time2 option:selected', baseEvent).text();
    }
    
    i2b2.CRC.view.QT.updateExpanderText(text, baseEvent);
   
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateExpanderText= function(text, baseEvent){  
    $('.EventAccordion > button', baseEvent).text(text);
}
// ================================================================================================== //
i2b2.CRC.view.QT.attachSequenceBarChevron= function(){  
    $('.DateRelationship.collapse.show').each(function(){
        $(this).parent().find(".EventAccordion button").addClass("expanded");
    });
    
    $('.DateRelationship.collapse').on('shown.bs.collapse', function(){
        $(this).parent().find(".EventAccordion button").addClass("expanded");
    }).on('hidden.bs.collapse', function(){
        $(this).parent().find(".EventAccordion button").removeClass("expanded");
    });
}
// ================================================================================================== //

i2b2.CRC.view.QT.toggleTimeSpan = function(elem) {
    let timeSpanElem = $(elem).parents(".timeSpan").find(".timeSpanField");
    let curState =  timeSpanElem.prop( "disabled");
    timeSpanElem.prop( "disabled", !curState);

    let timeSpanIdx = $(elem).parents(".timeSpan").data("timeSpanIdx");
    let eventLinkIdx = $(elem).parents('.eventLink').first().data('eventLinkIdx');
    let queryGroupIdx = $(elem).parents('.QueryGroup').first().data("queryGroup");

    if(!$(elem).is("checked")) {
        let parent = $(elem).parents(".timeSpan");
        i2b2.CRC.model.query.groups[queryGroupIdx].eventLinks[eventLinkIdx].timeSpans[timeSpanIdx] = {
            operator: "GREATEREQUAL",
            unit: "DAY"
        }
        parent.find(".timeSpanOp").val("GREATEREQUAL");
        parent.find(".timeSpanUnit").val("DAY");
        parent.find(".timeSpanValue").val("");
        parent.find(".timeSpanValue").removeClass("required");
        parent.find(".timeSpanError").addClass("vhidden");
    }
    
    $(timeSpanElem).on('focus', function() {
        let $this = $(this);
        $this.removeClass("required");
        $this.siblings(".timeSpanError").addClass("vhidden");
        
    });

    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //
i2b2.CRC.view.QT.extractTimeSpanFromElem = function(elem) {
    let timeSpanIdx = $(elem).parents(".timeSpan").data("timeSpanIdx");
    let eventLinkIdx = $(elem).parents('.eventLink').first().data('eventLinkIdx');
    let queryGroupIdx = $(elem).parents('.QueryGroup').first().data("queryGroup");

    let timeSpan = i2b2.CRC.model.query.groups[queryGroupIdx].eventLinks[eventLinkIdx].timeSpans[timeSpanIdx];
    return timeSpan;
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateTimeSpanOperator = function(elem) {
    let timeSpan = i2b2.CRC.view.QT.extractTimeSpanFromElem(elem);
    timeSpan.operator = $(elem).val();
    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateTimeSpanValue = function(elem) {
    let timeSpan = i2b2.CRC.view.QT.extractTimeSpanFromElem(elem);
    timeSpan.value = $(elem).val();
    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //
i2b2.CRC.view.QT.updateTimeSpanUnit = function(elem) {
    let timeSpan = i2b2.CRC.view.QT.extractTimeSpanFromElem(elem);
    timeSpan.unit = $(elem).val();
    i2b2.CRC.view.QT.generateSequenceBarText(elem);
    i2b2.CRC.view.QueryMgr.clearStatus();
};


// ================================================================================================== //
i2b2.CRC.view.QT.termActionInfo = function(evt) {
    let conceptIdx = $(evt.target).closest('.concept').data('conceptIndex');
    let eventIdx = $(evt.target).closest('.event').data('eventidx');
    let queryGroupIdx = $(evt.target).closest('.QueryGroup').data("queryGroup");
    i2b2.ONT.view.info.load(i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx].concepts[conceptIdx], true);
};
// ================================================================================================== //
i2b2.CRC.view.QT.termActionDelete = function(evt) {
    let conceptIdx = $(evt.target).closest('.concept').data('conceptIndex');
    let eventIdx = $(evt.target).closest('.event').data('eventidx');
    let queryGroupIdx = $(evt.target).closest('.QueryGroup').data("queryGroup");

    // TODO: break this into the query controller file
    i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx].concepts.splice(conceptIdx, 1);
    // re-render the concept list
    i2b2.CRC.view.QT.renderTermList(i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx], $(evt.target).closest('.TermList'));
    // update the query name
    i2b2.CRC.view.QT.updateQueryName();
    //clear any existing query results;
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //
i2b2.CRC.view.QT.termActionDateConstraint = function(evt) {
    let conceptIdx = $(evt.target).closest('.concept').data('conceptIndex');
    let eventIdx = $(evt.target).closest('.event').data('eventidx');
    let queryGroupIdx = $(evt.target).closest('.QueryGroup').data("queryGroup");
    let sdx = i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx].concepts[conceptIdx];
    let callbackFunc = function(){
        let temp = $(evt.target).closest(".event");
        let cncptListEl = $('.TermList', temp[0]);
        let eventData = i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx];
        i2b2.CRC.view.QT.renderTermList(eventData, cncptListEl);
    }
    i2b2.CRC.view.QT.addConceptDateConstraint(sdx, callbackFunc);
};
// ================================================================================================== //
i2b2.CRC.view.QT.termActionModifier = function(evt) {
    let conceptIdx = $(evt.target).closest('.concept').data('conceptIndex');
    let eventIdx = $(evt.target).closest('.event').data('eventidx');
    let queryGroupIdx = $(evt.target).closest('.QueryGroup').data("queryGroup");
    let sdx = i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx].concepts[conceptIdx];

    const valueMetaDataArr = i2b2.h.XPath(sdx.origData.xmlOrig, "metadataxml/ValueMetadata[string-length(Version)>0]");
    i2b2.CRC.view.QT.labValue.showLabValues(sdx, valueMetaDataArr[0], queryGroupIdx, eventIdx);
};
// ================================================================================================== //
i2b2.CRC.view.QT.termActionTree = function(evt) {
    let conceptIdx = $(evt.target).closest('.concept').data('conceptIndex');
    let eventIdx = $(evt.target).closest('.event').data('eventidx');
    let queryGroupIdx = $(evt.target).closest('.QueryGroup').data("queryGroup");
    let sdx = i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx].concepts[conceptIdx];

    // load the node into the ONT search system
    i2b2.ONT.view.nav.viewInTreeFromId(sdx);
};



// ================================================================================================== //
i2b2.CRC.view.QT.addConceptDateConstraint = function(sdx, callbackFunc) {
    if ($('body #termDateConstraintModal').length === 0) {
        $('body').append("<div id='termDateConstraintModal'/>");
    }
    let termDateConstraint = $("#termDateConstraintModal").empty();

    let dateStart = '';
    let dateEnd = '';
    if(sdx.dateRange !== undefined){
        if(sdx.dateRange.start !== undefined){
            dateStart = sdx.dateRange.start;
        }
        if(sdx.dateRange.end !== undefined){
            dateEnd = sdx.dateRange.end;
        }
    }

    let data = {
        concept: sdx.sdxInfo.sdxDisplayName,
        dateStart: dateStart,
        dateEnd: dateEnd
    };
    $(i2b2.CRC.view.QT.template.dateConstraint(data)).appendTo(termDateConstraint);


    $('#termDateConstraintModal button.i2b2-save').on('click', (evt) => {
        let startDateStr = $("#termDateConstraintModal .DateStart").val();
        let endDateStr = $("#termDateConstraintModal .DateEnd").val();

        let isStartDateValid = i2b2.CRC.view.QT.isValidDate(startDateStr);
        let isEndDateValid =  i2b2.CRC.view.QT.isValidDate(endDateStr);

        if ((startDateStr.length === 0 || isStartDateValid) && (endDateStr.length === 0 || isEndDateValid)) {
            let dateRange = sdx.dateRange;
            if (dateRange === undefined) {
                dateRange = {};
            }

            dateRange.start = startDateStr;
            dateRange.end = endDateStr;

            sdx.dateRange = dateRange;
            $('#termDateConstraintModal div:eq(0)').modal('hide');

            // clear eny existing query results
            i2b2.CRC.view.QueryMgr.clearStatus();

            callbackFunc();
        }
    });

    $("#termDateConstraintModal .DateStart").datepicker({
        uiLibrary: 'bootstrap4',
        change: function() {
            let startDateElem = $("#termDateConstraintModal .DateStart");
            let endDateElem = $("#termDateConstraintModal .DateEnd");
            let startDate =  startDateElem.val();
            let endDate =  endDateElem.val();

            let isDateValid = i2b2.CRC.view.QT.isValidDate(startDate);

            startDate = new Date(startDate);
            endDate = new Date(endDate);

            if(startDate > endDate){
                endDateElem.datepicker().value("");
            }

            if(!startDate){
                $("#termDateConstraintModal .startDateError").hide();
            } else{
                !isDateValid ? $("#termDateConstraintModal .startDateError").show() : $("#termDateConstraintModal .startDateError").hide();
            }            
        }
    }).on("keyup", function(evt){
        if(evt.keyCode === 13){
            $(this).datepicker().close();
        }else{
            let date = $(this).val().trim();
            let isValidDate = i2b2.CRC.view.QT.isValidDate(date);

            if(isValidDate){
                $(this).datepicker().open();
                $("#i2b2QueryHistoryBar .dateError").hide();
            }else{
                $("#i2b2QueryHistoryBar .dateError").show();
                $(this).datepicker().close();
            }
        }
    });

    $("#termDateConstraintModal .DateEnd").datepicker({
        uiLibrary: 'bootstrap4',
        change: function() {
            let startDateElem = $("#termDateConstraintModal .DateStart");
            let endDateElem = $("#termDateConstraintModal .DateEnd");
            let startDate =  startDateElem.val();
            let endDate =  endDateElem.val();

            let isDateValid = i2b2.CRC.view.QT.isValidDate(endDate); //startDate.isValid();

            startDate = new Date(startDate);
            endDate = new Date(endDate);

            if(startDateElem.val() && startDate > endDate){
                startDateElem.datepicker().value("");
                $("#termDateConstraintModal .startDateError").hide();
            }

            if(!endDate){
                $("#termDateConstraintModal .endDateError").hide();
            } else{
                !isDateValid ? $("#termDateConstraintModal .endDateError").show() : $("#termDateConstraintModal .endDateError").hide();
            }
        }
    }).on("keyup", function(evt){
        if(evt.keyCode === 13){
            $(this).datepicker().close();
        }else{
            let date = $(this).val().trim();
            let isValidDate = i2b2.CRC.view.QT.isValidDate(date);

            if(isValidDate){
                $(this).datepicker().open();
                $("#i2b2QueryHistoryBar .dateError").hide();
            }else{
                $("#i2b2QueryHistoryBar .dateError").show();
                $(this).datepicker().close();
            }
        }
    });

    $("#termDateConstraintModal div:eq(0)").modal('show');

    $('.DateStart, .DateEnd').on('focus', function() {
        let $this = $(this);
        let $error = $this.hasClass('DateStart') ? $("#termDateConstraintModal .startDateError") : $("#termDateConstraintModal .endDateError");
        $error.hide();
      });
}
// ================================================================================================== //
i2b2.CRC.view.QT.renderTermList = function(data, targetEl) {
    // rerender the query event and add to the DOM
    $(targetEl).empty();
    $(i2b2.CRC.view.QT.template.qgcl(data)).appendTo(targetEl);
    // clear the first "or" in the term list
    $('.termOr:first', targetEl).text("");
    // add event listeners for term options functionality
    $('.concept .actions .editLabValue', targetEl).on('click', i2b2.CRC.view.QT.labValue.editLabValue);
    $('.concept .actions .info', targetEl).on('click', i2b2.CRC.view.QT.termActionInfo);
    $('.concept .actions .tree', targetEl).on('click', i2b2.CRC.view.QT.termActionTree);
    $('.concept .actions .delete', targetEl).on('click', i2b2.CRC.view.QT.termActionDelete);
    $('.concept .actions .dateConstraint', targetEl).on('click', i2b2.CRC.view.QT.termActionDateConstraint);
    $('.concept .actions .modifier', targetEl).on('click', i2b2.CRC.view.QT.termActionModifier);
    i2b2.CRC.view.QT.enableWhenIfAvail();
};


// ================================================================================================== //
i2b2.CRC.view.QT.deleteQueryGroup = function(event) {
    // TODO: this belongs in the query tool controller
    let qgRoot = $(event.target).closest(".QueryGroup");
    let qgIndex = qgRoot.data("queryGroup");
    // retag the higher query groups' indexes
    $(".QueryGroup").each((idx, el) => {
        let tmpEl = $(el);
        let tmpIdx = tmpEl.data("queryGroup");
        if (tmpIdx > qgIndex) tmpEl.data("queryGroup", tmpIdx - 1);
    });
    // delete the DOM element
    qgRoot.remove();
    // delete the entry from the data model
    i2b2.CRC.model.query.groups.splice(qgIndex, 1);
    // update the query name
    i2b2.CRC.view.QT.updateQueryName();
    // correct the query group titles so first one says "Find Patients"
    i2b2.CRC.view.QT._correctQgTitles();

    //clear any existing query results;
    i2b2.CRC.view.QueryMgr.clearStatus();
    i2b2.CRC.view.QT.enableWhenIfAvail();
};


// ================================================================================================== //
i2b2.CRC.view.QT.eventActionDelete = function(evt) {
    let elem = evt.currentTarget;
    let eventIdx = $(elem).parents('.event').first().data("eventidx");
    let qgEl = $(elem).parents('.QueryGroup').first();
    let queryGroupIdx = qgEl.data("queryGroup");

    if (i2b2.CRC.model.query.groups.length > 0 && i2b2.CRC.model.query.groups[queryGroupIdx]?.events.length > 2) {
        let eventIdxNum = eventIdx+1
        //if this is the last event remove the eventLink that appears before it the UI
        if(eventIdxNum !== i2b2.CRC.model.query.groups[queryGroupIdx].events.length) {
            i2b2.CRC.model.query.groups[queryGroupIdx].eventLinks.splice(eventIdx,1);
        }else{
            //remove the eventLink that appears after the event in the UI
            i2b2.CRC.model.query.groups[queryGroupIdx].eventLinks.splice(eventIdx-1,1);
        }

        // delete the data elements
        i2b2.CRC.model.query.groups[queryGroupIdx].events.splice(eventIdx,1);

        // rerender the Query Tool
        i2b2.CRC.view.QT.render();
        i2b2.CRC.view.QueryMgr.clearStatus();
    }
}
// ================================================================================================== //
i2b2.CRC.view.QT.HoverOver = function(el) { $(el).closest(".i2b2DropTarget").addClass("DropHover"); };
i2b2.CRC.view.QT.HoverOut = function(el) { $(el).closest(".i2b2DropTarget").removeClass("DropHover"); };

// ================================================================================================== //
i2b2.CRC.view.QT.addNewQueryGroup = function(sdxList, metadata){
    // append the new query group to the data model
    let newGroup = {
        display: "with",
        with: true,
        without: false,
        when:false,
        timing: "ANY",
        eventLinks: [],
        events: []
    };
    // we must always have a minimum of 2 events and 1 eventLink to render correctly
    newGroup.events.push(i2b2.CRC.view.QT.createEvent());
    newGroup.events.push(i2b2.CRC.view.QT.createEvent());
    newGroup.eventLinks = [i2b2.CRC.view.QT.createEventLink()];

    i2b2.CRC.model.query.groups.push(newGroup);

    // insert the new concept into the record
    let qgIdx = i2b2.CRC.model.query.groups.length - 1;
    let eventIdx = 0;

    let showLabValues = metadata !== undefined ? metadata.showLabValues : false;
    sdxList.forEach((sdx) => {
        i2b2.CRC.view.QT.addConcept(sdx, qgIdx, eventIdx, showLabValues);
    });

    // set additional query group metadata if specified
    if(metadata) {
        let queryGroup = i2b2.CRC.model.query.groups[qgIdx];

        if(metadata.without !== undefined){
            queryGroup.without = metadata.without;
            queryGroup.with = !metadata.without;
            queryGroup.display = queryGroup.with ? "with": "without";
        }

        if(metadata.instances !== undefined){
            queryGroup.events[eventIdx].instances = metadata.instances;
        }

        if(metadata.startDate !== undefined){
            queryGroup.events[eventIdx].dateRange.start = metadata.startDate;
        }

        if(metadata.endDate !== undefined){
            queryGroup.events[eventIdx].dateRange.end = metadata.endDate;
        }

        if(metadata.when === true){
            queryGroup.when = true;
            queryGroup.with = false;
            queryGroup.without = false;
            queryGroup.display = "when";
        }

        if(metadata.timing !== undefined) {
            queryGroup.timing = metadata.timing;
        }
    }

    return qgIdx;
}
// ================================================================================================== //
//
i2b2.CRC.view.QT.handleWRKFolderDrop = function(sdxData, dropHandlerCallback) {
    var scopedCallback = new i2b2_scopedCallback();
    scopedCallback.callback = function(results) {
        if (results.error){
            console.log("ERROR: Unable to retrieve workplace folder contents", results.msgResponse);
        } else {
            let nlst = i2b2.h.XPath(results.refXML, "//folder[name and share_id and index and visual_attributes]");
            for (let i = 0; i < nlst.length; i++) {

                if (i2b2.h.getXNodeVal(nlst[i], "work_xml_i2b2_type") === 'FOLDER') {

                    let wrkFolder = nlst[i];
                    let nodeData = {};
                    nodeData.xmlOrig = wrkFolder.outerHTML;
                    nodeData.index = i2b2.h.getXNodeVal(wrkFolder, "index");
                    nodeData.key = nodeData.index;
                    nodeData.name = i2b2.h.getXNodeVal(wrkFolder, "folder/name");
                    nodeData.annotation = i2b2.h.getXNodeVal(wrkFolder, "tooltip");
                    nodeData.share_id = i2b2.h.getXNodeVal(wrkFolder, "share_id");
                    nodeData.visual = String(i2b2.h.getXNodeVal(wrkFolder, "visual_attributes")).trim();
                    nodeData.encapType = i2b2.h.getXNodeVal(wrkFolder, "work_xml_i2b2_type");
                    nodeData.isRoot = false;

                    let newSdxData = i2b2.WORK.view.main._generateTvNode(nodeData.name, nodeData);
                    newSdxData = newSdxData.i2b2;
                    i2b2.CRC.view.QT.handleWRKFolderDrop(newSdxData, dropHandlerCallback);
                } else {

                    let work_xml= i2b2.h.XPath(nlst[i], "work_xml");
                    for (let j=0; j < work_xml.length; j++) {
                        let folderItem = nlst[i];

                        let nodeData = {};
                        nodeData.xmlOrig = folderItem.outerHTML;
                        nodeData.index = i2b2.h.getXNodeVal(folderItem, "index");
                        nodeData.key = nodeData.index;
                        nodeData.name = i2b2.h.getXNodeVal(folderItem, "folder/name");
                        nodeData.annotation = i2b2.h.getXNodeVal(folderItem, "tooltip");
                        nodeData.share_id = i2b2.h.getXNodeVal(folderItem, "share_id");
                        nodeData.visual = String(i2b2.h.getXNodeVal(folderItem, "visual_attributes")).trim();
                        nodeData.encapType = i2b2.h.getXNodeVal(folderItem, "work_xml_i2b2_type");
                        nodeData.isRoot = false;

                        let newSdxData = i2b2.WORK.view.main._generateTvNode(nodeData.name, nodeData);
                        newSdxData = newSdxData.i2b2;
                        newSdxData.origData = newSdxData.sdxUnderlyingPackage.origData;
                        newSdxData.sdxInfo = newSdxData.sdxUnderlyingPackage.sdxInfo;
                        newSdxData.renderData = i2b2.sdx.Master.RenderData(newSdxData);
                        dropHandlerCallback(newSdxData);
                    }
                }
            }
        }
    }
    let varInput = {
        parent_key_value: sdxData.sdxInfo.sdxKeyValue,
        result_wait_time: 180
    };

    i2b2.WORK.ajax.getChildren("WORK:Workplace", varInput, scopedCallback );
}
// ================================================================================================== //
i2b2.CRC.view.QT.adjustRenderData = function(sdx) {
    if (sdx.sdxInfo.sdxType === "PR") {
        let renderOptions = {};
        let title = sdx.sdxInfo.sdxDisplayName ? sdx.sdxInfo.sdxDisplayName : sdx.renderData?.title;
        if (!title) title = sdx.sdxInfo.sdxKeyValue;
        let subsetPos = title.indexOf(" [");
        title = subsetPos === -1 ? title : "PATIENT:HIVE:" + title.substring(0, subsetPos);
        title = i2b2.h.Escape(title);
        renderOptions.title = title;
        sdx.renderData = i2b2.sdx.Master.RenderData(sdx, renderOptions);
    }
};
// ================================================================================================== //
i2b2.CRC.view.QT.DropHandler = function(sdx, evt){
    let qgIndex = $(evt.target).closest(".QueryGroup").data("queryGroup");
    let eventIdx = $(evt.target).closest(".event").data('eventidx');

    // remove the hover and drop target fix classes
    $(evt.target).closest(".i2b2DropTarget").removeClass("DropHover");
    $(evt.target).closest(".i2b2DropTarget").removeClass("i2b2DropPrep");

    // check if this is a WRK folder
    if (sdx.sdxInfo.sdxType === "WRK" && sdx.sdxUnderlyingPackage === undefined) {
        let eventHandlers = {};
        eventHandlers = $(evt.target).data("i2b2DragdropEvents");
        i2b2.CRC.view.QT.handleWRKFolderDrop(sdx, function(sdx) {
            if (typeof eventHandlers[sdx.sdxInfo.sdxType]?.DropHandler === "function") {
                sdx.origData.synonym_cd = i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'synonym_cd');
                sdx.origData.total_num= i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'totalnum');
                // do any changes needed on the render of the item
                i2b2.CRC.view.QT.adjustRenderData(sdx);
                i2b2.CRC.view.QT.addConcept(sdx, qgIndex, eventIdx, false);
                i2b2.CRC.view.QT.handleConceptValidation();
            }
        });
    } else {
        // use the underlying package data for workplace items
        if (sdx.sdxInfo.sdxType === "WRK" && sdx.sdxUnderlyingPackage !== undefined) {
            // but only if the underlying package is an acceptable type
            if (!i2b2.CRC.view.QT.allowedDropTypes.includes(sdx.sdxUnderlyingPackage.sdxInfo.sdxType)) return false;
            sdx.origData = sdx.sdxUnderlyingPackage.origData;
            sdx.origData.synonym_cd = i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'synonym_cd');
            sdx.origData.total_num= i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'totalnum');
            sdx.sdxInfo = sdx.sdxUnderlyingPackage.sdxInfo;
        }

        //do any changes needed on the render of the item
        i2b2.CRC.view.QT.adjustRenderData(sdx);

        // abort if "PR" record is actually an individual encounter record
        if (sdx.origData.event_id) return;

        // do any changes needed on the render of the item
        i2b2.CRC.view.QT.adjustRenderData(sdx);

        i2b2.CRC.view.QT.addConcept(sdx, qgIndex, eventIdx, true);

        // show or hide validation messages
        i2b2.CRC.view.QT.handleConceptValidation();
    }
};
// ================================================================================================== //
i2b2.CRC.view.QT.NewDropHandler = function(sdx, evt){
    // remove the hover and drop target fix classes
    $(evt.target).closest(".i2b2DropTarget").removeClass("DropHover");
    $(evt.target).closest(".i2b2DropTarget").removeClass("i2b2DropPrep");

    // check if this is a WRK folder
    if (sdx.sdxInfo.sdxType === "WRK" && sdx.sdxUnderlyingPackage === undefined) {
        let eventHandlers = {};
        eventHandlers = $(evt.target).data("i2b2DragdropEvents");

        // create and render a new query group first then add all WRK folder items
        let qgIdx = i2b2.CRC.view.QT.addNewQueryGroup([]);
        i2b2.CRC.view.QT.render();

        i2b2.CRC.view.QT.handleWRKFolderDrop(sdx, function(sdx) {
            if (typeof eventHandlers[sdx.sdxInfo.sdxType]?.DropHandler === "function") {
                sdx.origData.synonym_cd = i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'synonym_cd');
                sdx.origData.total_num= i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'totalnum');

                //do any changes needed on the render of the item
                i2b2.CRC.view.QT.adjustRenderData(sdx);
                i2b2.CRC.view.QT.addConcept(sdx, qgIdx, 0, false);
                i2b2.CRC.view.QT.handleConceptValidation();
            }
        });
    } else {
        //use the underlying package info for workplace items
        if (sdx.sdxInfo.sdxType === "WRK" && sdx.sdxUnderlyingPackage !== undefined) {
            // but only if the underlying package is an acceptable type
            if (!i2b2.CRC.view.QT.allowedDropTypes.includes(sdx.sdxUnderlyingPackage.sdxInfo.sdxType)) return false;

            sdx.origData = sdx.sdxUnderlyingPackage.origData;
            sdx.origData.synonym_cd = i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'synonym_cd');
            sdx.origData.total_num= i2b2.h.getXNodeVal(sdx.origData.xmlOrig,'totalnum');
            sdx.sdxInfo = sdx.sdxUnderlyingPackage.sdxInfo;
        }

        // abort if "PR" record is actually an individual encounter record<<
        if (sdx.origData.event_id) return;

        // add the item to the query
        i2b2.CRC.view.QT.addNewQueryGroup([sdx], {showLabValues: true});

        //do any changes needed on the render of the item
        i2b2.CRC.view.QT.adjustRenderData(sdx);

        // render the new query group (by re-rendering all the query groups)
        i2b2.CRC.view.QT.render();
    }
};

 // ================================================================================================== //
i2b2.CRC.view.QT.addConcept = function(sdx, groupIdx, eventIdx, showLabValues) {

    // mark if dates can be applied to this item
    sdx.withDates = false;
    if (["CONCPT"].includes(sdx.sdxInfo.sdxType)) sdx.withDates = true;
    if (String(sdx.origData.table_name).toLowerCase() === "patient_dimension") sdx.withDates = false;

    let eventData = i2b2.CRC.model.query.groups[groupIdx].events[eventIdx];

    // prevent duplicate adds - see if the term matches something in the existing concepts list
    // 4.26.23 - allow users to enter duplicates entries because this is how the legacy system works
    //           this should probably be modified to allow duplicates of items if they have lab values defined
    // temp = eventData.concepts.filter((term) => {
    //     if (term.sdxInfo.sdxKeyValue === sdx.sdxInfo.sdxKeyValue) {
    //         if (term.origData.conceptModified && sdx.origData.conceptModified) {
    //             return term.origData.conceptModified.sdxInfo.sdxKeyValue === sdx.origData.conceptModified.sdxInfo.sdxKeyValue;
    //         } else {
    //             return true;
    //         }
    //     } else {
    //         return false;
    //     }
    // });
    // if (temp.length !== 0) return;

    // not a duplicate, add to the event's term list
    eventData.concepts.push(sdx);

    //add date constraint to concept if there is a group date range specified{
    if (i2b2.CRC.model.query.groups[groupIdx].events[eventIdx].dateRange !== undefined &&
        (sdx.dateRange === undefined || (sdx.dateRange.start?.length === 0 && sdx.dateRange.end?.length === 0))) {
        // only include date range for specific SDX types
        if (sdx.withDates === true) {
            if (sdx.dateRange === undefined) sdx.dateRange = {start: "", end: ""};
            sdx.dateRange.start = i2b2.CRC.model.query.groups[groupIdx].events[eventIdx].dateRange.start;
            sdx.dateRange.end = i2b2.CRC.model.query.groups[groupIdx].events[eventIdx].dateRange.end;
        }
    }

    // Modifiers processing
    if (sdx.origData.conceptModified) {
        sdx.renderData.title = sdx.origData.conceptModified.renderData.title + " {" + sdx.origData.name + "}";
        if(sdx.origData.hasMetadata){
            if(showLabValues){
                i2b2.CRC.view.QT.showModifierValues(sdx,  groupIdx, eventIdx);
            }else{
                const valueMetaDataArr = i2b2.h.XPath(sdx.origData.xmlOrig, "metadataxml/ValueMetadata[string-length(Version)>0]");
                if (valueMetaDataArr.length > 0) {
                    try {
                        let GeneralValueType = i2b2.CRC.ctrlr.labValues.extractDataType(sdx, valueMetaDataArr[0]);

                        if (GeneralValueType && i2b2.CRC.view[GeneralValueType]
                            && typeof i2b2.CRC.view[GeneralValueType].parseMetadataXml === 'function'
                            && typeof i2b2.CRC.view[GeneralValueType].updateDisplayValue === 'function') {
                            let valueMetadataModel = i2b2.CRC.view[GeneralValueType].parseMetadataXml(valueMetaDataArr[0]);
                            i2b2.CRC.view[GeneralValueType].updateDisplayValue(sdx, valueMetadataModel);
                        } else
                            alert('An error has occurred while trying to determine the value type.');
                    } catch(e) {
                        alert('An error has occurred while trying to display the concept.');
                    }
                }
            }
        }
    } else {
        if (sdx.sdxInfo.sdxControlCell === "ONT") i2b2.CRC.view.QT.labValue.getAndShowLabValues(sdx, groupIdx, eventIdx, !showLabValues);
    }

    // rerender the query event and add to the DOM
    const targetTermList = $(".event[data-eventidx=" + eventIdx + "] .TermList", $(".CRC_QT_query .QueryGroup")[groupIdx]);
    i2b2.CRC.view.QT.renderTermList(eventData, targetTermList);

    // update the query name
    if (!i2b2.CRC.model.runner.isLoading) {
        i2b2.CRC.view.QT.updateQueryName();
        i2b2.CRC.view.QueryMgr.clearStatus();
    }
};
// ================================================================================================== //
i2b2.CRC.view.QT.showModifierValues = function(sdxConcept, groupIdx, eventIdx){
    const valueMetaDataArr = i2b2.h.XPath(sdxConcept.origData.xmlOrig, "metadataxml/ValueMetadata[string-length(Version)>0]");
    if (valueMetaDataArr.length > 0) {
        i2b2.CRC.view.QT.labValue.showLabValues(sdxConcept, valueMetaDataArr[0], groupIdx, eventIdx);
    }
}
// ================================================================================================== //
i2b2.CRC.view.QT.isValidDate = function(dateStr) {
    let dateVal = String(dateStr);
    return !(dateVal.match(/^[0|1][0-9]\/[0|1|2|3][0-9]\/[1|2][0-9][0-9][0-9]$/) === null && dateVal !== '');
}
// ================================================================================================== //
i2b2.CRC.view.QT.handleUpdateDateRangeEvent = function(event){
    let funcValidateDate = (event) => {
        let jqTarget = $(event.target);
        let errorFrameEl = $(jqTarget)[0].parentNode;

        let isValid = false;

        // display red box on error
        if (!i2b2.CRC.view.QT.isValidDate(jqTarget.val())) {
            $(errorFrameEl).css('border', 'solid');
        } else {
            $(errorFrameEl).css('border', '');
            isValid = true;
        }

        return isValid;
    };

    let jqTarget = $(event.target);
    let qgBody = jqTarget.closest(".QueryGroup");
    let qgIndex = qgBody.data("queryGroup");
    let qgData = i2b2.CRC.model.query.groups[qgIndex];
    let eventIdx = $(event.target).closest(".event").data("eventidx");
    if (qgData.events[eventIdx] === undefined) qgData.events[eventIdx] = i2b2.CRC.view.QT.createEvent();

    let isValidDate = funcValidateDate(event);
    if (isValidDate) {
        if (jqTarget.hasClass('DateStart') || jqTarget.hasClass('DateRangeStart')) {
            qgData.events[eventIdx].dateRange.start = event.target.value;
            // keep both Event 1 start date inputs synced
            if (eventIdx === 0) $('.DateStart, .event[data-eventidx=0] .DateRangeStart', qgBody).val(event.target.value);
        } else {
            qgData.events[eventIdx].dateRange.end = event.target.value;
            // keep both Event 1 end date inputs synced
            if (eventIdx === 0) $('.DateEnd, .event[data-eventidx=0] .DateRangeEnd', qgBody).val(event.target.value);
        }

        if (qgData.events[eventIdx].concepts && qgData.events[eventIdx].concepts.length > 0) {
            qgData.events[eventIdx].concepts.forEach(concept => {
                // only include date range for specific SDX types
                if (concept.withDates) {
                    if (concept.dateRange === undefined) concept.dateRange = {
                        "start": "",
                        "end": ""
                    };
                    concept.dateRange.start = qgData.events[eventIdx].dateRange.start;
                    concept.dateRange.end = qgData.events[eventIdx].dateRange.end;
                }
            });

            let temp = jqTarget.closest(".event");
            let cncptListEl = $('.TermList', temp[0]);
            let eventData = i2b2.CRC.model.query.groups[qgIndex].events[eventIdx];
            i2b2.CRC.view.QT.renderTermList(eventData, cncptListEl);
        }
    }
    i2b2.CRC.view.QueryMgr.clearStatus();
};
// ================================================================================================== //

i2b2.CRC.view.QT.unLinkQueryGroup = function(elem) {
    let queryGroupElem = $(elem).parents(".QueryGroup");
    let queryGroupIdx = queryGroupElem.data("queryGroup");

    i2b2.CRC.model.query.groups[queryGroupIdx].timing = "ANY";

    queryGroupElem.find(".unLink").hide();
    queryGroupElem.find(".instLink").hide();
    queryGroupElem.find(".encLink").hide();
    queryGroupElem.find(".noLink").show();
    queryGroupElem.find(".linkOptionsItem").removeClass("active");
};
// ================================================================================================== //

i2b2.CRC.view.QT.linkAsSameEncounter = function(elem) {
    let queryGroupElem = $(elem).parents(".QueryGroup").first();
    let queryGroupIdx = queryGroupElem.data("queryGroup");

    i2b2.CRC.model.query.groups[queryGroupIdx].timing = "SAMEVISIT";

    queryGroupElem.find(".noLink").hide();
    queryGroupElem.find(".instLink").hide();
    queryGroupElem.find(".unLink").show();
    queryGroupElem.find(".encLink").show();
    queryGroupElem.find(".linkOptionsItem").removeClass("active");
    queryGroupElem.find(".sameEnc").addClass("active");
};

// ================================================================================================== //

i2b2.CRC.view.QT.linkAsSameInstance = function(elem) {
    let queryGroupElem = $(elem).parents(".QueryGroup").first();
    let queryGroupIdx = queryGroupElem.data("queryGroup");

    i2b2.CRC.model.query.groups[queryGroupIdx].timing = "SAMEINSTANCENUM";

    queryGroupElem.find(".noLink").hide();
    queryGroupElem.find(".encLink").hide();
    queryGroupElem.find(".unLink").show();
    queryGroupElem.find(".instLink").show();
    queryGroupElem.find(".linkOptionsItem").removeClass("active");
    queryGroupElem.find(".sameInst").addClass("active");
};
// ================================================================================================== //
i2b2.CRC.view.QT.render = function() {
    // render HTML based on "i2b2.CRC.model.query" data

    $(i2b2.CRC.view.QT.containerDiv).empty();

    // first render the main query groups
    for (let qgnum = 0; qgnum < i2b2.CRC.model.query.groups.length; qgnum++) {
        let qgData = i2b2.CRC.model.query.groups[qgnum];
        // Done in handlebars template:
        // - populate Instances number
        // - Populate dates -> StartDate & DateRange1Start (synced existence)
        // - Populate dates -> EndDate & DateRange1End (synced existence)
        // - Populate dates -> DateRange2Start
        // - Populate dates -> DateRange2End
        // - populate when "occurs before" / "occurs at least"
        // - populate when "the first" / "any"
        // - populate when "day" / "month" / "year"
        let newQG = $(i2b2.CRC.view.QT.template.qg(i2b2.CRC.model.query.groups[qgnum])).appendTo(i2b2.CRC.view.QT.containerDiv);
        // set the query group index data
        newQG.data('queryGroup', qgnum);

        // set the query group style
        switch (qgData.display) {
            case "with":
                newQG.addClass("with");
                break;
            case "without":
                newQG.addClass("without");
                break;
            case "when":
                newQG.addClass("when");
                break;
        }

        // Change first query group title to display "Find Patients"
        if (qgnum === 0) $(".JoinText", newQG).text("Find Patients");

        // populate the concept list for events
        let eventDivs = $('.event .TermList', newQG[0]);
        qgData.events.forEach((event,idx) => {
            i2b2.CRC.view.QT.renderTermList(event, eventDivs[idx]);
        });

        // hide the delete event buttons if only 1-2 events exist
        if (i2b2.CRC.model.query.groups[qgnum].events.length <= 2) {
            $('.EventLbl .actions .delete', newQG).hide();
        } else {
            $('.EventLbl .actions .delete', newQG).show();
        }

        // attach the date picker functionality
        $('.datepicker', newQG).toArray().forEach((el) => {
            $(el).datepicker({
                uiLibrary: 'bootstrap4',
                keyboardNavigation: false,
                change: function (event) {
                    i2b2.CRC.view.QT.handleUpdateDateRangeEvent(event);
                }
            });
            $(el).on("keyup", function(evt){
                if(evt.keyCode === 13){
                    $(this).datepicker().close();
                }else {
                    let date = $(this).val().trim();
                    let isValidDate = i2b2.CRC.view.QT.isValidDate(date);
                    let errorFrameEl = $(this)[0].parentNode;

                    if(isValidDate){
                        $(this).datepicker().open();
                        $(errorFrameEl).css('border', '');
                    }else{
                        $(errorFrameEl).css('border', 'solid');
                        $(this).datepicker().close();
                    }
                }
            })
        });

        // attach the i2b2 SDX handlers for each code... on both event1 and event2 containers
        i2b2.CRC.view.QT.allowedDropTypes.forEach((sdxCode) => {
            $(".event", newQG).toArray().forEach((dropTarget) => {
                i2b2.sdx.Master.AttachType(dropTarget, sdxCode);
                i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxCode, "DropHandler", i2b2.CRC.view.QT.DropHandler);
                i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxCode, "onHoverOver", i2b2.CRC.view.QT.HoverOver);
                i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxCode, "onHoverOut", i2b2.CRC.view.QT.HoverOut);
            });
        });
    }

    // unhide the first event in all the query groups
    $('.event[data-eventidx="0"]').removeClass('toHide');

    // attach the event listeners
    // -----------------------------------------
    // Top bar events (with / without / when)
    $('.QueryGroup .topbar .with', i2b2.CRC.view.QT.containerDiv).on('click', (event) => {
        // change the CSS styling
        let qgRoot = $(event.target).closest(".QueryGroup");
        let qgIndex = qgRoot.data("queryGroup");

        if(qgRoot.hasClass("when")){
            i2b2.CRC.model.query.groups[qgIndex].timing = "ANY";
            qgRoot.find('.unLink').click();
        }

        qgRoot.removeClass(['without', 'when']);
        qgRoot.addClass("with");

        // modify the model
        i2b2.CRC.model.query.groups[qgIndex].display = "with";
        i2b2.CRC.model.query.groups[qgIndex].with = true;
        i2b2.CRC.model.query.groups[qgIndex].without = false;
        i2b2.CRC.model.query.groups[qgIndex].when = false;

        // handle purging of eventLinks
        i2b2.CRC.model.query.groups[qgIndex].eventLinks = [i2b2.CRC.view.QT.createEventLink()];
        // handle purging of events
        i2b2.CRC.model.query.groups[qgIndex].events = [i2b2.CRC.model.query.groups[qgIndex].events[0], i2b2.CRC.view.QT.createEvent()];

        // DYNAMIC MODIFICATIONS OF THE HTML FOR DELETING OF EVENTS OVER event[0]
        $('.event[data-eventidx!="0"] .TermList', qgRoot).empty();
        $('.event', qgRoot).each(function( index ) {
            if(index > 1){
                $(this).remove();
            }
        });
        $('.eventLink', qgRoot).each(function( index ) {
            if(index >= 1){
                $(this).remove();
            }
            else{
                $(this).find("select").find('option:first').prop('selected',true);
                $(this).find( "input:checked").click();
            }
        });
        // Clear out the HTML date fields
        $('.event[data-eventidx!="0"] .datepicker').val('');
        i2b2.CRC.view.QT.enableWhenIfAvail();
        i2b2.CRC.view.QueryMgr.clearStatus();
    });
    $('.QueryGroup .topbar .without', i2b2.CRC.view.QT.containerDiv).on('click', (event) => {
        // change the CSS styling
        let qgRoot = $(event.target).closest(".QueryGroup");
        let qgIndex = qgRoot.data("queryGroup");

        if(qgRoot.hasClass("when")){
            i2b2.CRC.model.query.groups[qgIndex].timing = "ANY";
            qgRoot.find('.unLink').click();
        }
        qgRoot.removeClass(['with', 'when']);
        qgRoot.addClass("without");

        // modify the model
        i2b2.CRC.model.query.groups[qgIndex].display = "without";
        i2b2.CRC.model.query.groups[qgIndex].with = false;
        i2b2.CRC.model.query.groups[qgIndex].without = true;
        i2b2.CRC.model.query.groups[qgIndex].when = false;
        // handle purging of eventLinks
        i2b2.CRC.model.query.groups[qgIndex].eventLinks = [i2b2.CRC.view.QT.createEventLink()];
        // handle purging of events
        i2b2.CRC.model.query.groups[qgIndex].events = [i2b2.CRC.model.query.groups[qgIndex].events[0], i2b2.CRC.view.QT.createEvent()];

        // DYNAMIC MODIFICATIONS OF THE HTML FOR DELETING OF EVENTS OVER event[0]
        $('.event[data-eventidx!="0"] .TermList', qgRoot).empty();
        $('.event', qgRoot).each(function( index ) {
            if(index > 1){
                $(this).remove();
            }
        });
        $('.eventLink', qgRoot).each(function( index ) {
            if(index >= 1){
                $(this).remove();
            }
            else{
                $(this).find("select").find('option:first').prop('selected',true);
                $(this).find( "input:checked").click();
            }
        });
        // Clear out the HTML date fields
        $('.event[data-eventidx!="0"] .datepicker').val('');
        i2b2.CRC.view.QT.enableWhenIfAvail();
        i2b2.CRC.view.QueryMgr.clearStatus();
    });
    $('.QueryGroup .topbar .when', i2b2.CRC.view.QT.containerDiv).on('click', (event) => {
        if(!$(".whenItem").hasClass("disabled")) {
            let qgRoot = $(event.target).closest(".QueryGroup");

            // modify the model
            let qgIndex = qgRoot.data("queryGroup");
            i2b2.CRC.model.query.groups[qgIndex].display = "when";
            i2b2.CRC.model.query.groups[qgIndex].with = false;
            i2b2.CRC.model.query.groups[qgIndex].without = false;
            i2b2.CRC.model.query.groups[qgIndex].when = true;

            // change the CSS styling and display it
            qgRoot.removeClass(['without', 'with']);
            qgRoot.addClass("when");

            i2b2.CRC.view.QueryMgr.clearStatus();
            i2b2.CRC.view.QT.enableWhenIfAvail();
        }
    });
    // Query Group delete button
    $('.QueryGroup .topbar .qgclose i', i2b2.CRC.view.QT.containerDiv).on('click', i2b2.CRC.view.QT.deleteQueryGroup);

    // Query Events delete button
    $('.QueryGroup .event .actions i.delete', i2b2.CRC.view.QT.containerDiv).on('click', i2b2.CRC.view.QT.eventActionDelete);

    // TODO: Change Sequence Bar coding
    // Sequence bar events
    $('.QueryGroup .SequenceBar .occurs', i2b2.CRC.view.QT.containerDiv).on('change', (event) => {
        event.target.blur();
        // change the CSS styling
        let qgRoot = $(event.target).closest(".SequenceBar");
        qgRoot.removeClass(['occursBefore','occursAtLeast']);
        let setting = event.target.value;
        $(qgRoot).addClass(setting);
        // update data model
        let qgIndex = $(event.target).closest(".QueryGroup").data("queryGroup");
        let qgData = i2b2.CRC.model.query.groups[qgIndex];
        if (setting === "occursBefore") {
            qgData.when.occurs = "before";
        } else {
            qgData.when.occurs = "atleast";
        }
    });
    // TODO: Change Sequence Bar coding
    $('.QueryGroup .thefirstany', i2b2.CRC.view.QT.containerDiv).on('change', (event) => {
        event.target.blur();
        // match the selected value between the two controls in the QueryGroup
        let qgEl = $(event.target).closest(".QueryGroup");
        $('.thefirstany', qgEl).val(event.target.value);
        // update the data model
        let qgIndex = qgEl.data("queryGroup");
        i2b2.CRC.model.query.groups[qgIndex].when.firstany = event.target.value;
    });
    // TODO: Change Sequence Bar coding
    $('.QueryGroup .occursUnit', i2b2.CRC.view.QT.containerDiv).on('change', (event) => {
        event.target.blur();
        // match the selected value between the two controls in the QueryGroup
        let qgIndex = $(event.target).closest(".QueryGroup").data("queryGroup");
        i2b2.CRC.model.query.groups[qgIndex].when.occursUnit = event.target.value;
    });
    // TODO: Change Sequence Bar coding
    $('.QueryGroup .occursNumber', i2b2.CRC.view.QT.containerDiv).on('blur', (event) => {
        // parse (and if needed correct) the number value for days/months/years
        let qgIndex = $(event.target).closest(".QueryGroup").data("queryGroup");
        let correctedVal = 1;
        if (!isNaN(event.target.value)) {
            correctedVal = parseInt(event.target.value);
            if (correctedVal < 1) correctedVal = 1;
        }
        i2b2.CRC.model.query.groups[qgIndex].when.occursNum = correctedVal;
        event.target.value = correctedVal;
    });


    // date dropdowns and calendars
    $('.QueryGroup .DateOccursLbl', i2b2.CRC.view.QT.containerDiv).on('click', (event) => {
        // parse (and if needed correct) the number value for days/months/years
        let eventContainer = $(event.target).closest(".event");
        let body = $('.DateOccursBody', eventContainer);
        let icon = $(".DateOccursLbl i", eventContainer);
        if (body.hasClass('hidden')) {
            body.removeClass('hidden');
            //icon.prevObject.removeClass('bi-chevron-down');
            //icon.prevObject.addClass('bi-chevron-up');
            icon.removeClass('bi-chevron-down');
            icon.addClass('bi-chevron-up');
        } else {
            body.addClass('hidden');
            icon.removeClass('bi-chevron-up');
            icon.addClass('bi-chevron-down');
        }
        //init date constraint panel tooltip
        $(".dcTooltip").tooltip();
    });     

    $('.QueryGroup', i2b2.CRC.view.QT.containerDiv).on('click', '.DateRangeLbl', (event) => {
        // parse (and if needed correct) the number value for days/months/years
        let eventContainer = $(event.target).closest(".event");
        let body = $('.DateRangeBody', eventContainer);
        let icon = $(".DateRangeLbl i", eventContainer);
        if (body.hasClass('hidden')) {
            body.removeClass('hidden');
            icon.removeClass('bi-chevron-down');
            icon.addClass('bi-chevron-up');
        } else {
            body.addClass('hidden');
            icon.removeClass('bi-chevron-up');
            icon.addClass('bi-chevron-down');
        }
    });

    // handles chevron expand/collapse chevron animation on click and rerenders the expander text in the SequenceBar
    i2b2.CRC.view.QT.attachSequenceBarChevron();
    $('.SequenceBar.eventLink input.check1').each((idx, element) => i2b2.CRC.view.QT.generateSequenceBarText(element));
    $('.SequenceBar.eventLink input.check2').each((idx, element) => i2b2.CRC.view.QT.generateSequenceBarText(element));

    $('.QueryGroup .OccursCount', i2b2.CRC.view.QT.containerDiv).on('blur', (event) => {
        // parse (and if needed correct) the number value for days/months/years
        let qgIndex = $(event.target).closest(".QueryGroup").data("queryGroup");
        let correctedVal = 1;
        event.target.value = event.target.value.trim();
        let isEmpty = event.target.value === '';
        if (!isNaN(parseInt(event.target.value)) || isEmpty) {
            if (isEmpty) {
                correctedVal = 1;
            } else {
                correctedVal = parseInt(event.target.value);
                if (correctedVal < 1) correctedVal = 1;
            }
            i2b2.CRC.model.query.groups[qgIndex].events[0].instances = correctedVal;
            $(event.target).css('border','').val(correctedVal);
        } else {
            $(event.target).css('border','solid 2px red');
        }
    });

    $('body').on('click', '.refreshStartDate, .refreshEndDate', (event) => {
        let jqTarget = $(event.target);
        let dateElement = jqTarget.parents(".dateRange").find(".DateStart, .DateRangeStart");
        if (dateElement.length === 0) {
            dateElement = jqTarget.parents(".dateRange").find(".DateEnd, .DateRangeEnd");
        }
        dateElement.val("");
        dateElement.trigger("change");
    });

    $('body').on('click', '.refreshOcc', (event) => {
        let jqTarget = $(event.target);
        let occElement = jqTarget.parents(".conceptOcc").find(".OccursCount");
        occElement.val("").blur();
    });

    // append the final query group drop target
    let newQG = $(i2b2.CRC.view.QT.template.qgadd({})).appendTo(i2b2.CRC.view.QT.containerDiv);
    // fix query groups titles so that the first one always says "Find Patients"
    i2b2.CRC.view.QT._correctQgTitles();

    // wire drop handler to the final query group
    let dropTarget = $(".event .i2b2DropTarget", newQG);
    i2b2.CRC.view.QT.allowedDropTypes.forEach((sdxType) => {
        i2b2.sdx.Master.AttachType(dropTarget, sdxType);
        i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxType, "DropHandler", i2b2.CRC.view.QT.NewDropHandler);
        i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxType, "onHoverOver", i2b2.CRC.view.QT.HoverOver);
        i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxType, "onHoverOut", i2b2.CRC.view.QT.HoverOut);
    });
};
// ==================================================================================================
i2b2.CRC.view.QT.labValue = {};
// ==================================================================================================
i2b2.CRC.view.QT.labValue.editLabValue = function(evt) {
    let conceptIdx = $(evt.target).closest('.concept').data('conceptIndex');
    let eventIdx = $(evt.target).closest('.event').data('eventidx');
    let queryGroupIdx = $(evt.target).closest('.QueryGroup').data("queryGroup");
    let sdx = i2b2.CRC.model.query.groups[queryGroupIdx].events[eventIdx].concepts[conceptIdx];
    i2b2.CRC.view.QT.labValue.getAndShowLabValues(sdx, queryGroupIdx, eventIdx);
};
// ==================================================================================================
i2b2.CRC.view.QT.labValue.showLabValues = function(sdxConcept, valueMetadataXml, groupIdx, eventIdx, callback) {
    return new Promise((resolve, reject) => {
        if (eventIdx !== undefined && groupIdx !== undefined) {
            let eventData = i2b2.CRC.model.query.groups[groupIdx].events[eventIdx];
            const targetTermList = $(".event[data-eventidx=" + eventIdx + "] .TermList", $(".CRC_QT_query .QueryGroup")[groupIdx]);
            i2b2.CRC.view.QT.renderTermList(eventData, targetTermList);
        }

        //Determine the value type
        try {
            let GeneralValueType = i2b2.CRC.ctrlr.labValues.extractDataType(sdxConcept, valueMetadataXml);

            if (GeneralValueType && i2b2.CRC.view[GeneralValueType]
                && typeof i2b2.CRC.view[GeneralValueType].parseMetadataXml === 'function'
                && typeof i2b2.CRC.view[GeneralValueType].showDialog === 'function') {
                let valueMetadataModel = i2b2.CRC.view[GeneralValueType].parseMetadataXml(valueMetadataXml);
                i2b2.CRC.view[GeneralValueType].showDialog(sdxConcept, valueMetadataModel,
                    i2b2.CRC.ctrlr.labValues,
                    groupIdx,
                    eventIdx,
                    function(result){
                        resolve(result);
                    }
                );
            } else {
                reject();
                alert('An error has occurred while trying to determine the value type.');
            }
        } catch(e) {
            reject();
            alert('An error has occurred while trying to initialize the Valuebox.');
        }
    });
};

// ==================================================================================================
i2b2.CRC.view.QT.labValue.getAndShowLabValues = function(sdxConcept, groupIdx, eventIdx, doNotShowLabValues) {
    return new Promise((resolve, reject) => {
        i2b2.CRC.ctrlr.labValues.loadData(sdxConcept, function (valueMetadataXml) {
            if (doNotShowLabValues === undefined || !doNotShowLabValues) {
                i2b2.CRC.view.QT.labValue.showLabValues(sdxConcept, valueMetadataXml, groupIdx, eventIdx, function(result){
                      resolve(result);
                });
            } else {
                if (valueMetadataXml !== undefined) {
                    //Determine the value type
                    try {
                        let GeneralValueType = i2b2.CRC.ctrlr.labValues.extractDataType(sdxConcept, valueMetadataXml);

                        if (GeneralValueType && i2b2.CRC.view[GeneralValueType]
                            && typeof i2b2.CRC.view[GeneralValueType].parseMetadataXml === 'function'
                            && typeof i2b2.CRC.view[GeneralValueType].updateDisplayValue === 'function') {
                            let valueMetadataModel = i2b2.CRC.view[GeneralValueType].parseMetadataXml(valueMetadataXml);
                            i2b2.CRC.view[GeneralValueType].updateDisplayValue(sdxConcept, valueMetadataModel);

                            let eventData = i2b2.CRC.model.query.groups[groupIdx].events[eventIdx];
                            const targetTermList = $(".event[data-eventidx=" + eventIdx + "] .TermList", $(".CRC_QT_query .QueryGroup")[groupIdx]);
                            i2b2.CRC.view.QT.renderTermList(eventData, targetTermList);
                        } else {
                            reject();
                            alert('An error has occurred while trying to determine the value type.');
                        }
                    } catch (e) {
                        reject();
                        alert('An error has occurred while trying to display the concept.');
                    }
                }
                resolve(sdxConcept);
            }
        });
    });
};
// ================================================================================================== //
i2b2.CRC.view.QT.clearAll = function(){
    // only run if the query has entries
    if (i2b2.CRC.model.query.groups.length === 0) return;
    i2b2.CRC.ctrlr.QT.clearQuery();
    i2b2.CRC.view.QT.updateQueryName();
    i2b2.CRC.view.QT.render();
    i2b2.CRC.view.QueryMgr.clearStatus();
}

// ================================================================================================== //
i2b2.CRC.view.QT.addEvent = function(){
    let qgRoot = $(".QueryGroup.when");
    let qgIndex = qgRoot.data("queryGroup");
    let templateQueryGroup = $(".QueryGroup.when .content");
    let eventLinkData = {
        index: i2b2.CRC.model.query.groups[qgIndex].eventLinks.length
    }

    let eventData = {
        index: i2b2.CRC.model.query.groups[qgIndex].events.length
    }

    $((Handlebars.compile("{{> EventLink }}"))(eventLinkData)).appendTo(templateQueryGroup);
    $((Handlebars.compile("{{> Event }}"))(eventData)).appendTo(templateQueryGroup);
  

    i2b2.CRC.model.query.groups[qgIndex].eventLinks.push(i2b2.CRC.view.QT.createEventLink());
    i2b2.CRC.model.query.groups[qgIndex].events.push(i2b2.CRC.view.QT.createEvent());

    // handle delete event buttons
    if (i2b2.CRC.model.query.groups[qgIndex].events.length <= 2) {
        $('.EventLbl .actions .delete', qgRoot).hide();
    } else {
        $('.EventLbl .actions .delete', qgRoot).show();
    }

    // Rebind the Query Events delete buttons
    let deleteFunc = i2b2.CRC.view.QT.eventActionDelete;
    $('.EventLbl .actions .delete', qgRoot).unbind('click', deleteFunc);
    $('.EventLbl .actions .delete', qgRoot).on('click', deleteFunc);

    //add drag and drop handling
    i2b2.CRC.view.QT.allowedDropTypes.forEach((sdxCode) => {
        $(".event", templateQueryGroup).last().toArray().forEach((dropTarget) => {
            i2b2.sdx.Master.AttachType(dropTarget, sdxCode);
            i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxCode, "DropHandler", i2b2.CRC.view.QT.DropHandler);
            i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxCode, "onHoverOver", i2b2.CRC.view.QT.HoverOver);
            i2b2.sdx.Master.setHandlerCustom(dropTarget, sdxCode, "onHoverOut", i2b2.CRC.view.QT.HoverOut);
        });
    });

    // attach the date picker functionality
    $('.datepicker', templateQueryGroup).toArray().forEach((el) => {
        $(el).datepicker({
            uiLibrary: 'bootstrap4',
            change: function (event) {
                i2b2.CRC.view.QT.handleUpdateDateRangeEvent(event);
            }
        });
    });
    
    i2b2.CRC.view.QT.attachSequenceBarChevron();

    //scroll to newly added event
    qgRoot.find(".event").last().get(0).scrollIntoView({alignToTop:false, behavior: 'smooth', block: 'center' });

    i2b2.CRC.view.QueryMgr.clearStatus();
}

// ================================================================================================== //
i2b2.CRC.view.QT.showOptions = function() {
    let queryOptionsModal = $('body #queryOptionsModal');
    if (queryOptionsModal.length === 0) {
        queryOptionsModal = $("<div id='queryOptionsModal'/>").appendTo("body");
        queryOptionsModal.load('js-i2b2/cells/CRC/assets/modalOptionsQT.html', function () {
            $("body #queryOptionsModal button.options-save").click(function () {
                i2b2.CRC.view.QT.params.queryTimeout = parseInt($('#QryTimeout').val(), 10);
                $("#queryOptionsModal div").eq(0).modal("hide");
            });
            $(i2b2.CRC.view.QT.template.queryOptions(i2b2.CRC.view.QT.params)).appendTo("#queryOptions");
            $("#queryOptionsModal div:eq(0)").modal('show');
        });
    }else{
        $("#queryOptions").empty();
        $(i2b2.CRC.view.QT.template.queryOptions(i2b2.CRC.view.QT.params)).appendTo("#queryOptions");
        $("#queryOptionsModal div:eq(0)").modal('show');
    }
}
// This is done once the entire cell has been loaded
// ================================================================================================== //
i2b2.events.afterCellInit.add((cell) => {
        if (cell.cellCode === 'CRC') {
            console.debug('[EVENT CAPTURED i2b2.events.afterCellInit] --> ' + cell.cellCode);

            // ___ Register this view with the layout manager ____________________
            i2b2.layout.registerWindowHandler("i2b2.CRC.view.QT",
                (function (container, scope) {
                    // THIS IS THE MASTER FUNCTION THAT IS USED TO INITIALIZE THE WORK CELL'S MAIN VIEW
                    cell.view.QT.lm_view = container;

                    // add the cellWhite flare
                    cell.view.QT.containerRoot = $('<div class="CRC_QT_view"></div>').appendTo(cell.view.QT.lm_view.getElement());
                    let runBar = $('<div class="CRC_QT_runbar">' +
                            '<div class="left">' +
                                '<label>Name:</label>' +
                            '</div>' +
                        '</div>');
                    let queryName = $('<input id="queryName" class="name">');
                    queryName.on("focus", function(event){
                        $(this).blur();
                    })
                    $('<div class="center"></div>').append(queryName).appendTo(runBar);
                    runBar.append('<div class="right">' +
                        '<button type="button" class="btn btn-primary btn-sm button-run">Find Patients</button>' +
                        '<button type="button" class="btn btn-danger btn-sm button-query-running" disabled title="Modify or clear the query to run another query without waiting.">Running</button>' +
                        '<button type="button" class="btn btn-primary btn-sm button-clear">Clear All</button>' +
                        '</div>');

                    runBar.appendTo(cell.view.QT.containerRoot);

                    cell.view.QT.containerDiv = $('<div class="CRC_QT_query"></div>').appendTo(cell.view.QT.containerRoot);

                    i2b2.sdx.Master.AttachType(queryName, 'QM');
                    i2b2.sdx.Master.setHandlerCustom(queryName, 'QM', 'DropHandler',function(sdxData, elem) {
                        // handle if QM drag drop is comming from a WORK item
                        if (sdxData.sdxInfo.sdxType === "WRK") sdxData = sdxData.sdxUnderlyingPackage;
                        $(elem.target).prop("placeholder", sdxData.sdxInfo.sdxDisplayName);
                        $(elem.target).removeClass("DropHover");
                        let qm_id = sdxData.sdxInfo.sdxKeyValue;
                        i2b2.CRC.ctrlr.QT.doQueryLoad(qm_id);
                    });

                    i2b2.sdx.Master.setHandlerCustom(queryName, 'QM', 'onHoverOut', function(elem) {
                        $(elem).removeClass("DropHover");
                    });
                    i2b2.sdx.Master.setHandlerCustom(queryName, 'QM', 'onHoverOver', function(elem) {
                        $(elem).addClass("DropHover");
                    });

                    container.on('open', () => {
                        // capture "run query" button click ---------------------------------------------------
                        $(".CRC_QT_runbar .button-run", cell.view.QT.containerRoot).on("click", (evt)=> {
                            //check if this a valid query
                            if(i2b2.CRC.view.QT.validateQuery()) {// run the query
                                $(".CRC_QT_runbar .button-run").prop("disabled", true);
                                evt.target.blur();
                                // only run if the query has entries
                                if (i2b2.CRC.model.query.groups.length > 0) i2b2.CRC.view.QT.loadResultTypesAndShowRun();
                            }
                        });

                        // capture "clear query" button click -------------------------------------------------
                        $(".CRC_QT_runbar .button-clear", cell.view.QT.containerRoot).on("click", (evt)=> {
                            evt.target.blur();
                            i2b2.CRC.view.QT.clearAll();
                        });
                    });

                    i2b2.CRC.view.QT.render();

                }).bind(this)
            );

            // parse any probabilistic sketch capabilities for the CRC
            if (i2b2.CRC.cfg.cellParams['QUERY_OPTIONS_XML']) {
                let queryOptions = {};
                let results = i2b2.h.XPath(i2b2.CRC.cfg.cellParams["QUERY_OPTIONS_XML"], "//QueryMethod[@ID]");
                results.forEach((node) => { queryOptions[node.attributes['ID'].value] = node.textContent; });
                i2b2.CRC.model.queryExecutionOptions = queryOptions;
            }

            // load the templates (TODO: Refactor this to loop using a varname/filename list)
            // TODO: Refactor templates to use Handlebars partals system
            cell.view.QT.template = {};
            // ... for query groups
            $.ajax("js-i2b2/cells/CRC/templates/QueryGroup.html", {
                success: (template) => {
                    cell.view.QT.template.qg = Handlebars.compile(template);
                },
                error: (error) => { console.error("Could not retrieve template: QueryGroup.html"); }
            });
            // ... for query group concepts list
            $.ajax("js-i2b2/cells/CRC/templates/QueryGroupConceptList.html", {
                success: (template) => {
                    cell.view.QT.template.qgcl = Handlebars.compile(template);
                },
                error: (error) => { console.error("Could not retrieve template: QueryGroupConceptList.html"); }
            });
            // ... for the final query group drop target / run button
            $.ajax("js-i2b2/cells/CRC/templates/QueryGroupAdder.html", {
                success: (template) => {
                    cell.view.QT.template.qgadd = Handlebars.compile(template);
                },
                error: (error) => { console.error("Could not retrieve template: QueryGroupAdder.html"); }
            });
            // ---------------------------------------------------------
            // ... XML for the query request (main body)
            $.ajax("js-i2b2/cells/CRC/templates/Query.xml", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("Query", req.responseText);
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: Query.xml"); }
            });
            // ... XML for the query request (main body)
            $.ajax("js-i2b2/cells/CRC/templates/QueryPanel.xml", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("QueryPanel", req.responseText);
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: QueryPanel.xml"); }
            });
            // ... XML for the query request (main body)
            $.ajax("js-i2b2/cells/CRC/templates/QueryPanelItem.xml", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("QueryPanelItem", req.responseText);
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: QueryPanelItem.xml"); }
            });
            // ... XML for the query request (main body)
            $.ajax("js-i2b2/cells/CRC/templates/SubQuery.xml", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("SubQuery", req.responseText);
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: SubQuery.xml"); }
            });

            // ... XML for the query request (main body)
            $.ajax("js-i2b2/cells/CRC/templates/SubQueryConstraint.xml", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("SubQueryConstraint", req.responseText);
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: SubQueryConstraint.xml"); }
            });

            // ... XML for the query request (main body)
            $.ajax("js-i2b2/cells/CRC/templates/QueryPanelItemConstraint.xml", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("QueryPanelItemConstraint", req.responseText);
                },
                error: (error) => { console.error("Error (retrieval or structure) with template: QueryPanelItemConstraint.xml"); }
            });

            //HTML template for event
            $.ajax("js-i2b2/cells/CRC/templates/Event.html", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("Event", req.responseText);                    
                },
                error: (error) => { console.error("Could not retrieve template: Event.html"); }
            });
            //HTML template for event relationship
            $.ajax("js-i2b2/cells/CRC/templates/EventLink.html", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("EventLink", req.responseText);
                },
                error: (error) => { console.error("Could not retrieve template: EventLink.html"); }
            });

            //HTML template for event relationship
            $.ajax("js-i2b2/cells/CRC/templates/EventLinkTimeSpan.html", {
                success: (template, status, req) => {
                    Handlebars.registerPartial("EventLinkTimeSpan", req.responseText);
                },
                error: (error) => { console.error("Could not retrieve template: EventLinkTimeSpan.html"); }
            });

            //template for the setting date constraint on concept
            $.ajax("js-i2b2/cells/CRC/templates/ConceptDateConstraint.html", {
                success: (template) => {
                    cell.view.QT.template.dateConstraint = Handlebars.compile(template);
                },
                error: (error) => { console.error("Could not retrieve template: ConceptDateConstraint.html"); }
            });

            //template for the setting date constraint on concept
            $.ajax("js-i2b2/cells/CRC/templates/QueryOptions.html", {
                success: (template) => {
                    cell.view.QT.template.queryOptions = Handlebars.compile(template);
                },
                error: (error) => { console.error("Could not retrieve template: QueryOptions.html"); }
            });

            cell.model.query = {
                name: 'default query name',
                groups: []
            };
        }
    }
);
