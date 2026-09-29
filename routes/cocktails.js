const axios = require("axios");
const express = require("express");

const router = express.Router();
const cocktailSearchUrl = "https://www.thecocktaildb.com/api/json/v1/1/search.php";

router.get("/search", (request, response) => {
	response.render("search", { query: "", drink: null, ingredients: [], error: null });
});

router.post("/search", async (request, response) => {
	const query = typeof request.body.drinkName === "string" ? request.body.drinkName.trim() : "";
	if (!query || query.length > 100) {
		return response.status(400).render("search", {
			query: query.slice(0, 100),
			drink: null,
			ingredients: [],
			error: "Enter a cocktail name (up to 100 characters) and try again.",
		});
	}

	try {
		const apiResponse = await axios.get(cocktailSearchUrl, {
			params: { s: query },
			timeout: 8000,
		});
		const drink = apiResponse.data?.drinks?.[0];
		if (!drink) {
			return response.status(404).render("search", {
				query,
				drink: null,
				ingredients: [],
				error: `No cocktail named “${query}” was found. Try another name.`,
			});
		}

		const ingredients = [];
		for (let index = 1; index <= 15; index += 1) {
			const name = drink[`strIngredient${index}`]?.trim();
			if (!name) continue;
			ingredients.push({
				name,
				measure: drink[`strMeasure${index}`]?.trim() ?? "",
			});
		}

		return response.render("search", { query, drink, ingredients, error: null });
	} catch (error) {
		console.error("Cocktail API request failed:", error.message);
		return response.status(502).render("search", {
			query,
			drink: null,
			ingredients: [],
			error: "The cocktail service is unavailable right now. Please try again.",
		});
	}
});

module.exports = router;
