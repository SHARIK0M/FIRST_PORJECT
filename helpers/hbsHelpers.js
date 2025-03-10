const moment = require('moment');

// Helper to decrement two values
function incHelper(Handlebars) {
  Handlebars.registerHelper('inc', function (value, value2) {
      return value - value2;
  });
}

// Helper to increment a value (index)
function incrementHelper (Handlebars) {
  Handlebars.registerHelper('increment', function(index) {
    return index + 1;
  });
}


function orHelper(Handlebars) {
  Handlebars.registerHelper("or", function (...args) {
      // Remove the last argument (which is 'options' provided by Handlebars)
      args.pop();
      
      // Check if any argument is truthy
      return args.some(arg => arg);
  });
}

function registerGtHelper(Handlebars) {
  Handlebars.registerHelper('gt', function(a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  });
}

// Helper to multiply two values
function mulHelper(Handlebars) {
  Handlebars.registerHelper('multiply', function (value1, value2) {
      return value1 * value2;
  });
}

// Helper to add two values
function addHelper(Handlebars) {
  Handlebars.registerHelper('add', function (value1, value2) {
      return value1 + value2;
  });
}

function addIncludesHelper(hbs) {
  hbs.registerHelper("includes", function (array, value) {
    return array && array.includes(value);
  });
}
// Helper to check if two values are equal
function isequal(Handlebars) {
  Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  });
}

// Helper for conditional comparison based on an operator
function ifCondition1(Handlebars){
    Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    });
}

// Helper to check the status of an order (cancelled, returned, etc.)
function isCancelled(Handlebars) {
  Handlebars.registerHelper('statuchecker', function (value) {
      let ct = 0;
      let ct2 = 0;
      value.product.forEach((elem) => {
          if (elem.isReturned) ct++;
      });
      value.product.forEach((elem) => {
          if (elem.isCancelled) ct2++;
      });

      let allCancelled = value.product.every(product => product.isCancelled);
      let allReturned = value.product.every(product => product.isReturned);

      if (value.status === "Delivered") {
          return new Handlebars.SafeString(`
              <button id="returnOrder" data-order-id="${value._id}" class="btn btn-sm btn-primary">Return Entire Order</button>
          `);
      } else if (value.status == "Returned") {
          return new Handlebars.SafeString('<span class="badge rounded-pill alert-info text-info">Order Returned</span>');
      } else if (value.status === "Payment Failed") {       
        return new Handlebars.SafeString(`
          <button id="retryPayment" data-order-id="${value._id}" class="btn btn-sm btn-warning">Retry Payment</button>
        `);
      } 
      else {
          if (allCancelled || value.status === 'Cancelled') {
              return new Handlebars.SafeString('<span class="badge rounded-pill alert-danger text-danger">Order Cancelled</span>');
          } else if (ct > 0) {
              return new Handlebars.SafeString('<span class="badge rounded-pill alert-info text-info">Order Returned</span>');
          } else {
              return new Handlebars.SafeString(`
                  <button id="cancelOrder" data-order-id="${value._id}" class="btn btn-sm btn-primary">Cancel Entire Order</button>
              `);
          }
      }
  });
}

// Helper to check individual product status (returned/cancelled)
function singleIsCancelled(Handlebars) {
  Handlebars.registerHelper('singlestatuchecker', function (product, options) {
      if (product.isReturned) {
          return new Handlebars.SafeString('<span class="badge rounded-pill alert-info text-info">Returned</span>');
      } else if (product.isCancelled) {
          return new Handlebars.SafeString('<span class="badge rounded-pill alert-danger text-danger">Cancelled</span>');
      } else {
          return options.fn(this);
      }
  });
}

// Helper to check if two values are equal for conditional rendering
function statushelper(Handlebars){
  Handlebars.registerHelper('ifeq', function (a, b, options) {
      if (a == b) { return options.fn(this); }
      return options.inverse(this);
  });
}

// Helper to check if a value has length
function length(Handlebars) {
  Handlebars.registerHelper('length', function (value, options) {
      if (value && value.length > 0) {
          return options.fn(this);
      } else {
          return options.inverse(this);
      }
  });
}

// Helper to format date in a readable format
function registerHelpers(Handlebars) {
    // Helper to format date in a readable format
    Handlebars.registerHelper("formatDate", function (isoDate) {
      return moment(isoDate).format("DD-MM-YYYY HH:mm:ss");
    });
  
    // Helper to compare two values
    Handlebars.registerHelper("ifCond", function (v1, operator, v2, options) {
      switch (operator) {
        case "==":
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });
  }

// General conditional helper for various operators
function ifCondition(Handlebars) {
  Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
      switch (operator) {
          case '==':
              return (v1 == v2) ? options.fn(this) : options.inverse(this);
          case '===':
              return (v1 === v2) ? options.fn(this) : options.inverse(this);
          case '!=':
              return (v1 != v2) ? options.fn(this) : options.inverse(this);
          case '!==':
              return (v1 !== v2) ? options.fn(this) : options.inverse(this);
          case '<':
              return (v1 < v2) ? options.fn(this) : options.inverse(this);
          case '<=':
              return (v1 <= v2) ? options.fn(this) : options.inverse(this);
          case '>':
              return (v1 > v2) ? options.fn(this) : options.inverse(this);
          case '>=':
              return (v1 >= v2) ? options.fn(this) : options.inverse(this);
          case '&&':
              return (v1 && v2) ? options.fn(this) : options.inverse(this);
          case '||':
              return (v1 || v2) ? options.fn(this) : options.inverse(this);
          default:
              return options.inverse(this);
      }
  });
} 

// Helper to check strict equality
function eqHelper(Handlebars) {
    Handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });
}

module.exports = {
  incHelper,
  incrementHelper,
  mulHelper,
  addHelper,
  isCancelled,
  registerHelpers,
  isequal,
  ifCondition1,
  length,
  statushelper,
  ifCondition,
  singleIsCancelled,
  eqHelper,
  orHelper,
  addIncludesHelper
}
