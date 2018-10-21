'use strict';
var app = require('../../server/server');
module.exports = function (Centrale) {

    //TODO virer les méthodes générées automatiquement
    Centrale.disableRemoteMethodByName('patchOrCreate');

    Centrale.beforeRemote('recharge', function (context, modelInstance, next) {
        let energie = new Number(context.req.body.energie);
        if (isNaN(energie)) {
            var err = new Error();
            err.message = 'L\'énergie doit être un nombre';
            err.code = 'NUMERICAL_VALUE_ONLY';
            return next(err);
        }
        if (parseInt(energie) < 0) {
            var err = new Error();
            err.message = 'L\'énergie ne peux pas être négative';
            err.code = 'NO_NEGATIVE_VALUE';
            return next(err);
        }
        next();
    });

    Centrale.beforeRemote('consomme', function (context, modelInstance, next) {
        let energie = new Number(context.req.body.energie);
        if (isNaN(energie)) {
            var err = new Error();
            err.message = 'L\'énergie doit être un nombre';
            err.code = 'NUMERICAL_VALUE_ONLY';
            return next(err);
        }
        if (parseInt(energie) < 0) {
            var err = new Error();
            err.message = 'L\'énergie ne peux pas être négative';
            err.code = 'NO_NEGATIVE_VALUE';
            return next(err);
        }
        next();
    });

    //TODO rename pour override la fonction native bypassant les controles
    Centrale.histoByCentraleId = function (req, id, cb) {
        var userId = req.accessToken.userId;
        Centrale.findById(id, function (err, reportModelInstance) {
            if(reportModelInstance == null || req.accessToken.userId.toString()!==reportModelInstance.toObject().userId.toString()){
                err = new Error();
                err.message = 'La valeur ne correspond pas à un objet.';
                err.code = 'NO_MATCHING_VALUE';
                cb(err);
            }
            else{
                return Centrale.app.models.Historique.find({where: {"centraleid" :id}},cb);
            }

        });
    };

    Centrale.recharge = function (req, id, energie, callback) {
        Centrale.find({where: {"id":id, "userId": req.accessToken.userId.toString()}, limit: 1}, function (err, centraleTrouvee) {
            if (centraleTrouvee.length==0) {
                err = new Error();
                err.message = 'La valeur ne correspond pas à un objet.';
                err.code = 'NO_MATCHING_VALUE';
                callback(err);
            }
            else {
                let energie_post_recharge = parseInt(energie, 10) + parseInt(centraleTrouvee[0].toObject().energie, 10);
                if (parseInt(centraleTrouvee[0].toObject().capacite, 10) < energie_post_recharge) {
                    err = new Error();
                    err.message = 'Capacitée de la centrale dépassée';
                    err.code = 'EXCEEDED_CAPACITY';
                    callback(err);
                }
                else {
                    centraleTrouvee[0].updateAttribute('energie', energie_post_recharge, function (err, centraleUpdated) {
                        err ? callback(err) : Centrale.app.models.HistoriqueDeMouvement.create({"natureDuMouvement": "recharge", "energie" : energie, "date": new Date(), "centraleid": id}, callback(null, centraleUpdated));
                    });
                }
            }
        });
    };

    Centrale.consomme = function (req, id, energie, callback) {
        Centrale.find({where: {"id":id, "userId": req.accessToken.userId.toString()}, limit: 1}, function (err, centraleTrouvee) {
            if (centraleTrouvee.length==0) {
                err = new Error();
                err.message = 'La valeur ne correspond pas à un objet.';
                err.code = 'NO_MATCHING_VALUE';
                callback(err);
            }
            else {
                let energie_post_conso = parseInt(centraleTrouvee[0].toObject().energie, 10) - parseInt(energie, 10);
                if (parseInt(centraleTrouvee[0].toObject().capacite, 10) < energie_post_conso) {
                    err = new Error();
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

   Centrale.findA = function (req, callback) {
       Centrale.find({where: {"userId": req.accessToken.userId.toString()}, limit: 1}, function (err, centralesTrouvees) {
           callback(err, centralesTrouvees);
       });
    };

    Centrale.observe('before save', function filterProperties(ctx, next) {
        if(ctx.instance!== undefined) {
            if (ctx.instance.userId.toString() !== ctx.options.accessToken.userId.toString()) {
                var err = new Error();
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
                err.message = 'La capacité ne peux pas être négative';
                err.code = 'NO_NEGATIVE_VALUE';
                return next(err);
            }
            if (isNaN(ctx.instance.energie)) {
                var err = new Error();
                err.message = 'L\'énergie doit être un nombre';
                err.code = 'NUMERICAL_VALUE_ONLY';
                return next(err);
            }
            if (parseInt(ctx.instance.energie) < 0) {
                var err = new Error();
                err.message = 'L\'énergie ne peux pas être négative';
                err.code = 'NO_NEGATIVE_VALUE';
                return next(err);
            }
        }
        next();
    });

    Centrale.afterRemoteError('recharge', function (context, next) {
        context.error.status = 400;
        delete context.error.stack;
        next();
    });

    Centrale.observe('after save', function filterProperties(ctx, next) {
        Centrale.app.models.Historique.create({"date": new Date(),"nature" : ctx.instance.nature, "capacite": ctx.instance.capacite, "energie": ctx.instance.energie, "centraleid": ctx.instance.id},next);
    });

    Centrale.remoteMethod(
        'histoByCentraleId', {
            http: {
                path: '/:id/histoByCentraleId',
                verb: 'get'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'} },
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
    Centrale.remoteMethod(
        'findHistoriquesDeMouvement', {
            http: {
                path: '/:id/findHistoriquesDeMouvement',
                verb: 'get'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'} },
                {arg: 'id', type: 'string'}
            ],
            returns: {
                arg: 'centrale',
                type: 'object'
            }
        }
    );
};
