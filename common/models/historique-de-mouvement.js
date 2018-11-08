'use strict';

module.exports = function(HistoriqueDeMouvement) {

    HistoriqueDeMouvement.balance = function (req, callback) {

        const movementByCentrales  = HistoriqueDeMouvement.app.models.Centrale.findSafe(req,{}).then(centrales => {
            return HistoriqueDeMouvement.find().then(histos => {
                return histos.filter(histo => centrales.map(central => central.id.toString()).includes(histo.toObject().centraleid));});
        });

        const energieProduite  = movementByCentrales.filter(mouvement =>
                mouvement.toObject().natureDuMouvement==="recharge"
    ).reduce((acc, mouvement) => acc + mouvement.energie, 0);

        const energieConsommee  = movementByCentrales.filter(mouvement =>
                mouvement.toObject().natureDuMouvement==="consomme"
            ).reduce((acc, mouvement) => acc + mouvement.energie, 0);

        energieProduite.then(production => {
            energieConsommee.then(consommationn => {
                callback(null, {"production":production, "consommation":consommationn});
            });
        });
    };

    HistoriqueDeMouvement.balanceParCentrale = function (centraleId, callback) {
        const histos = HistoriqueDeMouvement.find().then(histos => {
            return histos.filter(histo => centraleId.toString()===histo.toObject().centraleid)});

        const energieProduite  = histos.filter(mouvement =>
            mouvement.toObject().natureDuMouvement==="recharge"
        ).reduce((acc, mouvement) => acc + mouvement.energie, 0);

        const energieConsommee  = histos.filter(mouvement =>
            mouvement.toObject().natureDuMouvement==="consomme"
        ).reduce((acc, mouvement) => acc + mouvement.energie, 0);

        energieProduite.then(production => {
            energieConsommee.then(consommation => {
            callback(null, {"production":production, "consommation":consommation});
    });
    });

    };

    HistoriqueDeMouvement.balanceParNatureDeCentrale = function (req, callback) {
       HistoriqueDeMouvement.app.models.Centrale.findSafe(req,{}).then(centrales => {
            return Promise.all(centrales.map( centrale => {
                    return new Promise(function (resolve, reject) {
                        HistoriqueDeMouvement.balanceParCentrale(centrale.id.toString(), function (err, balances) {
                            const retour = {};
                            retour[centrale.nature] = balances;
                            resolve(retour)
                        });
                    })
                })).then(balanceParNature => {
                        callback(null, balanceParNature);
                    });
        });
    };

    HistoriqueDeMouvement.afterRemote('*', function(ctx, methodOutput, next)
    {
        ctx.result={"data": methodOutput, "options": {}};
        next();
    });

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
                path: '/balanceParNatureDeCentrale',
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
