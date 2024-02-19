sap.ui.define(["sap/ui/core/Fragment", "sap/m/MessageToast","xlsx"],
function (Fragment, MessageToast, XLSX){
    "use strict";
    return {
        // this variable will hold the data of excel file
        excelSheetsData: [],

        openExcelUploadDialog: function(oEvent) {
            console.log(XLSX.version)
            var oView = this.getView();
            if (!this.pDialog) {
                Fragment.load({
                    id: "excel_upload",
                    name: "csvuploader.ext.fragment.ExcelUpload",
                    type: "XML",
                    controller: this
                }).then((oDialog) => {
                    var oFileUploader = Fragment.byId("excel_upload", "uploadSet");
                    oFileUploader.removeAllItems();
                    this.pDialog = oDialog;
                    this.pDialog.open();
                })
                    .catch(error => alert(error.message));
            } else {
                var oFileUploader = Fragment.byId("excel_upload", "uploadSet");
                oFileUploader.removeAllItems();
                this.pDialog.open();
            }
        },
        onUploadSet: function(oEvent) {
            let aExcesSheetData = this.excelSheetsData;

            if (aExcesSheetData.length > 0){
                aExcesSheetData.forEach((esd, i) => {
                    var oBuilding = this.getView().getModel().getServiceMetadata().dataServices.schema[0].entityType.find(x => x.name === 'ZC_TM_PO_FREIGHTType');
                    var propertyList = ['LineId', 'DocNo' ,'arrival_dt', 'departure_dt', 'quantity', 'wagon'];
                    var colList = {}; 

                    propertyList.forEach((value, index) => {
                        let property = oBuilding.property.find(x => x.name === value);
                        if (value == "arrival_dt" || value == "departure_dt"){
                            colList[property.name] = this._excelDateToJSDate([Object.values(esd)[i][property.extensions.find(x => x.name === 'label').value]][0]);
                        } else {
                            colList[property.name] = [Object.values(esd)[i][property.extensions.find(x => x.name === 'label').value]][0].toString();
                        }
                        
                    });
                    this.getOwnerComponent().getModel().create("/ZC_TM_PO_FREIGHT",
                        colList,
                        {
                            success: (oData, response) => {
                                MessageToast.show("Upload complete.");
                                this.onCloseDialog();
                            },
                            error: oError => {
                                MessageToast.show(oError);
                                this.onCloseDialog();
                            }
                        });
                });
            }
        },
        onTempDownload: function (oEvent) {
            // get the odata model binded to this application
            var oModel = this.getView().getModel();
            
            // get the property list of the entity for which we need to download the template
            var oBuilding = oModel.getServiceMetadata().dataServices.schema[0].entityType.find(x => x.name === 'ZC_TM_PO_FREIGHTType');
            // set the list of entity property, that has to be present in excel file template
            var propertyList = ['LineId', 'DocNo' ,'arrival_dt', 'departure_dt', 'quantity', 'wagon'];

            var excelColumnList = [];
            var colList = {};

            // finding the property description corresponding to the property id
            propertyList.forEach((value, index) => {
                let property = oBuilding.property.find(x => x.name === value);
                colList[property.extensions.find(x => x.name === 'label').value] = '';
            });
            excelColumnList.push(colList);
            
            // initialising the excel work sheet
            const ws = XLSX.utils.json_to_sheet(excelColumnList);
            // creating the new excel work book
            const wb = XLSX.utils.book_new();
            // set the file value
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            // download the created excel file
            XLSX.writeFile(wb, 'RAP - FREIGHTType.xlsx');

            MessageToast.show("Template File Downloading...");
        },
        onCloseDialog: function (oEvent) {
            this.pDialog.close();
        },
        onBeforeUploadStart: function (oEvent) {
            
        },
        onUploadSetComplete: function (oEvent) {

            // getting the UploadSet Control reference
            var oFileUploader = Fragment.byId("excel_upload", "uploadSet");
            // since we will be uploading only 1 file so reading the first file object
            var oFile = oFileUploader.getItems()[0].getFileObject();

            var reader = new FileReader();
            var that = this;

            reader.onload = (e) => {
                // getting the binary excel file content
                let xlsx_content = e.currentTarget.result;

                let workbook = XLSX.read(xlsx_content, { type: 'binary' });
                // here reading only the excel file sheet- Sheet1
                var excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets["Sheet1"]);
                
                workbook.SheetNames.forEach(function (sheetName) {
                    // appending the excel file data to the global variable
                    that.excelSheetsData.push(XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]));
                });
                console.log("Excel Data", excelData);
                console.log("Excel Sheets Data", this.excelSheetsData);
            };
            reader.readAsBinaryString(oFile);
        },
        onItemRemoved:function (oEvent) {
            
        },

        _excelDateToJSDate: function(serial) {
            var utc_days  = Math.floor(serial - 25569);
            var utc_value = utc_days * 86400;                                        
            var date_info = new Date(utc_value * 1000);
         
            var fractional_day = serial - Math.floor(serial) + 0.0000001;
         
            var total_seconds = Math.floor(86400 * fractional_day);
         
            var seconds = total_seconds % 60;
         
            total_seconds -= seconds;
         
            var hours = Math.floor(total_seconds / (60 * 60));
            var minutes = Math.floor(total_seconds / 60) % 60;
         
            return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
         }
    };
});