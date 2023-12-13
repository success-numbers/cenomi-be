const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const utility = require('./utility')
exports.handler = async (event) => {
    try {
        console.log("DASHBOARD STATS LAMBDA", JSON.stringify(event));
        const eventBody = JSON.parse(event.body);

        const { tsf_type, tsf_status, startDate, endDate } = eventBody;
        const dbResp = await utility.getStatsForSearchCriteria({
            tsfType: tsf_type , tsfStatus: tsf_status, startDate: startDate, endDate: endDate
        })
        
        const mockResponse = {
            "tsf_type": "ALL",
            "tsf_status": "ALL",
            "stats": [
                {
                    "key": "OPEN",
                    "disp_key": "Open",
                    "value": "3"
                },
                {
                    "key": "INPROGRESS",
                    "disp_key": "In Progress",
                    "value": "3"
                },
                {
                    "key": "SUBMITTED",
                    "disp_key": "Submitted",
                    "value": "3"
                }
            ],
            "tsf_stats": {
                "total": 9,
                "pie_stats": [
                    {
                        "key": "ALLOC",
                        "disp_key": "Alloc",
                        "value": "2"
                    },
                    {
                        "key": "GRN",
                        "disp_key": "Grn",
                        "value": "2"
                    },
                    {
                        "key": "DSK",
                        "disp_key": "Dsk",
                        "value": "5"
                    }
                ]
            },
            "bar_stats": [
                {
                    "type": "ALLOC",
                    "stats": [
                        {
                            "status": "OPEN",
                            "display_status": "Open",
                            "count": 1
                        },
                        {
                            "status": "INPROGRESS",
                            "display_status": "In Progress",
                            "count": 1
                        },
                        {
                            "status": "SUBMITTED",
                            "display_status": "In Progress",
                            "count": 2
                        }
                    ]
                },
                {
                    "type": "GRN",
                    "stats": [
                        {
                            "status": "OPEN",
                            "display_status": "Open",
                            "count": 1
                        },
                        {
                            "status": "SUBMITTED",
                            "display_status": "Completed",
                            "count": 2
                        }
                    ]
                }
            ]
        }        
        const res = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(dbResp),
        };
        return res;
    } catch (e) {
        console.error('Error fetching destLocIds:', e.message);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Internal server error" }),
        };
        return res;
    }
};
