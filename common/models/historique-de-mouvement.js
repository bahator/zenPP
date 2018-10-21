'use strict';

module.exports = function(HistoriqueDeMouvement) {

    //TODO virer les méthodes générées automatiquement
    HistoriqueDeMouvement.disableRemoteMethodByName('patchOrCreate');

    HistoriqueDeMouvement.balance = function (req, callback) {
        HistoriqueDeMouvement.app.models.Centrale.findA(req, function (err, listeCentrales) {

            var energieProduite=0;
            var energieConsommee=0;

            listeCentrales.asyncForEach(function (centrale) {
                HistoriqueDeMouvement.find({},function (err, listeHistoriquesDeMouvement) {
                    listeHistoriquesDeMouvement.filter(histo => histo.toObject().centraleid==centrale.toObject().id).asyncForEach(function (histo) {
                        histo.toObject().natureDuMouvement=="recharge" ? energieProduite+=histo.toObject().energie : energieConsommee+=histo.toObject().energie;
                    });
                });
            });
            callback(err, {"production":energieProduite,"consommation": energieConsommee});
        })
    };

    HistoriqueDeMouvement.balanceparNatureDeCentrale = function (req, callback) {
        HistoriqueDeMouvement.app.models.Centrale.findA(req, function (err, listeCentrales) {

            var mapBalanceparNature = {};

            listeCentrales.asyncForEach(function (centrale) {
                HistoriqueDeMouvement.find({}, function (err, listeHistoriquesDeMouvement) {
                    listeHistoriquesDeMouvement.filter(histo => histo.toObject().centraleid==centrale.toObject().id).asyncForEach(function (histo) {

                        if (mapBalanceparNature[centrale.toObject().nature] !== undefined) {
                            mapBalanceparNature[centrale.toObject().nature] = {
                                "production": 0,
                                "consommation": 0
                            };
                        }

                        if (histo.toObject().natureDuMouvement == "recharge") {
                            mapBalanceparNature[centrale.toObject().nature]["production"] = parseInt(mapBalanceparNature[centrale.toObject().nature]["production"])
                                + histo.toObject().energie;
                        }
                        else {
                            mapBalanceparNature[centrale.toObject().nature]["consommation"] = parseInt(mapBalanceparNature[centrale.toObject().nature]["consommation"])
                                + histo.toObject().energie;
                        }
                    });
                });
            });

            callback(err, jsonMapReturn);
        })
    };

    HistoriqueDeMouvement.remoteMethod(
        'balance', {
            http: {
                path: '/balance',
                verb: 'get'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'} }
            ],
            returns: {
                arg: 'balance',
                type: 'object'
            }
        }
    );
    HistoriqueDeMouvement.remoteMethod(
        'balanceParNatureDeCentrale', {
            http: {
                path: '/balanceparNatureDeCentrale',
                verb: 'get'
            },
            accepts: [
                { arg: 'req', type: 'object', http: {source: 'req'} }
            ],
            returns: {
                arg: 'balanceParNature',
                type: 'object'
            }
        }
    );
};
