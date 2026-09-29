const path = require("node:path");
const express = require("express");
const cocktailRoutes = require("./routes/cocktails");

const app = express();
const port = Number(process.env.PORT) || 3001;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/", cocktailRoutes);

app.use((request, response) => {
	response.status(404).send("Page not found.");
});

if (require.main === module) {
	app.listen(port, () => {
		console.log(`Pour Decisions is running at http://localhost:${port}`);
	});
}

module.exports = app;
