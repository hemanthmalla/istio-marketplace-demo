var express = require('express');
var app = express();
var request = require('request');
var morgan = require('morgan')

var redis = require("redis");
var client = redis.createClient(6379, "cache-redis.istio-demo.svc.cluster.local");
const uuidv4 = require('uuid/v4');
const uid = require('uid');

var router = express.Router();

var get_router = function(){
    switch(process.env.SERVICE){
        case "users":
            router.use("/login", login);
            router.use("/verify", verify);
            return router;
        case "cart":
            router.use("/", verify_api, cart);
            return router;
        case "payment":
            router.use("/", verify_api, payment);
            return router;
        case "fulfillment":
            router.use("/", verify_api, fulfillment);
            return router;
        case "shipper_v1":
            router.use("/", shipper_v1);
            return router;
        case "shipper_v2":
            router.use("/", shipper_v2);
            return router;
        case "notification":
            router.use("/", notification);
            return router;
        case "marketplace":
            router.use("/", marketplace);
            return router;
        default:
            return router;
    }
}

var process_headers = function(req){
    var services = ["cart", "fulfillment","marketplace", "notification", "payment", "shipper", "users"];
    var headers = {
        "x-request-id": req.headers["x-request-id"],
        "x-b3-traceid": req.headers["x-b3-traceid"],
        "x-b3-spanid": req.headers["x-b3-spanid"],
        "x-b3-parentspanid": req.headers["x-b3-parentspanid"],
        "x-b3-sampled": req.headers["x-b3-sampled"],
        "x-b3-flags": req.headers["x-b3-flags"],
        "x-ot-span-context": req.headers["x-ot-span-context"]
    }

    for(var i=0;i<services.length;i++) headers[services[i]] = req.headers[services[i]];
    return headers;
}

var login = function(req, res, next) {
    client.get(req.query.uname, function(err, pass){
        if(pass != req.query.pass) return res.send(403);
        else{
            var token = uuidv4();
            client.set("token:" + token, req.query.uname, function(err, data){
                if(err) res.sendStatus(503);
                else{
                    res.status(200).send({"token": token, "version": process.env.APP_VERSION});
                }
            });
        }
    });
};

var verify = function(req, res, next){
    client.get("token:" + req.query.token, function(err, data){
        if(err) res.send(503);
        else{
            if(data == null) res.send(403);
            else res.status(200).send({"uname": data, "version": process.env.APP_VERSION});
        }
    })
}

var verify_api = function(req, res, next){
    request({"url": "http://users:3000/verify", "qs": req.query, "headers": process_headers(req)}, function (error, response, body) {
        if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
        else {
            body = JSON.parse(body);
            req.uname = body.uname;
            next();
        }
    });
}

var cart = function(req, res, next){
    client.incr("orderid", function(err, data){
        if(err) res.sendStatus(503);
        else res.status(200).send({"orderid": "test" + data, "version": process.env.APP_VERSION});
    });
}

var payment = function(req, res, next){
    client.set("paytment"+req.orderid, "true", function(err, data){
        if(err) res.sendStatus(503);
        else res.status(200).send({"version": process.env.APP_VERSION, "status": "success"});
    });
}

var fulfillment = function(req, res, next){
    client.get("paytment"+req.orderid, function(err, data){
        if(err) res.sendStatus(503);
        else {
            if(data != "true") res.sendStatus(404);
            else {
                var resp = {
                    "ff_id": uuidv4(),
                    "version": process.env.APP_VERSION
                }
                request({"url": "http://shipper:3000", "headers": process_headers(req)}, function (error, response, body) {
                    if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
                    else {
                        body = JSON.parse(body);
                        resp.shipment = body;
                        request({"url": "http://notification:3000", "headers": process_headers(req)}, function (error, response, body) {
                            if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
                            else {
                                body = JSON.parse(body);
                                resp.notification = body;
                                res.status(200).send({"fulfillment": resp, "version": process.env.APP_VERSION});
                            }
                        });
                    }
                });
            }
        }
    });
}

var shipper_v1 = function(req, res, next){
    res.status(200).send({"tracking_id": uid(), "version": process.env.APP_VERSION});
}

var shipper_v2 = function(req, res, next){
    res.status(200).send({"tracking_id": uuidv4(), "version": process.env.APP_VERSION});
}

var notification = function(req,res, next){
    var time = process.env.NOT_DELAY ? process.env.NOT_DELAY : 1;
    setTimeout(function(){res.status(200).send({"status" : "success", "version": process.env.APP_VERSION})}, time * 1000);
}

var marketplace = function(req, res, next){
    request({"url": "http://users:3000/login", "qs": req.query, "headers": process_headers(req)}, function (error, response, body) {
        if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
        else {
            body = JSON.parse(body);
            req.query.token = body.token;
            var resp = {
                    "sso_token": body.token,
                    "mkt_version": process.env.APP_VERSION
            }
            request({"url": "http://cart:3000", "qs": req.query, "headers": process_headers(req)}, function (error, response, body) {
                if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
                else {
                    body = JSON.parse(body);
                    resp.cart = body;
                    req.query.orderid = body.orderid;

                    request({"url": "http://payment:3000", "qs": req.query, "headers": process_headers(req)}, function (error, response, body) {
                        if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
                        else {
                            body = JSON.parse(body);
                            resp.payment = body;

                            request({"url": "http://fulfillment:3000", "qs": req.query, "headers": process_headers(req)}, function (error, response, body) {
                                if(response && (response.statusCode != 200)) res.sendStatus(response.statusCode);
                                else {
                                    body = JSON.parse(body);
                                    resp.fulfillment = body;
                                    res.status(200).send({"fulfillment": resp, "version": process.env.APP_VERSION});
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

app.use(morgan('combined'))
app.use(get_router());
app.listen(3000, () => console.log(process.env.SERVICE + ' listening on port 3000!'));



