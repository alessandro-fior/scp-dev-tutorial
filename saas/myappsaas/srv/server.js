const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();
const xsenv = require('@sap/xsenv');
const services = xsenv.getServices({
    uaa: { tag: 'xsuaa' },
    registry: { tag: 'SaaS' }
            , sm: { label: 'service-manager' }
        });

const xssec = require('@sap/xssec');
const passport = require('passport');
passport.use('JWT', new xssec.JWTStrategy(services.uaa));
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
    session: false
}));

app.use(bodyParser.json());

    const lib = require('./library');

    const hdbext = require('@sap/hdbext');

// subscribe/onboard a subscriber tenant
app.put('/callback/v1.0/tenants/*', function (req, res) {
        let tenantHost = req.body.subscribedSubdomain + '-' + appEnv.app.space_name.toLowerCase().replace(/_/g, '-') + '-' + services.registry.appName.toLowerCase().replace(/_/g, '-');
        let tenantURL = 'https:\/\/' + tenantHost + /\.(.*)/gm.exec(appEnv.app.application_uris[0])[0];
    console.log('Subscribe: ', req.body.subscribedSubdomain, req.body.subscribedTenantId, tenantHost, tenantURL);
                            lib.createSMInstance(services.sm, services.registry.appName + '-' + req.body.subscribedTenantId).then(
                async function (result) {
                    res.status(200).send(tenantURL);
                },
                function (err) {
                    console.log(err.stack);
                    res.status(500).send(err.message);
                });
                    });

// unsubscribe/offboard a subscriber tenant
app.delete('/callback/v1.0/tenants/*', function (req, res) {
        let tenantHost = req.body.subscribedSubdomain + '-' + appEnv.app.space_name.toLowerCase().replace(/_/g, '-') + '-' + services.registry.appName.toLowerCase().replace(/_/g, '-');
        console.log('Unsubscribe: ', req.body.subscribedSubdomain, req.body.subscribedTenantId, tenantHost);
                            lib.deleteSMInstance(services.sm, services.registry.appName + '-' + req.body.subscribedTenantId).then(
                function (result) {
                    res.status(200).send('');
                },
                function (err) {
                    console.log(err.stack);
                    res.status(500).send(err.message);
                });
                    });


// app user info
app.get('/srv/info', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        let info = {
            'userInfo': req.authInfo.userInfo,
            'subdomain': req.authInfo.subdomain,
            'tenantId': req.authInfo.identityZone
        };
        res.status(200).json(info);
    } else {
        res.status(403).send('Forbidden');
    }
});


// app database
app.get('/srv/database', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        // get DB instance
        lib.getSMInstance(services.sm, services.registry.appName + '-' + req.authInfo.identityZone).then(
            function (serviceBinding) {
                if (!serviceBinding.hasOwnProperty('error')) {
                    // connect to DB instance
                    let hanaOptions = serviceBinding.credentials;
                    hdbext.createConnection(hanaOptions, function (err, db) {
                        if (err) {
                            console.log(err.message);
                            res.status(500).send(err.message);
                            return;
                        }
                        // insert
                        let sqlstmt = `INSERT INTO "myappsaas.db::tenantInfo" ("tenant", "timeStamp") VALUES('` + services.registry.appName + `-` + req.authInfo.subdomain + `-` + req.authInfo.identityZone + `', CURRENT_TIMESTAMP)`;
                        db.exec(sqlstmt, function (err, results) {
                            if (err) {
                                console.log(err.message);
                                res.status(500).send(err.message);
                                return;
                            }
                            // query
                            sqlstmt = 'SELECT * FROM "myappsaas.db::tenantInfo"';
                            db.exec(sqlstmt, function (err, results) {
                                if (err) {
                                    console.log(err.message);
                                    res.status(500).send(err.message);
                                    return;
                                }
                                res.status(200).json(results);
                            });
                        });
                    });
                } else {
                    res.status(500).send(serviceBinding);
                }
            },
            function (err) {
                console.log(err.stack);
                res.status(500).send(err.message);
            });
    } else {
        res.status(403).send('Forbidden');
    }
});


const port = process.env.PORT || 5001;
app.listen(port, function () {
    console.info('Listening on http://localhost:' + port);
});
