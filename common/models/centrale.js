'use strict';
var app = require('../../server/server');
module.exports = function (Centrale) {

    Centrale.histoByCentraleId = function (req, id, callback) {

        Centrale.findSafe(req, {"where" : {"id":id}}).then(function (centraleTrouvee){
            if (centraleTrouvee.length==0) {
                var err = new Error();
                err.status = 400;
                err.message = 'La valeur ne correspond pas à un objet.';
                err.code = 'NO_MATCHING_VALUE';
                callback(err);
            }
            else if(req.accessToken.userId.toString() !== centraleTrouvee[0].userId.toString()){
                var err = new Error();
                err.status = 400;
                err.message = 'L\'identifiant de l\'utilisateur est invalide';
                err.code = 'INVALID_USER';
                callback(err);
            }
            else{
                Centrale.app.models.Historique.find({where: {"centraleid" :id}},callback);
            }
        });
    };

    Centrale.recharge = function (req, id, energie, callback) {
        Centrale.findSafe(req, {where: {"id":id}, limit: 1}).then(function (centraleTrouvee){
            if (centraleTrouvee.length==0) {
                var err = new Error();
                err.status = 400;
                err.message = 'La valeur ne correspond pas à un objet.';
                err.code = 'NO_MATCHING_VALUE';
                callback(err);
            }
            else if(req.accessToken.userId.toString() !== centraleTrouvee[0].userId.toString()){
                    var err = new Error();
                    err.status = 400;
                    err.message = 'L\'identifiant de l\'utilisateur est invalide';
                    err.code = 'INVALID_USER';
                    callback(err);
            }
            else {
                const energie_post_recharge = parseInt(energie, 10) + parseInt(centraleTrouvee[0].toObject().energie, 10);
                if (parseInt(centraleTrouvee[0].toObject().capacite, 10) < energie_post_recharge) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'Capacitée de la centrale dépassée';
                    err.code = 'EXCEEDED_CAPACITY';
                    callback(err);
                }
                else {
                    centraleTrouvee[0].updateAttribute('energie', energie_post_recharge, function (err, centraleUpdated) {
                        err ? callback(err) : Centrale.app.models.HistoriqueDeMouvement.create({
                            "natureDuMouvement": "recharge",
                            "energie": energie,
                            "date": new Date(),
                            "centraleid": id
                        }, callback(null, centraleUpdated));
                    });
                }
            }
        });
    };

    Centrale.consomme = function (req, id, energie, callback) {
        Centrale.findSafe(req, {where: {"id":id}, limit: 1}).then(function (centraleTrouvee){
            if (centraleTrouvee.length==0) {
                var err = new Error();
                err.status = 400;
                err.message = 'La valeur ne correspond pas à un objet.';
                err.code = 'NO_MATCHING_VALUE';
                callback(err);
            }
            else if(req.accessToken.userId.toString() !== centraleTrouvee[0].userId.toString()){
                var err = new Error();
                err.status = 400;
                err.message = 'L\'identifiant de l\'utilisateur est invalide';
                err.code = 'INVALID_USER';
                callback(err);
            }
            else {
                const energie_post_conso = parseInt(centraleTrouvee[0].toObject().energie, 10) - parseInt(energie, 10);
                if (energie_post_conso<0) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'Pas assez d\'énergie dans la centrale';
                    err.code = 'NOT_ENOUGHT_POWER';
                    callback(err);
                }
                else {
                    centraleTrouvee[0].updateAttribute('energie', energie_post_conso, function (err, centraleUpdated) {
                        err ? callback(err) : Centrale.app.models.HistoriqueDeMouvement.create({"natureDuMouvement": "consomme", "energie" : energie, "date": new Date(), "centraleid": id}, callback(null, centraleUpdated));
                    });
                }
            }
        });
    };

    Centrale.findSafe = function (req, filter, callback) {
        return Centrale.find(filter).filter(powerplant => powerplant.toObject().userId.toString()===req.accessToken.userId.toString());
    };

    Centrale.observe('after save', function filterProperties(ctx, next) {
        Centrale.app.models.Historique.create({"date": new Date(),"nature" : ctx.instance.nature, "capacite": ctx.instance.capacite, "energie": ctx.instance.energie, "centraleid": ctx.instance.id},next);
    });

    Centrale.beforeRemote('deleteById', function filterProperties(ctx, arg, next) {

        Centrale.find({"where":{"id":ctx.args.id}}).filter(powerplant => powerplant.toObject().userId.toString()=== ctx.args.options.accessToken.userId.toString()).then(centrale => {
            if(centrale.length===0){
                var err = new Error();
                err.status = 400;
                err.message = 'Aucune donnée à supprimer';
                err.code = 'NO_DATA_To_DELETE';
                next(err);
            }
            else{
                next();
            }
        });
    });

    //Methode controlant les donnees avant qu'une instance ne soit ajouter ou mise a jour en base
    Centrale.observe('before save', function filterProperties(ctx, next) {

        // Controles dans le cas d'un ajout
        if(ctx.instance!== undefined) {
            if (ctx.instance.userId.toString() !== ctx.options.accessToken.userId.toString()) {
                var err = new Error();
                err.status = 400;
                err.message = 'L\'identifiant de l\'utilisateur est invalide';
                err.code = 'INVALID_USER';
                return next(err);
            }
            if (isNaN(ctx.instance.capacite)) {
                var err = new Error();
                err.message = 'La capacité doit être un nombre';
                err.code = 'NUMERICAL_VALUE_ONLY';
                return next(err);
            }
            if (parseInt(ctx.instance.capacite) < 0) {
                var err = new Error();
                err.status = 400;
                err.message = 'La capacité ne peux pas être négative';
                err.code = 'NO_NEGATIVE_VALUE';
                return next(err);
            }
            if (isNaN(ctx.instance.energie)) {
                var err = new Error();
                err.status = 400;
                err.message = 'L\'énergie doit être un nombre';
                err.code = 'NUMERICAL_VALUE_ONLY';
                return next(err);
            }
            if (parseInt(ctx.instance.energie) < 0) {
                var err = new Error();
                err.status = 400;
                err.message = 'L\'énergie ne peux pas être négative';
                err.code = 'NO_NEGATIVE_VALUE';
                return next(err);
            }
            if (parseInt(ctx.instance.capacite) < parseInt(ctx.instance.energie)) {
                var err = new Error();
                err.status = 400;
                err.message = 'La capacité ne peux pas être inférieur à l\'énergie';
                err.code = 'CAPACITE_HIGHTER_OR_EQUAL_TO_ENERGIE';
                return next(err);
            }
        }
        // Controles dans le cas d'une mise a jour
        else if(ctx.currentInstance!== undefined && ctx.data!== undefined){
            if (ctx.data.userId!==undefined){
                var err = new Error();
                err.status = 400;
                err.message = 'Impossible de modifier l\'identifiant utilisateur';
                err.code = 'NO_USER_CHANGE_ALLOWED';
                return next(err);
            }

            if(ctx.options.accessToken!== undefined && ctx.currentInstance.userId.toString() !== ctx.options.accessToken.userId.toString()){
                var err = new Error();
                err.status = 400;
                err.message = 'L\'identifiant de l\'utilisateur est invalide';
                err.code = 'INVALID_USER';
                return next(err);
            }
            if (ctx.data.capacite!==undefined) {
                if (isNaN(ctx.data.capacite)) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'La capacité doit être un nombre';
                    err.code = 'NUMERICAL_VALUE_ONLY';
                    return next(err);
                }
                if (parseInt(ctx.data.capacite) < 0) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'La capacité ne peux pas être négative';
                    err.code = 'NO_NEGATIVE_VALUE';
                    return next(err);
                }
            }

            if (ctx.data.energie!==undefined) {
                if (isNaN(ctx.data.energie)) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'L\'énergie doit être un nombre';
                    err.code = 'NUMERICAL_VALUE_ONLY';
                    return next(err);
                }
                if (parseInt(ctx.data.energie) < 0) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'L\'énergie ne peux pas être négative';
                    err.code = 'NO_NEGATIVE_VALUE';
                    return next(err);
                }
            }

            if (ctx.data.capacite!==undefined) {
                if (ctx.data.energie!==undefined){
                    if(parseInt(ctx.data.capacite) < parseInt(ctx.data.energie)) {
                        var err = new Error();
                        err.status = 400;
                        err.message = 'La capacité ne peux pas être inférieur à l\'énergie';
                        err.code = 'CAPACITE_HIGHTER_OR_EQUAL_TO_ENERGIE';
                        return next(err);
                    }
                }
                else {
                    if(parseInt(ctx.data.capacite) < parseInt(ctx.currentInstance.energie)) {
                        var err = new Error();
                        err.status = 400;
                        err.message = 'La capacité ne peux pas être inférieur à l\'énergie';
                        err.code = 'CAPACITE_HIGHTER_OR_EQUAL_TO_ENERGIE';
                        return next(err);
                    }
                }
            }
            else {
                if(ctx.data.energie!==undefined && parseInt(ctx.data.energie) > parseInt(ctx.currentInstance.capacite)) {
                    var err = new Error();
                    err.status = 400;
                    err.message = 'La capacité ne peux pas être inférieur à l\'énergie';
                    err.code = 'CAPACITE_HIGHTER_OR_EQUAL_TO_ENERGIE';
                    return next(err);
                }
            }
        }
        next();
    });

    Centrale.afterRemoteError('*', function (context, next) {
        delete context.error.stack;
        next();
    });

    Centrale.afterRemote('*', function(ctx, methodOutput, next)
    {
        ctx.result={"data": methodOutput, "options": getUriByMethodName(ctx.method.name)};
        next();
    });

    function getUriByMethodName(name){

        console.log(name);

        const centrales_list_url = {"url":"http://localhost:3000/api/centrales?access_token={user_token}", "args":{}};
        const centrales_create_url = {"url":"http://localhost:3000/api/centrales?access_token={user_token}",
            "args":
            {
                "nature": "string",
                "capacite": "integer",
                "energie": "integer",
                "userId": "string"
            }
        };
        const centrales_update_url = {"url":"http://localhost:3000/api/centrales/{id}?access_token={user_token}&{nature,capacte,energie}",
            "args":
            {
                "{nature}": "string",
                "{capacite}": "integer",
                "{energie}": "integer",
                "{id}": "string"
            }
        };
        const centrales_delete_url = {"url":"http://localhost:3000/api/centrales/{id}?access_token={user_token}",
            "args":
            {
                "id": "string"
            }
        };
        const centrales_consomme_url = {
            "url": "http://localhost:3000/api/centrales/{id}/consomme",
            "args": {
                "id": "string",
                "energie": "positive_integer"
            }
        };
        const centrales_recharge_url = {"url": "http://localhost:3000/api/centrales/{id}/recharge",
            "args":
            {
                "id": "string",
                "energie": "positive_integer"
            }
        };
        const centrales_historiques_url = {"url": "http://localhost:3000/api/centrales/{id}/Historiques",
            "args":
            {
                "id": "string"
            }
        };

        if(name==="findSafe"){
            return {
                "centrales_create_url":centrales_create_url,
                "centrales_update_url":centrales_update_url,
                "centrales_delete_url":centrales_delete_url,
                "centrales_consomme_url":centrales_consomme_url,
                "centrales_recharge_url":centrales_recharge_url,
                "centrales_historiques_url":centrales_historiques_url
            }
        }
        if(name==="create"){
            return {
                "centrales_list_url":centrales_list_url,
                "centrales_update_url":centrales_update_url,
                "centrales_delete_url":centrales_delete_url,
                "centrales_consomme_url":centrales_consomme_url,
                "centrales_recharge_url":centrales_recharge_url,
                "centrales_historiques_url":centrales_historiques_url
            }
        }
        if(name==="deleteById"){
            return {
                "centrales_update_url":centrales_update_url,
                "centrales_consomme_url":centrales_consomme_url,
                "centrales_recharge_url":centrales_recharge_url,
                "centrales_historiques_url":centrales_historiques_url
            }
        }
        if(name==="updateAll"){
            return {
                "centrales_delete_url":centrales_delete_url,
                "centrales_consomme_url":centrales_consomme_url,
                "centrales_recharge_url":centrales_recharge_url,
                "centrales_historiques_url":centrales_historiques_url
            }
        }
        return {};
    }

    function getIdFromUrl(url){
        return url.split('/')[3];
    }

    Centrale.remoteMethod(
        'findSafe', {
            http: {
                path: '/',
                verb: 'get'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'}},
                { arg: 'filter', type: 'string'}
            ],
            returns: {
                arg: 'centrales',
                type: 'object'
            }
        }
    );
    Centrale.remoteMethod(
        'histoByCentraleId', {
            http: {
                path: '/:id/Historiques',
                verb: 'get'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'}},
                {arg: 'id', type: 'string'}
            ],
            returns: {
                arg: 'historique',
                type: 'object'
            }
        }
    );
    Centrale.remoteMethod(
        'recharge', {
            http: {
                path: '/:id/recharge',
                verb: 'post'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'}},
                {arg: 'id', type: 'string'},
                {arg: 'energie', type: 'number'}
            ],
            returns: {
                arg: 'centrale',
                type: 'object'
            }
        }
    );
    Centrale.remoteMethod(
        'consomme', {
            http: {
                path: '/:id/consomme',
                verb: 'post'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'} },
                {arg: 'id', type: 'string'},
                {arg: 'energie', type: 'number'}
            ],
            returns: {
                arg: 'centrale',
                type: 'object'
            }
        }
    );
};
