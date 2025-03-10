const { engine } = require("express-handlebars");
const Handlebars = require("handlebars");
const path = require("path");
const hbsHelper = require("../helpers/hbsHelpers");

module.exports = (app) => {
  app.set("views", path.join(__dirname, "../views"));
  app.set("view engine", "hbs");

  app.engine(
    "hbs",
    engine({
      layoutsDir: path.join(__dirname, "../views/layouts"),
      extname: "hbs",
      defaultLayout: "layout",
      partialsDir: path.join(__dirname, "../views/partials/"),
      helpers: {
        times: (n, block) => {
          let accum = "";
          for (let i = 0; i < n; ++i) {
            accum += block.fn(i);
          }
          return accum;
        },
        subtract: (a, b) => a - b,
      },
      runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
      },
    })
  );

  // Register Handlebars Helpers
  Handlebars.registerHelper(
    hbsHelper.incHelper(Handlebars),
    hbsHelper.incrementHelper(Handlebars),
    hbsHelper.mulHelper(Handlebars),
    hbsHelper.addHelper(Handlebars),
    hbsHelper.isCancelled(Handlebars),
    hbsHelper.registerHelpers(Handlebars),
    hbsHelper.isequal(Handlebars),
    hbsHelper.ifCondition1(Handlebars),
    hbsHelper.length(Handlebars),
    hbsHelper.singleIsCancelled(Handlebars),
    hbsHelper.ifCondition(Handlebars),
    hbsHelper.statushelper(Handlebars),
    hbsHelper.eqHelper(Handlebars),
    hbsHelper.orHelper(Handlebars),
    hbsHelper.addIncludesHelper(Handlebars),
  );
};
