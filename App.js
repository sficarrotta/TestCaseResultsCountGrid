var Ext = window.Ext4 || window.Ext;
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        this._GridRecords = [];
        this._myGrid = undefined;
        this._boxcontainer = Ext.create('Ext.form.Panel', {
            title: 'Grid Filters',
            layout: { type: 'hbox'},
            width: '95%',
            bodyPadding: 10
        });
        this._loadMethods();
    },
    
    _loadMethods: function() {
        this._methodField = this.add({
            padding : 5,
            fieldLabel: 'Method',
            model: 'TestCase',
            field: 'Method',
            xtype: 'rallyfieldvaluecombobox',
            allowClear: true,
            clearText: '-- Clear Filter --',
            emptyText: 'Filter by Method...',
            listeners: {
                ready: this._onMethodBoxReady,
                change: this._onChange,
                scope: this
            },
            scope: this
        });
    },
    
    _onMethodBoxReady: function(combo) {
        combo.getStore().getAt(0).set('formattedName', '-- Clear Filter --');
        this._boxcontainer.add(this._methodField);
        this._loadTestFolders();
    },
    
    _onChange: function() {
        if (this._myGrid) {
            var store = this._myGrid.getStore();
            store.clearFilter(!0);
            this._myGrid.destroy();
            this._GridRecords = [];
            this._loadTestCases();
        }
        else {
            console.log("grid not created yet");
        }
    },
    
    _loadTestFolders: function() {
        console.log("loading folders");
        this._testFolderField = this.add({
            storeConfig: {
                autoLoad: true,
                model: 'TestFolder',
                remoteFilter: true
            },
            allowNoEntry: true,
            noEntryValue: '',
            padding : 5,
            fieldLabel: 'Test Folder',
            xtype: 'rallycombobox',
            field: 'TestFolder',
            listeners: {
                ready: this._onTestFolderBoxReady,
                change: this._onChange,
                scope: this
            },
            scope: this
        });
    },
    
    _onTestFolderBoxReady: function() {
        this._boxcontainer.add(this._testFolderField);
        
        // all widgets added, so put the container on the gui
        this.add(this._boxcontainer); 
        this._loadTestCases();
    },

    _loadTestCases: function() {
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'TestCase',
            autoLoad: true,
            filters: [
                {
                    property: 'Type',
                    operator: 'Contains',
                    value: 'Regression'
                },
                {
                    property: 'Method',
                    operator: '=',
                    value: this._methodField.getValue()
                },
                {
                    property: 'TestFolder',
                    operator: '=',
                    value: this._testFolderField.getValue() 
                }
            ],
            listeners: {
                load: function(store, records, success) {
                    this._onTestCasesLoaded(store, records);
                },
                scope: this
            },

            fetch: ['Name', '_ref', 'ObjectID', 'FormattedID', 'Method', 'Type', 'TestCaseResult', 'TestFolder']
        });
    },
    
    _onTestCasesLoaded: function(store, data) {
        var me = this;
        var gridRecord = [];
        var lastRecord = false;
        var length = data.length;

        Ext.Array.each(data, function(record) {
            length--;
            if(length === 0) { lastRecord = true; }
            gridRecord = {
                _ref: record.get('_ref'),
                ObjectID: record.get('ObjectID'),
                FormattedID: record.get('FormattedID'),
                Name: record.get('Name'),
                Method: record.get('Method'),
                Passed: 0,
                Failed: 0
            };
            me._countTestCaseResults(gridRecord, lastRecord);
            me._GridRecords.push(gridRecord);
        });
    },

    _countTestCaseResults: function(testCase, lastRecord) {
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'TestCaseResult',
            autoLoad: true,
            filters: [{
                property : 'TestCase.Name',
                operator : '=',
                value    : testCase.Name
            }],
            fetch: [
                'Verdict'
            ],
            limit: 10000,
            listeners: {
                load: function(store, data, success) {
                    this._onResultsLoaded(data, testCase, lastRecord);
                },
                scope: this
            }
        }); 
    },
    
    _onResultsLoaded: function(resultsData, currentTC, lastRecord) {
        var me = this;
        var pass = 0;
        var fail = 0;
        var verdict;
        Ext.Array.each(resultsData, function(record) {
            verdict = record.get('Verdict');
            if (verdict == "Pass") { pass ++;}
            if (verdict == "Fail") { fail ++;}
        });

        currentTC.Passed = pass;
        currentTC.Failed = fail;
        if( lastRecord ) {
            me._createGrid();
        }
    },
    
    _createGrid: function() {
        var me = this;
        this._myGrid = this.add({
            title: 'Regression Test Case Results Counts',
            xtype: 'rallygrid',
            pagingToolbarCfg: {
               pageSizes: [50, 100, 200, 500, 1000]
            },
            store: Ext.create('Rally.data.custom.Store', {
             data: me._GridRecords,
             model: 'TestCase',
             height: '98%'
            }),
            columnCfgs: [
                {
                    xtype: 'templatecolumn',
                    text: 'Test Case ID',
                    dataIndex: 'FormattedID',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', dataIndex: 'Name', flex: 1
                },
                {
                    text: 'Method', dataIndex: 'Method'
                },
                {
                    text: 'Passed', dataIndex: 'Passed'
                },
                {
                    text: 'Failed', dataIndex: 'Failed'
                }
            ]
        });
    }
});
