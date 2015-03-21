var Ext = window.Ext4 || window.Ext;
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        this._GridRecords = [];
        this._loadTestCases();
    },
    
    _loadTestCases: function() {
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'TestCase',
            autoLoad: true,
            filters: [{
                property: 'Type',
                operator: 'Contains',
                value: 'Regression'
            }],
            listeners: {
                load: function(store, records, success) {
                    this._onTestCasesLoaded(store, records);
                },
                scope: this
            },

            fetch: ['Name', '_ref', 'ObjectID', 'FormattedID', 'Method', 'Type', 'TestCaseResult']
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
        console.log("_createGrid: gridrec: ", me._GridRecords);
            this.add({
                title: 'Regression Test Case Results Counts',
                xtype: 'rallygrid',
                store: Ext.create('Rally.data.custom.Store', {
                 data: me._GridRecords,
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
