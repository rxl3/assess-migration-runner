const soap = require('soap');
const csvParse = require('csv-parse');
const fs = require('fs');
const url = 'https://soacs-uat.afgonline.com.au/assess/migration/MigrateApplicationPS?wsdl';
const args = {_xml: '<mig:MigrateApplicationRequest xmlns:mig="http://xmlns.oracle.com/assess/MigrateApplicationPS"><mig:lrn>?</mig:lrn></mig:MigrateApplicationRequest>'};
const stream = fs.createWriteStream('logs.txt', {flags: 'a'});
const errorStream = fs.createWriteStream('errors.txt', {flags: 'a'});

let appsToMigrate = [];
const parser = csvParse({
    delimiter: ','
}, (err, output) => {
    output.shift(); // Remove title row
    appsToMigrate = output;
    // console.log(appsToMigrate);
    appsToMigrate.forEach(app => {
        migrateApp(app[0]);//, app[1], app[2]);
        console.log('Migrating Application: ' + app[0]);// + ' with options: ' + app[1] + ', ' + app[2]);
    });
});
fs.createReadStream(process.argv[2]).pipe(parser);

function migrateApp(appID, optionA, optionB) {
    stream.write('(' + appID + ') Attempting to migrate app\n');
    soap.createClientAsync('./MigrateApplicationPS.xml')
    .then(client => {
        args['_xml'] = '<mig:MigrateApplicationRequest xmlns:mig="http://xmlns.oracle.com/assess/MigrateApplicationPS"><mig:lrn>' + appID + '</mig:lrn></mig:MigrateApplicationRequest>';
        return client.MigrateAsync(args);
    })
    .then(result => {
        stream.write('(' + appID + ') Successful migration\n');
    })
    .catch(err => {
        if (!err.response.body.includes('<successfullyLodged>true</successfullyLodged>')) {
            stream.write('(' + appID + ') FAILED migrating\n');
            stream.write('Error log: ' + err + '\n');
            errorStream.write(appID + ': ' + err + '\n');
        } else {
            stream.write('(' + appID + ') Successful migration\n');
        }
    });
}
