/**
 * @projectDescription	Controller object for Project Management.
 * @inherits 	i2b2
 * @namespace	i2b2.PM
 * @version 	2.1
 **/

// ================================================================================================== //
i2b2.PM.escapeXMLText = function(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

// ================================================================================================== //
i2b2.PM.doSamlLogin = function(service) {

    let domain = i2b2.PM.model.Domains[$("#PM-login-modal #logindomain").val()];
    if (domain) {
	i2b2.PM.model.currentDomain = domain;
        // copy information from the domain record
        var login_url = domain.urlCellPM;
        i2b2.PM.model.url = login_url;
        var shrine_domain = Boolean.parseTo(domain.isSHRINE);
        i2b2.PM.model.login_domain = domain.domain;
        if (domain.debug !== undefined) {
            i2b2.PM.model.login_debugging = Boolean.parseTo(domain.debug);
        } else {
            i2b2.PM.model.login_debugging = false;
        }
        if (domain.allowAnalysis !== undefined) {
            i2b2.PM.model.allow_analysis = Boolean.parseTo(domain.allowAnalysis);
        } else {
            i2b2.PM.model.allow_analysis = true;
        }
        if (domain.adminOnly !== undefined) {
            i2b2.PM.model.admin_only = Boolean.parseTo(domain.adminOnly);
        } else {
            i2b2.PM.model.admin_only = false;
        }
        if (domain.installer !== undefined) {
            i2b2.PM.model.installer_path = domain.installer;
        }
    } else {
        e += "\n  No login channel was selected";
    }

    // save the SAML login method if it was used
    if (domain.saml) {
        let samlConfig = domain?.saml[service];
        if (!samlConfig) samlConfig = {};
        i2b2.PM.model.samlConfig = samlConfig;
    } else {
        i2b2.PM.model.samlConfig = false;
    }

    // save PM cell's URL and login domain to cookies for later use by proxy server
    let now = new Date();
    now.setTime(now.getTime() + (10 * 60 * 1000)); // give users 10 mins to finish the SAML redirect dance
    document.cookie = "url="+encodeURIComponent(i2b2.PM.model.url)+"; expires=" + now.toUTCString() + "; SameSite=None; Secure;";
    document.cookie = "domain="+encodeURIComponent(i2b2.PM.model.login_domain)+"; expires=" + now.toUTCString() + "; SameSite=None; Secure;";

    const popupCenter = ({url, title, w, h}) => {
        // Fixes dual-screen position                             Most browsers      Firefox
        const dualScreenLeft = window.screenLeft !==  undefined ? window.screenLeft : window.screenX;
        const dualScreenTop = window.screenTop !==  undefined   ? window.screenTop  : window.screenY;

        const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

        const systemZoom = width / window.screen.availWidth;
        const left = (width - w) / 2 / systemZoom + dualScreenLeft;
        const top = (height - h) / 2 / systemZoom + dualScreenTop;
        const newWindow = window.open(url, title,`
            scrollbars=yes,
            width=${w / systemZoom}, 
            height=${h / systemZoom}, 
            top=${top}, 
            left=${left},
            menubar=no,
            titlebar=yes,
            status=yes,
            location=yes
        `);

        if (window.focus) newWindow.focus();
        return newWindow;
    };

    let url = i2b2.PM.model?.samlConfig.redirect;
    if (url === undefined) url = 'saml/redirect/'+service;

    i2b2.PM.model.samlWindow = popupCenter({url: url, title: 'SSO Login', w: 500, h: 650});
};

// ================================================================================================== //
i2b2.PM.ctrlr.SamlLogin = function(username, session, isPassword) {
    console.log(`Logged in ${username} with ${session}`);

    i2b2.PM.model.login_username = username;
    i2b2.PM.model.samlWindow.close();
    if (isPassword) {
        i2b2.PM.model.login_password = `<password>${session}</password>`;
    } else {
        i2b2.PM.model.login_password = `<password is_token="true" token_ms_timeout="1800000">${session}</password>`;
    }
    i2b2.PM.model.login_project = '';

    // call the PM Cell's communicator Object
    let callback = new i2b2_scopedCallback(i2b2.PM._processUserConfig, i2b2.PM);
    let parameters = {
        domain: i2b2.PM.model.login_domain,
        is_shrine: i2b2.PM.model.shrine_domain,
        project: i2b2.PM.model.login_project,
        username: i2b2.PM.model.login_username
    };
    let transportOptions = {
        url: i2b2.PM.model.url,
        user: i2b2.PM.model.login_username,
        domain: i2b2.PM.model.login_domain,
        project: i2b2.PM.model.login_project
    };
    i2b2.PM.ajax.getUserAuth("PM:Login", parameters, callback, transportOptions);
};

// ================================================================================================== //
i2b2.PM.doLogin = function() {
    i2b2.PM.model.shrine_domain = false;
    var input_errors = false;
    // change the cursor
    // show on GUI that work is being done
    // i2b2.h.LoadingMask.show();

    let e = 'The following problems were encountered:';
    // copy the selected domain info into our main data model
    let login_username = $("#PM-login-modal input[name='loginusr']").val();
    let login_password = $("#PM-login-modal input[name='loginpass']").val();
	
	let escaped_login_password = i2b2.PM.escapeXMLText(login_password);

    let domain = i2b2.PM.model.Domains[$("#PM-login-modal #logindomain").val()];
    if (domain) {
        // copy information from the domain record
        var login_domain = domain.domain;
        var login_url = domain.urlCellPM;
        i2b2.PM.model.url = login_url;
        var shrine_domain = Boolean.parseTo(domain.isSHRINE);
        var login_project = domain.project;
        if (domain.debug !== undefined) {
            i2b2.PM.model.login_debugging = Boolean.parseTo(domain.debug);
        } else {
            i2b2.PM.model.login_debugging = false;
        }
        if (domain.allowAnalysis !== undefined) {
            i2b2.PM.model.allow_analysis = Boolean.parseTo(domain.allowAnalysis);
        } else {
            i2b2.PM.model.allow_analysis = true;
        }
        if (domain.adminOnly !== undefined) {
            i2b2.PM.model.admin_only = Boolean.parseTo(domain.adminOnly);
        } else {
            i2b2.PM.model.admin_only = false;
        }
        if (domain.installer !== undefined) {
            i2b2.PM.model.installer_path = domain.installer;
        }
    } else {
        e += "\n  No login channel was selected";
    }
    // call the PM Cell's communicator Object
    let callback = new i2b2_scopedCallback(i2b2.PM._processUserConfig, i2b2.PM);
    let parameters = {
        domain: login_domain,
        is_shrine: shrine_domain,
        project: login_project,
        username: login_username,
        sec_pass_node: `<password>${escaped_login_password}</password>`
    };
    let transportOptions = {
        url: login_url,
        user: login_username,
        password: `<password>${escaped_login_password}</password>`,
        domain: login_domain,
        project: login_project
    };
    if(!input_errors){
        i2b2.PM.ajax.getUserAuth("PM:Login", parameters, callback, transportOptions);
    } else {
        alert(e);
    }
};


// ================================================================================================== //
i2b2.PM._processUserConfig = function (data) {
    console.group("PROCESS Login XML");
    console.debug(" === run the following command in console to view message sniffer: i2b2.hive.MsgSniffer.show() ===");

    /// TODO: pretty sure IE is dead
    // BUG FIX - WEBCLIENT-118
    let browserIsIE8 = false;
    let browserIsIE11 = false;
    let ieInCompatibilityMode = false;
    let ua = window.navigator.userAgent;
    let msie = ua.indexOf("MSIE ");
    if (msie > 0)
        browserIsIE8 = true;
    if(browserIsIE8){
        if (ua.indexOf("Trident/4.0") > -1) {
            ieInCompatibilityMode = true;
        }
    }
    if(!(window.ActiveXObject) && "ActiveXObject" in window)
        browserIsIE11 = true;


    // save the valid data that was passed into the PM cell's data model
    i2b2.PM.model.login_username = data.msgParams.sec_user;
    try {
        var t = i2b2.h.XPath(data.refXML, '//user/password')[0]; //[@token_ms_timeout]
        i2b2.PM.model.login_password = i2b2.h.Xml2String(t);

        let timeout = t.getAttribute('token_ms_timeout');
        if (timeout === undefined ||  timeout < 300001) {
            i2b2.PM.model.IdleTimer.start(1800000-300000, 300000);
        } else {
            i2b2.PM.model.IdleTimer.start(timeout-300000, 300000);
        }
    } catch (e) {
        //console.error("Could not find returned password node in login XML");
        i2b2.PM.model.login_password = "<password>"+data.msgParams.sec_pass+"</password>\n";
    }

    if (i2b2.PM.model.reLogin) {
        try { i2b2.PM.view.modal.login.hide(); } catch(e) {}
        i2b2.PM.model.reLogin = false;

        return;
    }
    i2b2.PM.model.otherAuthMethod = false;
    i2b2.PM.model.isAdmin = false;
    try {
        var t = i2b2.h.XPath(data.refXML, '//user/full_name')[0];
        i2b2.PM.model.login_fullname = i2b2.h.Xml2String(t);
    } catch(e) {}
    try {
        var t = i2b2.h.XPath(data.refXML, '//user/is_admin')[0];
        if (Boolean.parseTo(i2b2.h.getXNodeVal(t, 'is_admin')) ) {
            i2b2.PM.model.isAdmin = true;
        }
    } catch(e) {}
    try { // BUG FIX: WEBCLIENT-130
        var t = i2b2.h.XPath(data.refXML, '//user/param[@name="authentication_method"]')[0];
        if((i2b2.h.getXNodeVal(t, 'param').toUpperCase() === "NTLM") || (t != undefined)){
            i2b2.PM.model.otherAuthMethod = true;
        }
    } catch(e) {}

    i2b2.PM.model.login_domain = data.msgParams.sec_domain;
    i2b2.PM.model.shrine_domain = Boolean.parseTo(data.msgParams.is_shrine);
    i2b2.PM.model.login_project = data.msgParams.sec_project;
    i2b2.PM.model.loginXML = data.refXML;

    i2b2.PM.model.data = data;
    console.info("AJAX Login Successful! Updated: i2b2.PM.model");

    // delete the modal login form's HTML/CSS
    i2b2.PM.removeLoginDialog();

    i2b2.PM.cfg.cellURL = i2b2.PM.model.url;  // remember the url
    let xml = data.refXML;

    // copy any global params to i2b2.hive.model.params
    i2b2.hive.model.globalParams = {}
    try {
        let gparams = i2b2.h.XPath(xml, "descendant::global_data/param[@name]");
        for (let t of gparams) {
            i2b2.hive.model.globalParams[t.attributes['name'].value] = t;
        }
    } catch(e) {}

    // if user has more than one project display a modal dialog box to have them select one
    let projs = i2b2.h.XPath(xml, 'descendant::user/project[@id]');
    console.debug(projs.length+' project(s) discovered for user');
    // populate the Project data into the data model
    i2b2.PM.model.projects = {};
    for (let i=0; i<projs.length; i++) {
        // save data into model
        let code = projs[i].getAttribute('id');
        i2b2.PM.model.projects[code] = {};
        i2b2.PM.model.projects[code].name = i2b2.h.getXNodeVal(projs[i], 'name');
        i2b2.PM.model.projects[code].path = i2b2.h.getXNodeVal(projs[i], 'path');
        let roledetails = i2b2.h.XPath(projs[i], 'descendant-or-self::role');
        i2b2.PM.model.projects[code].roles = {};
        // details`
        let projdetails = i2b2.h.XPath(projs[i], 'descendant-or-self::param[@name]');
        i2b2.PM.model.projects[code].details = {};
        for (let d=0; d<projdetails.length; d++) {
            let paramName = projdetails[d].getAttribute('name');
            // BUG FIX - Firefox splits large values into multiple 4k text nodes... use Firefox-specific function to read concatenated value
            if (projdetails[d].textContent) {
                i2b2.PM.model.projects[code].details[paramName] = projdetails[d].textContent;
            } else if (projdetails[d].firstChild) {
                // BUG FIX - WEBCLIENT-118
                if(((browserIsIE8 && ieInCompatibilityMode) || browserIsIE11) && paramName === "announcement")
                    i2b2.PM.model.projects[code].details[paramName] = projdetails[d].firstChild.nodeValue;
                else
                    i2b2.PM.model.projects[code].details[paramName] = projdetails[d].firstChild.nodeValue.unescapeHTML();
            }
        }
    }

     if (!i2b2.PM.model.isAdmin && i2b2.PM.model.admin_only) {
        if (data.msgResponse === "")
                    alert("The PM Cell is down or the address in the properties file is incorrect.");
        else
            alert("Requires ADMIN role, please contact your system administrator");
        try { i2b2.PM.view.modal.login.show(); } catch(e) {}
        return true;
    } else if (i2b2.PM.model.admin_only) {
        // default to the first project
        i2b2.PM.model.login_project = ""; //i2b2.h.XPath(projs[0], 'attribute::id')[0].nodeValue;
        i2b2.PM._processLaunchFramework();
    } else 	if (projs.length === 0) {
        // show project selection dialog if needed
        // better error messages
        let s = i2b2.h.XPath(xml, 'descendant::result_status/status[@type="ERROR"]');
        if (s.length > 0) {
            // we have a proper error msg
            try {
                if (s[0].firstChild.nodeValue === "Password Expired.") {
                    i2b2.PM.view.changePassword.show(function(){
                        i2b2.PM.doLoginDialog();
                    }, true);
                    return false;
                } else {
                    alert("ERROR: " + s[0].firstChild.nodeValue);
                }
            } catch (e) {
                alert("An unknown error has occurred during your login attempt!");
            }
        } else if (i2b2.PM.model.login_fullname !== "") {
            alert("Your account does not have access to any i2b2 projects.");
        //} else if (s == null || s == "") {
        //	alert("The PM Cell is down or the address in the properties file is incorrect.");
        } else {
            alert("The PM Cell is down or the address in the properties file is incorrect.");
            //alert("Your account does not have access to any i2b2 projects.");
        }
        try { i2b2.PM.doLoginDialog(); } catch(e) {}
        return true;
    } else if (projs.length === 1) {
        // default to the only project the user has access to
        i2b2.PM.model.login_project = i2b2.h.XPath(projs[0], 'attribute::id')[0].nodeValue;
        i2b2.PM.model.login_projectname = i2b2.h.getXNodeVal(projs[0], "name");
        try {
            let announcement = i2b2.PM.model.projects[i2b2.PM.model.login_project].details.announcement;
            if (announcement) {
                i2b2.PM.view.modal.announcementDialog.showAnnouncement(announcement);
                return;
            }
        } catch(e) {}
        i2b2.PM._processLaunchFramework();
    } else {
        // display list of possible projects for the user to select
        i2b2.PM.view.showProjectSelectionModal();
    }
};

// ================================================================================================== //
i2b2.PM.extendUserSession = function() {
    let login_password = i2b2.PM.model.login_password;

    // call the PM Cell's communicator Object
    let callback = new i2b2_scopedCallback(i2b2.PM._processUserConfig, i2b2.PM);
    let parameters = {
        domain: i2b2.PM.model.login_domain,
        is_shrine: i2b2.PM.model.shrine_domain,
        project: i2b2.PM.model.login_project,
        username: i2b2.PM.model.login_username,
        password_text: login_password
    };
    let transportOptions = {
        url: i2b2.PM.model.url,
        user: i2b2.PM.model.login_username,
        password: login_password,
        domain: i2b2.PM.model.login_domain,
        project: i2b2.PM.model.login_project
    };

    i2b2.PM.model.reLogin = true;
    i2b2.PM.ajax.getUserAuth("PM:Login", parameters, callback, transportOptions);
};

// ================================================================================================== //
i2b2.PM.doLogout = function() {
    // must reload page to avoid dirty data from lingering
    const logoutUri = i2b2.PM.model?.samlConfig?.logout;
    if (logoutUri === undefined) {
        window.location.reload();
    } else {
        window.location.href = logoutUri;
    }
};

i2b2.PM.showUserInfo = function() {
    // bug fix - must reload page to avoid dirty data from lingering
    window.location.reload();
};

// ================================================================================================================================
// NEW FRAMEWORK LAUNCH CODE (cells can timeout on failure instead of hanging the entire load process)
// ================================================================================================================================
i2b2.PM._processLaunchFramework = function() {
    i2b2.hive.isLoaded = false;
    let oXML = i2b2.PM.model.loginXML;

    // create signal sender for afterLogin event
    i2b2.hive.loadMonitor = function(cell) {
        if (i2b2.hive.isLoaded) {
            // turn off our watchdog timer
            if (i2b2.PM.WDT) { clearTimeout(i2b2.PM.WDT); }
            return;
        }

        // keep track of cells loading and fire "afterAllCellsLoaded"
        // event after all cells are confirmed as loaded
        let loadedCells = [];
        for (let cellKey in i2b2.hive.cfg.LoadedCells) {
            if ((i2b2.hive.cfg.LoadedCells[cellKey] && i2b2[cellKey]) && i2b2[cellKey].isLoaded !== true) {
                return true;
            }
            // save to list of cells that are loaded
            if (i2b2[cellKey] !== undefined && i2b2.hive.cfg.LoadedCells[cellKey] === true) {
                loadedCells.push(cellKey);
            }
        }

        // stop loadMonitor polling
        clearInterval(i2b2.hive.loadMonitorTimer);
        delete i2b2.hive.loadMonitorTimer;
        delete i2b2.hive.loadMonitor;

        // all valid/active cells are loaded, fire the "all go" signal if all cells are loaded
        console.info("EVENT FIRE i2b2.events.afterAllCellsLoaded");
        i2b2.events.afterAllCellsLoaded.fire(loadedCells);

        // fire afterLogin asynchronously
        setTimeout((function() {
            console.info("EVENT FIRE i2b2.events.afterLogin");
            i2b2.events.afterLogin.fire(loadedCells);
            i2b2.hive.isLoaded = true;
        }), 10);

        // turn off our watchdog timer
        if (i2b2.PM.WDT) { clearTimeout(i2b2.PM.WDT); }
        // clear our cached copy of the xml message
        delete i2b2.PM.model.loginXML;
    };
    // Depending on "afterCellInit" events will fail because "order of execution" error!
    // The callback event chain of the "afterCellInit" event cannot provide guarantee
    // that it will execute after a cell has loaded all of it's scripts
    i2b2.hive.loadMonitorTimer = setInterval(i2b2.hive.loadMonitor,100);

    // extract additional user/project information
    i2b2.PM.model.userRoles = [];
    i2b2.PM.model.isObfuscated = true;
    let roles = i2b2.h.XPath(oXML, "//user/project[@id='"+i2b2.PM.model.login_project+"']/role/text()");
    for (var i = 0; i < roles.length; i++) {
        if (i2b2.PM.model.userRoles.indexOf(roles[i].nodeValue) === -1) i2b2.PM.model.userRoles.push(roles[i].nodeValue);
        if (roles[i].nodeValue === "DATA_AGG") i2b2.PM.model.isObfuscated = false;
    }

    // process cell listing
    let cellIDs = {};
    var c = i2b2.h.XPath(oXML, "//cell_data/@id");
    var l = c.length;
    for (let i=0; i<l; i++) {
        try {
            cellIDs[c[i].nodeValue] = true;
        } catch(e) {
            console.error("Invalid Node Info!");
        }
    }
    // add additional provided by the server or flag for deletion;
    let deleteKeys = {};
    for (let cellKey in i2b2.hive.cfg.lstCells) {
        if (cellIDs[cellKey]) {
            try {
                // server requested loading of cell
                let cellRef = i2b2.hive.cfg.lstCells[cellKey];
                cellRef.serverLoaded = true;
                // load the rest of the info provided by the server
                let y = i2b2.h.XPath(oXML, "//cell_data[@id='"+cellKey+"']");

                //First find the Cells that in the project selected.
                for (let i = y.length; i>=0; i--) {
                    let  x = i2b2.h.XPath(oXML, "//cell_data[@id='"+cellKey+"']")[i-1];
                    if ( i2b2.h.getXNodeVal(x, "project_path") === i2b2.PM.model.projects[i2b2.PM.model.login_project].path ) {
                        cellRef.name = i2b2.h.getXNodeVal(x, "name");
                        cellRef.project_path = i2b2.h.getXNodeVal(x, "project_path");
                        cellRef.url = i2b2.h.getXNodeVal(x, "url");
                        cellRef.xmlStr = i2b2.h.Xml2String(x);
                    }
                }

                //If no cell is found that get the '/'
                if (cellRef.name === undefined) {
                    for (let i=0; i<y.length; i++) {
                        let  x = i2b2.h.XPath(oXML, "//cell_data[@id='"+cellKey+"']")[i];
                        if ( i2b2.h.getXNodeVal(x, "project_path") === "/" )
                        {
                            cellRef.name = i2b2.h.getXNodeVal(x, "name");
                            cellRef.project_path = i2b2.h.getXNodeVal(x, "project_path");
                            cellRef.url = i2b2.h.getXNodeVal(x, "url");
                            cellRef.xmlStr = i2b2.h.Xml2String(x);
                        }
                    }
                }
                // params
                let x = i2b2.h.XPath(oXML, "//cell_data[@id='"+cellKey+"']/param[@name]");
                for (let i = 0; i < x.length; i++) {
                    let n = i2b2.h.XPath(x[i], "attribute::name")[0].nodeValue;
                    cellRef.params[n] = x[i].innerHTML;
                }
                // do not save cell info unless the URL attribute has been set (exception is PM cell)
                if (cellRef.url === "" && cellKey !== "PM") {
                    deleteKeys[cellKey] = true;
                } else {
                    i2b2.hive.cfg.lstCells[cellKey] = cellRef;
                }
            } catch (e) {
                console.error("Error occurred while processing PM cell config msg about cell:"+cellKey);
                deleteKeys[cellKey] = true;
            }
        } else {
            // TODO: cleanup or delete bellow
            //Remove cells.plugins that dont have right access to
//            if (i2b2.PM.model.userRoles.indexOf(i2b2.hive.cfg.lstCells[cellKey].roles) == -1) {
//            	deleteKeys[cellKey] = true;
//            }
            if (!i2b2.PM.model.admin_only) {
                var roleFound = -1;
                for (var i=0; i<i2b2.hive.cfg.lstCells[cellKey].roles.length; i++) {
                    roleFound = 0;
                    if (i2b2.PM.model.userRoles.indexOf(i2b2.hive.cfg.lstCells[cellKey].roles[i]) != -1) {
                        roleFound = 1;
                        break;
                    }
                }
                if (roleFound == 0) {
                    deleteKeys[cellKey] = true;
                }
            }
            // no need to load the cell unless forced
            if (cellKey !== "PM" && !i2b2.hive.cfg.lstCells[cellKey].forceLoading) {
                // add to the delete list
                deleteKeys[cellKey] = true;
            }
        }
    }

    // purge all non-used cells from the cells listing and i2b2 namespace
    for (let cellKey in deleteKeys) {
        delete i2b2.hive.cfg.lstCells[cellKey];
        if (i2b2[cellKey] && i2b2[cellKey].cellCode) {
            // made sure it's a "cell" we are about to delete
            delete i2b2[cellKey];
        }
    }
    // create a list of valid Cells that are loaded for this session
    var t = {};
    for (let cellKey in i2b2) {
        // is it a cell
        if (i2b2[cellKey].cellCode) {
            // valid config file?
            if (i2b2.hive.cfg.lstCells[cellKey]) {
                t[cellKey] = false;
            } else {
                console.error("CELL CONFIGURATION ERROR! ["+cellKey+"]");
                delete i2b2[cellKey];
            }
        }
    }
    i2b2.hive.cfg.LoadedCells = t;
    delete t;

    // start our watchdog time (WDT)
    var t = 0;
    if (i2b2.hive.cfg.loginTimeout) {
        t = i2b2.hive.cfg.loginTimeout;
    } else {
        t = 120;
    }
    t = t * 1000;
    i2b2.PM.WDT = setTimeout("i2b2.PM.trigger_WDT()", t);

    // Initialize the Cell Stubs
    for (let cellKey in i2b2.hive.cfg.LoadedCells) {
        // is it a cell
        if (cellKey !== "PM") {
            try {
                let cfg = i2b2.hive.cfg.lstCells[cellKey];
                if (i2b2[cellKey].loadState !== -1) {
                    i2b2[cellKey].Init(cfg.url, cfg.params);
                    i2b2.hive.cfg.LoadedCells[cellKey] = true
                } else {
                    throw Error("Cell Load Failed");
                }
            } catch(e) {
                console.error("CELL INITIALIZATION FAILURE! ["+cellKey+"]");
                delete i2b2[cellKey];
                i2b2.hive.cfg.LoadedCells[cellKey] = false;
            }
        }
    }
    console.groupEnd("PROCESSED Login XML");
};


// ================================================================================================== //
i2b2.PM.trigger_WDT = function() {
    console.warn('CHECKING FOR STUCK CELLS');
    let foundStuckCells = false;
    for (let cellKey in i2b2.hive.cfg.LoadedCells) {
        if (i2b2.hive.cfg.LoadedCells[cellKey] && i2b2[cellKey].isLoaded === false) {
            // clear stuck module
            console.error("FOUND STUCK CELL: "+cellKey);
            foundStuckCells = true;
        }
    }
    if (!foundStuckCells) { return true; }
    if (confirm("Some modules are still attempted to load.\nYou want to continue waiting?")) {
        // reset WDT
        let t = 0;
        if (i2b2.hive.cfg.loginTimeout) {
            t = i2b2.hive.cfg.loginTimeout;
        } else {
            t = 120;
        }
        t = t * 1000;
        i2b2.PM.WDT = setTimeout("i2b2.PM.trigger_WDT()", t);
        // recheck loading status
        i2b2.hive.loadMonitor();
    } else {
        // clear any unloaded modules
        console.warn("CLEARING STUCK CELLS...");
        for (let cellKey in i2b2.hive.cfg.LoadedCells) {
            if (i2b2.hive.cfg.LoadedCells[cellKey] && !i2b2[cellKey].isLoaded) {
                // clear stuck module
                console.error("CELL FORCEFULLY UNLOADED: "+cellKey);
                i2b2.hive.cfg.LoadedCells[cellKey] = false;
                delete i2b2[cellKey];
            }
        }
        // recheck loading status (which will now pass)
        i2b2.hive.loadMonitor();
    }
};


// ================================================================================================== //
i2b2.PM.changePassword = function (curpass, newpass, completeCallback) {
    try {
        // callback processor
        let scopedCallback = new i2b2_scopedCallback();
        scopedCallback.scope = this;
        scopedCallback.callback = function (results) {
            // check for errors
            if (results.error) {

                var s = i2b2.h.XPath(results.refXML, 'descendant::result_status/status[@type="ERROR"]');
                if (s.length > 0) {
                    // we have a proper error msg
                    try {
                        if (s[0].firstChild.nodeValue === "Password Validation Failed") {
                            i2b2.PM.view.displayContextDialog({
                                title: "i2b2 Change Password",
                                confirmMsg: "Password requirements not met.",
                                hideCancel: true,
                                onOk: function(){
                                    $("#pmContextDialog div:eq(0)").modal('hide');
                                }
                            });
                        }
                        else {
                            i2b2.PM.view.displayContextDialog({
                                title: "i2b2 Change Password",
                                confirmMsg: s[0].firstChild.nodeValue,
                                hideCancel: true,
                                onOk: function(){
                                    $("#pmContextDialog div:eq(0)").modal('hide');
                                }
                            });
                        }
                    } catch (e) {
                        i2b2.PM.view.displayContextDialog({
                            title: "i2b2 Change Password",
                            confirmMsg: "Error in PM Response",
                            hideCancel: true,
                            onOk: function(){
                                $("#pmContextDialog div:eq(0)").modal('hide');
                            }
                        });
                    }
                }

                console.error("Bad Results from Cell Communicator: ", results);
                return false;
            }
            completeCallback();
        }

        // AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
        //i2b2.CRC.ajax.getPDO_fromInputList
        i2b2.PM.ajax.setPassword("Plugin:PM", {sec_oldpassword: curpass, sec_newpassword: newpass}, scopedCallback);
    } catch (e) {
        console.error("Problem changing password!");
        console.dir(e);
    }
};
