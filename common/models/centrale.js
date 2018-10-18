'use strict';

module.exports = function(Centrale) {

Centrale.beforeRemote ('recharge', function (context, modelInstance, next) {
  let energie = new Number(context.req.body.energie);    
  if (isNaN(energie)) {
    var err = new Error();
    err.message = 'La valeur doit être un nombre';
    err.code = 'NUMERICAL_VALUE_ONLY';
    next(err);
  }
  else if(parseInt(energie)<0){
    var err = new Error();
    err.message = 'La valeur ne peux pas être négative';
    err.code = 'NO_NEGATIVE_VALUE';
    next(err);
  }
  else{
    next();
  }
});


Centrale.recharge = function(id, energie, cb) {
	Centrale.findById(id, function(err, reportModelInstance) {
		if(reportModelInstance==null){
			err = new Error();
			err.message = 'La valeur ne correspond pas à un objet.';
			err.code = 'NO_MATCHING_VALUE';
			cb(err);
		}
		else{
			let energie_post_recharge= parseInt(energie, 10)+parseInt(reportModelInstance.toObject().energie, 10);
			if(parseInt(reportModelInstance.toObject().capacite, 10)<energie_post_recharge){
				err = new Error();
				err.message = 'Capacitée de la centrale dépassée';
				err.code = 'EXCEEDED_CAPACITY';
				cb(err);
			}
			else{
				reportModelInstance.updateAttribute('energie', energie_post_recharge, function(err, reportModelInstance) {
					    cb(null, reportModelInstance);
	      			});
			}
		}
	});
};

Centrale.consomme = function(id, energie, cb) {
	Centrale.findById(id, function(err, reportModelInstance) {
		if(reportModelInstance==null){
			err = new Error();
			err.message = 'La valeur ne correspond pas à un objet.';
			err.code = 'NO_MATCHING_VALUE';
			cb(err);
		}
		else{
			let energie_post_conso= parseInt(reportModelInstance.toObject().energie, 10)-parseInt(energie, 10);
			if(parseInt(reportModelInstance.toObject().capacite, 10)<energie_post_conso){
				err = new Error();
				err.message = 'Pas assez d\'énergie dans la centrale';
				err.code = 'NOT_ENOUGHT_POWER';
				cb(err);
			}
			else{
				reportModelInstance.updateAttribute('energie', energie_post_conso, function(err, reportModelInstance) {
					    cb(null, reportModelInstance);
	      			});
			}
		}
	});
};

Centrale.afterRemoteError ('recharge', function (context, next) { 
  context.error.status = 400;
  delete context.error.stack;
  next();
});  

  Centrale.remoteMethod(
    'recharge', {
      http: {
        path: '/:id/recharge',
        verb: 'post'
      },
      accepts: [
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
