module.exports = {
                createSMInstance: createSMInstance,
    getSMInstance: getSMInstance,
    deleteSMInstance: deleteSMInstance
                };

const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();

const axios = require('axios');
const qs = require('qs');



async function createSMInstance(sm, tenantId) {
    try {
        // get access token
        let options = {
            method: 'POST',
            url: sm.url + '/oauth/token?grant_type=client_credentials&response_type=token',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(sm.clientid + ':' + sm.clientsecret).toString('base64')
            }
        };
        let res = await axios(options);
        try {
            // get service offering id
            let options1 = {
                method: 'GET',
                url: sm.sm_url + "/v1/service_offerings?fieldQuery=catalog_name eq 'hana'",
                headers: {
                    'Authorization': 'Bearer ' + res.data.access_token
                }
            };
            let res1 = await axios(options1);
            if (res1.data.num_items === 1) {
                try {
                    // get service plan id
                    let options2 = {
                        method: 'GET',
                        url: sm.sm_url + "/v1/service_plans?fieldQuery=catalog_name eq 'hdi-shared' and service_offering_id eq '" + res1.data.items[0].id + "'",
                        headers: {
                            'Authorization': 'Bearer ' + res.data.access_token
                        }
                    };
                    let res2 = await axios(options2);
                    if (res2.data.num_items === 1) {
                        try {
                            // create service instance
                            let options3 = {
                                method: 'POST',
                                url: sm.sm_url + '/v1/service_instances?async=false',
                                data: {
                                    'name': tenantId,
                                    'service_plan_id': res2.data.items[0].id
                                },
                                headers: {
                                    'Authorization': 'Bearer ' + res.data.access_token
                                }
                            };
                            let res3 = await axios(options3);
                            try {
                                // create service binding
                                let options4 = {
                                    method: 'POST',
                                    url: sm.sm_url + '/v1/service_bindings?async=false',
                                    data: {
                                        'name': tenantId,
                                        'service_instance_id': res3.data.id
                                    },
                                    headers: {
                                        'Authorization': 'Bearer ' + res.data.access_token
                                    }
                                };
                                let res4 = await axios(options4);
                                if (res4.data.hasOwnProperty('id') && res4.data.hasOwnProperty('credentials')) {
                                    let payload = { 'id': res4.data.id, 'credentials': res4.data.credentials, 'status': 'CREATION_SUCCEEDED' };
                                    try {
                                        // deploy DB artefacts
                                        let options5 = {
                                            method: 'POST',
                                            data: payload,
                                            url: process.env.db_api_url + '/v1/deploy/to/instance',
                                            headers: {
                                                'Authorization': 'Basic ' + Buffer.from(process.env.db_api_user + ':' + process.env.db_api_password).toString('base64'),
                                                'Content-Type': 'application/json'
                                            }
                                        };
                                        let res5 = await axios(options5);
                                        return res5.data;
                                    } catch (err) {
                                        console.log(err.stack);
                                        return err.message;
                                    }
                                } else {
                                    let errmsg = { 'error': 'Invalid service binding' };
                                    console.log(errmsg, res4);
                                    return errmsg;
                                }
                            } catch (err) {
                                console.log(err.stack);
                                return err.message;
                            }
                        } catch (err) {
                            console.log(err.stack);
                            return err.message;
                        }
                    } else {
                        let errmsg = { 'error': 'Service plan hdi-shared not found' };
                        console.log(errmsg);
                        return errmsg;
                    }
                } catch (err) {
                    console.log(err.stack);
                    return err.message;
                }
            } else {
                let errmsg = { 'error': 'Service offering hana not found' };
                console.log(errmsg);
                return errmsg;
            }
        } catch (err) {
            console.log(err.stack);
            return err.message;
        }
    } catch (err) {
        console.log(err.stack);
        return err.message;
    }
};

async function getSMInstance(sm, tenantId) {
    try {
        // get access token
        let options = {
            method: 'POST',
            url: sm.url + '/oauth/token?grant_type=client_credentials&response_type=token',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(sm.clientid + ':' + sm.clientsecret).toString('base64')
            }
        };
        let res = await axios(options);
        try {
            // get service binding details
            let options1 = {
                method: 'GET',
                url: sm.sm_url + "/v1/service_bindings?fieldQuery=name eq '" + tenantId + "'",
                headers: {
                    'Authorization': 'Bearer ' + res.data.access_token
                }
            };
            let res1 = await axios(options1);
            if (res1.data.num_items === 1) {
                return res1.data.items[0];
            } else {
                let errmsg = { 'error': 'Service binding not found for tenant ' + tenantId };
                console.log(errmsg);
                return errmsg;
            }
        } catch (err) {
            console.log(err.stack);
            return err.message;
        }
    } catch (err) {
        console.log(err.stack);
        return err.message;
    }
};

async function deleteSMInstance(sm, tenantId) {
    try {
        // get access token
        let options = {
            method: 'POST',
            url: sm.url + '/oauth/token?grant_type=client_credentials&response_type=token',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(sm.clientid + ':' + sm.clientsecret).toString('base64')
            }
        };
        let res = await axios(options);
        try {
            // get service binding and service instance ids
            let options1 = {
                method: 'GET',
                url: sm.sm_url + "/v1/service_bindings?fieldQuery=name eq '" + tenantId + "'",
                headers: {
                    'Authorization': 'Bearer ' + res.data.access_token
                }
            };
            let res1 = await axios(options1);
            if (res1.data.num_items === 1) {
                try {
                    // delete service binding
                    let options2 = {
                        method: 'DELETE',
                        url: sm.sm_url + '/v1/service_bindings/' + res1.data.items[0].id,
                        headers: {
                            'Authorization': 'Bearer ' + res.data.access_token
                        }
                    };
                    let res2 = await axios(options2);
                    try {
                        // delete service instance
                        let options3 = {
                            method: 'DELETE',
                            url: sm.sm_url + '/v1/service_instances/' + res1.data.items[0].service_instance_id,
                            headers: {
                                'Authorization': 'Bearer ' + res.data.access_token
                            }
                        };
                        let res3 = await axios(options3);
                        return res3.data;
                    } catch (err) {
                        console.log(err.stack);
                        return err.message;
                    }
                } catch (err) {
                    console.log(err.stack);
                    return err.message;
                }
            } else {
                let errmsg = { 'error': 'Service binding not found for tenant ' + tenantId };
                console.log(errmsg);
                return errmsg;
            }
        } catch (err) {
            console.log(err.stack);
            return err.message;
        }
    } catch (err) {
        console.log(err.stack);
        return err.message;
    }
};

