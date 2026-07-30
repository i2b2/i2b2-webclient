import React, {useEffect, useState} from "react";
import {useDispatch, useSelector} from "react-redux";

import {Typography, Box, Button} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";

import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from "@mui/x-tree-view";
import RefreshIcon from '@mui/icons-material/Refresh';
import CircularProgress from '@mui/material/CircularProgress';
import {generateDataFile, listRequestTable} from "../reducers/requestTableSlice";
import "./RequestTableView.scss";
import {decode} from "html-entities";
import {ConfirmDialog} from "./ConfirmDialog";
import {AlertDialog} from "./AlertDialog";
import {RequestStatus} from "../models";

const DATA_EXPORT_PATIENT_LIMIT = 3000;

export const RequestTableView = ({ userInfo, displayDetailView}) => {
    const dispatch = useDispatch();
    const { rows, isFetching } = useSelector((state) => state.requestTable);
    const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0});
    const [filterModel, setFilterModel] = useState({items: []});
    const {username, isAdmin, isManager, isObfuscated} = userInfo;
    const { obfuscatedDisplayNumber, useFloorThreshold, floorThresholdNumber, floorThresholdText }
        = useSelector((state) => state.configInfo);
    const [confirmFileGen, setConfirmFileGen] = React.useState(false);
    const [createFileData, setCreateFileData] = React.useState({});
    const [exportLimitError, setExportLimitError] = React.useState(null);

    const columns = [
        {
            field: 'id',
            minWidth: 120,
            headerName: 'Request ID',
            headerClassName: "header",
            sortable: true,
            type: 'number',
            resizable: false,
            disableReorder: true,
        },
        {
            field: 'description',
            headerName: 'Description',
            headerClassName: "header",
            sortable: true,
            resizable: false,
            disableReorder: true,
            minWidth: 210,
            renderCell: (param) => {
                return (
                    <SimpleTreeView defaultExpandedItems={(isManager || isAdmin) ? [] : [param.row.description]}>
                        <TreeItem itemId={param.row.description} label={param.row.description}>
                            {
                                param.row.requests.map((exportRequest, index) => {
                                    return (<TreeItem itemId={exportRequest.description + index} className={"requestLabel"} label={(index +1) + ". " + exportRequest.description}/>)
                                })
                            }
                        </TreeItem>
                    </SimpleTreeView>
                );
            }
        },
        {
            field: 'patientCount',
            headerName: 'Count',
            headerClassName: "header",
            sortable: true,
            resizable: false,
            disableReorder: true,
            flex: 1,
            valueGetter: (value) => {
                let formattedValue = value?.length > 0 ? parseInt(value) : value;
                let displayValue = formattedValue;

                if (isNaN(formattedValue) || !(value?.length > 0)) {
                    displayValue = "Not Available";
                }else{
                    if (isObfuscated) {
                        displayValue = formattedValue + decode("&plusmn;") + obfuscatedDisplayNumber;
                    }
                    if (useFloorThreshold) {
                        if (formattedValue < floorThresholdNumber) {
                            displayValue = floorThresholdText + floorThresholdNumber;
                        }
                    }
                }

                return displayValue;
            }
        },
        {
            field: 'status',
            headerName: 'Status',
            headerClassName: "header",
            sortable: true,
            resizable: false,
            disableReorder: true,
            flex: 1,
            valueGetter: (status) => {
                if (status) {
                    return status.name;
                }
                return status;
            },
            renderCell: (param) => {
                return (
                    <div className={"RequestStatus"}>
                        {param.row.isFetchingStatus ? <CircularProgress /> : <div>{param.row.status.name}</div>}
                    </div>
                );
            }
        },
        {
            field: 'dateSubmitted',
            headerName: 'Date Submitted',
            headerClassName: "header",
            sortable: true,
            resizable: false,
            disableReorder: true,
            minWidth: 125,
            maxWidth: 125,
            valueGetter: (value) => {
                if (!value) {
                    return value;
                }
                // Format the Date object
                return value.toLocaleDateString();
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            headerClassName: "header",
            sortable: false,
            resizable: false,
            disableReorder: true,
            minWidth: 150,
            renderCell: (param) => {
                return (
                    <div className={"actions"}>

                        {(isManager || isAdmin) && <div><Button title={"Create File(s)"} className={"createFileBtn"} color="primary" variant="contained" size="small"
                                          onClick={() => handleConfirmFileCreate(param.row)}
                                                   disabled={param.row.status === RequestStatus.statuses.PROCESSING
                                                       || param.row.status === RequestStatus.statuses.QUEUED
                                                       || param.row.status === RequestStatus.statuses.FINISHED
                                                       || param.row.status === RequestStatus.statuses.CANCELLED
                                                       || param.row.status === RequestStatus.statuses.INCOMPLETE
                                                       || param.row.status === RequestStatus.statuses.INVALID
                                                       || param.row.isFetchingStatus
                                                       || param.row.dataFileGeneration.isGeneratingFile}>Create File(s)
                            </Button> </div>
                        }
                        <div>
                            <Button title={"View Details"} variant="outlined" size="small" onClick={() => handleDisplayDetailView(param.row)}
                                    disabled={param.row.status === RequestStatus.statuses.INVALID}>View Details</Button>
                        </div>
                    </div>
                );
            },
        }
    ];

    const handleConfirmFileCreate = (row) => {
        const patientCount = parseInt(String(row.patientCount).replace(/,/g, ''), 10);
        if (!isNaN(patientCount) && patientCount > DATA_EXPORT_PATIENT_LIMIT) {
            setExportLimitError(`Request ${row.id} has ${row.patientCount} patients. Data exports are limited to ${DATA_EXPORT_PATIENT_LIMIT.toLocaleString()} patients.`);
            return;
        }

        setConfirmFileGen(true);
        setCreateFileData({
            queryMasterId: row.id,
            queryInstanceId: row.queryInstanceId
        });
    }
    const handleDisplayDetailView = (requestRow) => {
        displayDetailView(requestRow);
    };

    const clearFilterModel = () => {
        setFilterModel({items: []});
    }
    const handleRefreshRequestTable = () => {
        clearFilterModel();
        dispatch(listRequestTable({isManager, isAdmin, username}));
    }

    const handleCreateFile = () =>{
        setConfirmFileGen(false);
        dispatch(generateDataFile({queryInstanceId: createFileData.queryInstanceId, queryMasterId: createFileData.queryMasterId}));
        setCreateFileData({});
    }

    useEffect(() => {
        if (username) {
            dispatch(listRequestTable({isManager, isAdmin, username}));
        }
    }, [username, isManager, isAdmin]);

    const getColumns = () => {
        if(isManager || isAdmin){
            columns.splice(2, 0, {
                field: 'userId',
                headerName: 'User',
                headerClassName: "header",
                sortable: true,
                resizable: false,
                disableReorder: true,
                flex: 1,
            });
        }

        return columns;
    }
    return (
        <Box className={"RequestTableView"}>
            <Typography className={"title"}>
                List of Export Data Requests
                <div className={"RefreshTableIcon"}>
                    <Button onClick={handleRefreshRequestTable} variant="contained" startIcon={<RefreshIcon />}>
                    Refresh
                </Button>
                </div>
            </Typography>
            <DataGrid
                style={{background:"white"}}
                className={"RequestTableGrid"}
                rows={rows}
                columns={getColumns()}
                showCellVerticalBorder={true}
                density={'compact'}
                disableRowSelectionOnClick
                initialState={{
                    sorting: {
                        sortModel: [{field:'id',sort:'desc'}]
                    },
                    columns: {
                        columnVisibilityModel: {
                            // Hide column userId the other columns will remain visible
                            userId: false,
                        },
                    }
                }}
                filterModel={filterModel}
                onFilterModelChange={(newFilterModel) => {
                    setFilterModel(newFilterModel);
                }}
                pageSizeOptions={[5, 10, 25]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                loading={isFetching}
                slotProps={{
                    loadingOverlay: {
                        variant: 'circular-progress',
                        noRowsVariant: 'linear-progress',
                    },
                }}
                getCellClassName={(params) => {
                    if (params.field === 'status' && params.value === RequestStatus.statuses.INVALID) {
                        return "InvalidRow";
                    }else{
                        return '';
                    }
                }}
                getRowClassName={(params) => {
                    if(params.row.status === RequestStatus.statuses.INVALID){
                        return "InvalidRow";
                    }
                    else{
                        return '';
                    }
                }}
                getRowHeight={() => 'auto'}
            />
            {confirmFileGen && <ConfirmDialog
                msg={'Are you sure you want to create data file(s) for request with ID ' +  createFileData.queryMasterId + '?'}
                title="Create Data File(s)"
                onOk = {handleCreateFile}
                onCancel = {() => setConfirmFileGen(false)}
            />
            }
            {exportLimitError && <AlertDialog
                msg={exportLimitError}
                title="Export Limit Exceeded"
                onOk={() => setExportLimitError(null)}
            />
            }
        </Box>
    )
};
