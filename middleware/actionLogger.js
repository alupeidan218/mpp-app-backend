const UserAction = require('../models/UserAction');

const getActionType = (method) => {
  switch (method) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'UNKNOWN';
  }
};

const getEntityId = (req) => {
  return req.params.id || null;
};

const actionLogger = (entityType) => async (req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    
    // Only log successful operations
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const action = getActionType(req.method);
      const entityId = getEntityId(req);
      
      UserAction.create({
        userId: req.user.id,
        action,
        entityType,
        entityId,
        details: {
          method: req.method,
          path: req.path,
          body: req.body,
          params: req.params,
          query: req.query
        }
      }).catch(error => {
        console.error('Error logging user action:', error);
      });
    }
    
    return res.send(data);
  };
  
  next();
};

module.exports = actionLogger; 