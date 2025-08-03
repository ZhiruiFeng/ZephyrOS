// Artillery.io processor functions for custom test logic

module.exports = {
  // Generate random string for unique test data
  randomString: function(userContext, events, done) {
    userContext.vars.randomString = Math.random().toString(36).substring(7);
    return done();
  },

  // Generate random choice from array
  randomChoice: function(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
  },

  // Set authentication if needed
  setAuth: function(requestParams, context, ee, next) {
    // Add authentication headers if needed in the future
    // requestParams.headers = requestParams.headers || {};
    // requestParams.headers['Authorization'] = 'Bearer ' + context.vars.token;
    return next();
  },

  // Log response for debugging
  logResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log(`Error response: ${response.statusCode} - ${response.body}`);
    }
    return next();
  },

  // Validate memory object structure
  validateMemoryStructure: function(requestParams, response, context, ee, next) {
    if (response.statusCode === 200 || response.statusCode === 201) {
      try {
        const data = JSON.parse(response.body);
        if (Array.isArray(data)) {
          // Validate array of memories
          data.forEach(memory => {
            if (!memory.id || !memory.type || !memory.content || !memory.created_at) {
              ee.emit('error', new Error('Invalid memory structure'));
            }
          });
        } else {
          // Validate single memory
          if (!data.id || !data.type || !data.content || !data.created_at) {
            ee.emit('error', new Error('Invalid memory structure'));
          }
        }
      } catch (e) {
        ee.emit('error', new Error('Invalid JSON response'));
      }
    }
    return next();
  }
};