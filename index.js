const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.post('/xml-rpc', (req, res) => {
    let xmlRpc = `<?xml version="1.0"?>`;
    const xmlRpcResult = xmlRpc + jsonToXmlRpc(req.body, null, false);
    res.send(xmlRpcResult);
});

app.post('/soap', (req, res) => {


    let soapVar = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <soapenv:Header>
        </soapenv:Header>
        <soapenv:Body>`;
    soapVar += jsonToXmlRpc(req.body, null, true) + `</soapenv:Body>
    </soapenv:Envelope>`;

    res.send(soapVar);
});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));

function createXmlStringFromJson(xml, value, key, isSoap) {
    if (isSoap) {
        xml.push(`<xs:element name="${key}" type="xs:string" value="${value.replace(/[<>&]/, ch => {

        })}"/>`);
        return;
    }
    xml.push('<string>');
    xml.push(value.replace(/[<>&]/, ch => {

    })); //escape for XML!
    xml.push('</string>');
}

function createXmlNumberFromJsonInput(jsonInput, xml, key, isSoap) {
    if (!isFinite(jsonInput))
        xml.push('<nil/>');
    else if (parseInt(jsonInput) === Math.ceil(jsonInput)) {
        if (isSoap) {
            xml.push(`<xs:element name="${key}" type="xs:integer" value="${jsonInput.toString()}"/>`);
            return;
        }
        xml.push('<int>');
        xml.push(jsonInput.toString());
        xml.push('</int>');
    } else {
        if (isSoap) {
            xml.push(`<xs:element name="${key}" type="xs:integer" value="${jsonInput.toString()}"/>`);
            return;
        }
        xml.push('<double>');
        xml.push(jsonInput.toString());
        xml.push('</double>');
    }
}

function createXmlBooleanFromJsonInput(xml, jsonInput, key, isSoap) {
    if (isSoap) {
        xml.push(`<xs:element name="${key}" type="xs:boolean" value="${jsonInput.toString()}"/>`);
        return;
    }
    xml.push('<boolean>');
    xml.push(jsonInput ? '1' : '0');
    xml.push('</boolean>');
}

function createXmlObjectFromJsonInput(jsonInput, xml, key, isSoap) {
    if (jsonInput === null) {
        xml.push('<nil/>');
    } else if (jsonInput instanceof Array) {
        if (!isSoap) {
            xml.push('<array><data>');
        }
        if (isSoap) {
            xml.push(`<${key} SOAP-ENC:arrayType="xsd:${typeof jsonInput[0]}[${jsonInput.length}]">`);
        }
        for (let i of jsonInput) {
            xml.push(jsonToXmlRpc(i, key, isSoap));
        }
        if (!isSoap) {
            xml.push('</data></array>');
        }
        if (isSoap) {
            xml.push(`</${key}>`);
        }
    } else {
        xml.push('<struct>');
        const useHasOwn = !!{}.hasOwnProperty; //From Ext's JSON.js
        for (const key in jsonInput) {
            if (!useHasOwn || jsonInput.hasOwnProperty(key)) {
                if (!isSoap) {
                    xml.push('<member>');
                    xml.push('<name>' + key + '</name>'); //Excape XML!
                }
                xml.push(jsonToXmlRpc(jsonInput[key], key, isSoap));
                if (!isSoap) {
                    xml.push('</member>');
                }
            }
        }
        xml.push('</struct>');
    }
}

const jsonToXmlRpc = (jsonInput, key, isSoap) => {
    let xml = isSoap ? [] : ['<value>'];

    switch (typeof jsonInput) {
        case 'number':
            createXmlNumberFromJsonInput(jsonInput, xml, key, isSoap);
            break;
        case 'boolean':
            createXmlBooleanFromJsonInput(xml, jsonInput, key, isSoap);
            break;
        case 'string':
            createXmlStringFromJson(xml, jsonInput, key, isSoap);
            break;
        case 'object':
            createXmlObjectFromJsonInput(jsonInput, xml, key, isSoap);
            break;
        default:
            throw new TypeError('Unable to convert the value of type "' + typeof (jsonInput) + '" to XML-RPC.'); //(' + String(value) + ')
    }
    if (!isSoap) {
        xml.push('</value>');
    }
    return xml.join('');
};
