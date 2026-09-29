const apiRandom = "https://www.thecocktaildb.com/api/json/v1/1/random.php";
const apiNonAlcoholic = "https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=Non_Alcoholic";
const apiAlcoholic = "https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=Alcoholic";
const apiFilter = "https://www.thecocktaildb.com/api/json/v1/1/filter.php?";
const apiCategories = "https://www.thecocktaildb.com/api/json/v1/1/list.php?c=list";
const apiIngredients = "https://www.thecocktaildb.com/api/json/v1/1/list.php?i=list";
const apiSearchByFirstLetter = "https://www.thecocktaildb.com/api/json/v1/1/search.php?f=";
const apiSearchByName = "https://www.thecocktaildb.com/api/json/v1/1/search.php?s=";
const apiLookup = "https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=";
const categoryEndpoints = {
	Alcoholic: apiAlcoholic,
	"Non-Alcoholic": apiNonAlcoholic,
};

const drinkForm = document.querySelector("#drink-form");
const drinkResult = document.querySelector("#drink-result");
const searchForm = document.querySelector("#drink-search");
const searchInput = document.querySelector("#drink-search-input");
const searchResults = document.querySelector("#drink-search-results");
const recipeResult = document.querySelector("#recipe-result");
const browseNav = document.querySelector(".browse-nav");
const randomModeSelect = document.querySelector("#random-mode");
const randomFilterControl = document.querySelector("#random-filter-control");
const randomFilterLabel = document.querySelector("#random-filter-label");
const randomFilterSelect = document.querySelector("#random-filter-value");
const dailyNonAlcoholic = document.querySelector("#daily-non-alcoholic");
const dailyAlcoholic = document.querySelector("#daily-alcoholic");
const browseForm = document.querySelector("#browse-form");
const drinkList = document.querySelector("#drink-list");
const drinkDetail = document.querySelector("#drink-detail");
const ingredientPicker = document.querySelector("#ingredient-picker");
const ingredientList = document.querySelector("#ingredient-list");
const pagination = document.querySelector("#pagination");
const browseSubmit = browseForm?.querySelector("button[type='submit']");
const drinksPerPage = 60;
let allCocktails = [];
let filteredCocktails = [];
let allCocktailsLoaded = false;
let browseMode = "all";
let currentPage = 1;
let searchDebounceTimer;
let searchRequestId = 0;

if (searchForm) initializeDrinkSearch();
if (recipeResult) loadRecipePage();
if (browseNav) initializeBrowseMenu(browseNav);

if (drinkForm) {
	drinkForm.addEventListener("submit", (event) => {
		event.preventDefault();
		getRandomDrink(randomModeSelect.value, randomFilterSelect.value);
	});
}

if (randomModeSelect) {
	randomModeSelect.addEventListener("change", updateRandomFilterOptions);
	loadRandomFilterOptions();
}

if (dailyNonAlcoholic) loadDailyCocktail("Non-Alcoholic", dailyNonAlcoholic);
if (dailyAlcoholic) loadDailyCocktail("Alcoholic", dailyAlcoholic);

if (drinkList) {
	drinkList.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-drink-id]");
		if (button) getDrinkDetails(button.dataset.drinkId, drinkDetail, true);
	});
}

if (pagination) {
	pagination.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-page]");
		if (!button || button.disabled) return;

		currentPage = Number(button.dataset.page);
		renderDrinkCards(filteredCocktails);
		drinkList.scrollIntoView({ behavior: "smooth", block: "start" });
	});
}

if (ingredientList) {
	ingredientList.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-ingredient]");
		if (!button) return;

		const ingredientSelect = browseForm.elements.ingredient;
		ingredientSelect.value = ingredientSelect.value === button.dataset.ingredient
			? ""
			: button.dataset.ingredient;
		syncIngredientCards();
		browseCocktails(new FormData(browseForm));
	});
}

if (browseForm) {
	const requestedMode = new URLSearchParams(window.location.search).get("mode");
	const validModes = ["all", "category", "ingredient", "type"];
	if (validModes.includes(requestedMode)) browseMode = requestedMode;
	document.querySelector("#browse-mode-title").textContent = getBrowseModeTitle(browseMode);
	ingredientPicker.hidden = browseMode !== "ingredient";
	if (browseMode === "ingredient") showMessage(ingredientList, "Loading ingredients...");

	for (const select of browseForm.querySelectorAll("select")) {
		select.addEventListener("change", () => browseCocktails(new FormData(browseForm)));
	}

	browseForm.addEventListener("submit", (event) => {
		event.preventDefault();
		browseCocktails(new FormData(browseForm));
	});

	browseForm.addEventListener("reset", () => {
		window.setTimeout(() => {
			browseMode = "all";
			currentPage = 1;
			filteredCocktails = allCocktails;
			document.querySelector("#browse-mode-title").textContent = getBrowseModeTitle(browseMode);
			ingredientPicker.hidden = true;

			const url = new URL(window.location.href);
			url.searchParams.delete("mode");
			window.history.replaceState(null, "", url);
			document.querySelector(".filter-panel").open = false;

			drinkDetail.replaceChildren();
			setAlcoholTheme(browseForm.elements.alcohol.value);
			syncIngredientCards();
			if (!allCocktailsLoaded) {
				showMessage(drinkList, "Loading all cocktails...");
			} else {
				renderDrinkCards(allCocktails);
			}
		}, 0);
	});

	loadFilterOptions();
	loadAllCocktails();
}

async function fetchJson(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Request failed: ${response.status}`);
	return response.json();
}

function initializeBrowseMenu(menu) {
	const toggle = menu.querySelector(".browse-nav-toggle");
	const closeMenu = () => {
		menu.classList.remove("is-open");
		toggle.setAttribute("aria-expanded", "false");
		toggle.setAttribute("aria-label", "Show browse options");
		toggle.blur();
	};

	toggle.addEventListener("click", () => {
		const isOpen = menu.classList.toggle("is-open");
		toggle.setAttribute("aria-expanded", String(isOpen));
		toggle.setAttribute("aria-label", isOpen ? "Hide browse options" : "Show browse options");
		if (!isOpen) toggle.blur();
	});

	menu.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closeMenu();
	});

	document.addEventListener("click", (event) => {
		if (!menu.contains(event.target)) closeMenu();
	});

	menu.addEventListener("focusout", (event) => {
		if (!menu.contains(event.relatedTarget) && !menu.matches(":hover")) closeMenu();
	});
}

function initializeDrinkSearch() {
	searchInput.addEventListener("input", () => {
		window.clearTimeout(searchDebounceTimer);
		searchRequestId += 1;
		const query = searchInput.value.trim();
		if (query.length < 2) {
			hideSearchResults();
			return;
		}

		showSearchMessage("Searching...");
		searchDebounceTimer = window.setTimeout(() => searchCocktailsByName(query), 250);
	});

	searchForm.addEventListener("submit", (event) => {
		event.preventDefault();
		window.clearTimeout(searchDebounceTimer);
		const query = searchInput.value.trim();
		if (query.length < 2) {
			showSearchMessage("Enter at least two letters.");
			return;
		}
		searchCocktailsByName(query, true);
	});

	searchResults.addEventListener("click", (event) => {
		const option = event.target.closest("button[data-drink-id]");
		if (option) openRecipe(option.dataset.drinkId);
	});

	searchInput.addEventListener("keydown", (event) => {
		if (event.key === "ArrowDown" && !searchResults.hidden) {
			event.preventDefault();
			searchResults.querySelector("button[data-drink-id]")?.focus();
		} else if (event.key === "Escape") {
			hideSearchResults();
		}
	});

	searchResults.addEventListener("keydown", (event) => {
		const options = [...searchResults.querySelectorAll("button[data-drink-id]")];
		const activeIndex = options.indexOf(document.activeElement);
		if (event.key === "Escape") {
			hideSearchResults();
			searchInput.focus();
		} else if (event.key === "ArrowDown" && activeIndex < options.length - 1) {
			event.preventDefault();
			options[activeIndex + 1].focus();
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			if (activeIndex <= 0) searchInput.focus();
			else options[activeIndex - 1].focus();
		}
	});

	document.addEventListener("click", (event) => {
		if (!searchForm.contains(event.target)) hideSearchResults();
	});
}

async function searchCocktailsByName(query, openFirstMatch = false) {
	const requestId = ++searchRequestId;
	try {
		const data = await fetchJson(`${apiSearchByName}${encodeURIComponent(query)}`);
		if (requestId !== searchRequestId) return;
		const drinks = (data.drinks ?? []).slice(0, 8);
		if (openFirstMatch && drinks.length > 0) {
			openRecipe(drinks[0].idDrink);
			return;
		}
		renderSearchResults(drinks);
	} catch (error) {
		if (requestId !== searchRequestId) return;
		showSearchMessage("Search is unavailable. Please try again.");
		console.error(error);
	}
}

function renderSearchResults(drinks) {
	searchResults.replaceChildren();
	if (drinks.length === 0) {
		showSearchMessage("No cocktails found.");
		return;
	}

	for (const drink of drinks) {
		const option = document.createElement("button");
		option.type = "button";
		option.className = "search-suggestion";
		option.setAttribute("role", "option");
		option.dataset.drinkId = drink.idDrink;

		const name = document.createElement("span");
		name.className = "search-suggestion-name";
		name.dataset.alcoholType = classifyAlcohol(drink.strAlcoholic);
		name.textContent = drink.strDrink;

		const type = document.createElement("span");
		type.className = "search-suggestion-type";
		type.dataset.alcoholType = classifyAlcohol(drink.strAlcoholic);
		type.textContent = drink.strAlcoholic || "Cocktail";
		option.append(name, type);
		searchResults.append(option);
	}
	searchResults.hidden = false;
	searchInput.setAttribute("aria-expanded", "true");
}

function showSearchMessage(text) {
	const message = document.createElement("p");
	message.className = "search-message";
	message.setAttribute("role", "status");
	message.textContent = text;
	searchResults.replaceChildren(message);
	searchResults.hidden = false;
	searchInput.setAttribute("aria-expanded", "true");
}

function hideSearchResults() {
	searchResults.hidden = true;
	searchInput.setAttribute("aria-expanded", "false");
}

function openRecipe(id) {
	window.location.href = `./recipe.html?id=${encodeURIComponent(id)}`;
}

async function loadRecipePage() {
	const id = new URLSearchParams(window.location.search).get("id");
	if (!id) {
		showMessage(recipeResult, "Search for a cocktail and choose it to view the recipe.");
		return;
	}

	try {
		const drink = await fetchDrinkDetails(id);
		if (!drink) throw new Error("No recipe was returned.");
		const type = classifyAlcohol(drink.strAlcoholic);
		const card = document.querySelector("#recipe-card");
		card.classList.toggle("daily-non-alcoholic", type === "non-alcoholic");
		card.classList.toggle("daily-alcoholic", type === "alcoholic");
		document.querySelector("#recipe-page-title").textContent = drink.strDrink;
		const recipeNavLink = document.querySelector("#recipe-current-link");
		recipeNavLink.href = window.location.href;
		recipeNavLink.textContent = drink.strDrink;
		displayDailyCocktail(drink, recipeResult);
	} catch (error) {
		showMessage(recipeResult, "Could not load this recipe. Try another search.");
		console.error(error);
	}
}

async function getRandomDrink(mode, value) {
	showMessage(drinkResult, "Finding a drink...");

	try {
		let drink;
		if (mode === "All") {
			const data = await fetchJson(apiRandom);
			drink = data.drinks?.[0];
		} else if (mode === "letter") {
			const data = await fetchJson(`${apiSearchByFirstLetter}${encodeURIComponent(value.toLowerCase())}`);
			const drinks = data.drinks ?? [];
			drink = drinks[Math.floor(Math.random() * drinks.length)];
		} else {
			const filterKey = { ingredient: "i", category: "c", type: "a" }[mode];
			const filterValue = value.replaceAll(" ", "_");
			const data = await fetchJson(`${apiFilter}${filterKey}=${encodeURIComponent(filterValue)}`);
			const drinks = data.drinks ?? [];
			const selection = drinks[Math.floor(Math.random() * drinks.length)];
			if (selection) drink = await fetchDrinkDetails(selection.idDrink);
		}

		if (!drink) throw new Error("No drink was returned.");
		displayDrink(drink, drinkResult);
	} catch (error) {
		showMessage(drinkResult, "Could not load a drink. Please try again.");
		console.error(error);
	}
}

async function loadRandomFilterOptions() {
	try {
		const [categoriesData, ingredientsData] = await Promise.all([
			fetchJson(apiCategories),
			fetchJson(apiIngredients),
		]);
		randomFilterOptions.category = (categoriesData.drinks ?? []).map((item) => item.strCategory);
		randomFilterOptions.ingredient = (ingredientsData.drinks ?? []).map((item) => item.strIngredient1);
		updateRandomFilterOptions();
	} catch (error) {
		showMessage(drinkResult, "Could not load search options. Please refresh and try again.");
		console.error(error);
	}
}

const randomFilterOptions = {
	category: [],
	ingredient: [],
};

function updateRandomFilterOptions() {
	const mode = randomModeSelect.value;
	const optionsByMode = {
		All: null,
		category: { label: "Category", placeholder: "Choose a category", values: randomFilterOptions.category },
		ingredient: { label: "Ingredient", placeholder: "Choose an ingredient", values: randomFilterOptions.ingredient },
		letter: { label: "First letter", placeholder: "Choose a letter", values: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"] },
		type: { label: "Drink type", placeholder: "Choose a drink type", values: ["Alcoholic", "Non_Alcoholic"] },
	};
	const config = optionsByMode[mode];
	randomFilterControl.hidden = !config;
	randomFilterSelect.required = Boolean(config);
	randomFilterSelect.replaceChildren();
	if (!config) return;

	randomFilterLabel.textContent = config.label;
	randomFilterSelect.add(new Option(config.placeholder, ""));
	for (const value of config.values) {
		if (value) randomFilterSelect.add(new Option(value.replaceAll("_", " "), value));
	}
}

async function loadDailyCocktail(category, target) {
	try {
		const data = await fetchJson(categoryEndpoints[category]);
		const drinks = data.drinks ?? [];
		if (drinks.length === 0) throw new Error(`No ${category} cocktails were returned.`);

		const date = new Date().toISOString().slice(0, 10);
		const seed = [...`${date}-${category}`].reduce((total, character) =>
			total + character.charCodeAt(0), 0
		);
		const selection = drinks[seed % drinks.length];
		const drink = await fetchDrinkDetails(selection.idDrink);
		if (!drink) throw new Error("No cocktail details were returned.");
		displayDailyCocktail(drink, target);
	} catch (error) {
		showMessage(target, "Could not load today’s cocktail.");
		console.error(error);
	}
}

function displayDailyCocktail(drink, target) {
	const layout = document.createElement("div");
	layout.className = "daily-drink-layout";

	const image = document.createElement("img");
	image.className = "daily-drink-image";
	image.src = drink.strDrinkThumb;
	image.alt = drink.strDrink;

	const recipe = document.createElement("div");
	recipe.className = "daily-drink-recipe";

	const name = document.createElement("h3");
	name.className = "daily-drink-name";
	name.textContent = drink.strDrink;

	const type = document.createElement("p");
	type.className = "daily-drink-type";
	type.textContent = drink.strAlcoholic || "Type unknown";

	const ingredientsHeading = document.createElement("h4");
	ingredientsHeading.textContent = "Ingredients";

	const ingredients = document.createElement("ul");
	for (let index = 1; index <= 15; index += 1) {
		const ingredient = drink[`strIngredient${index}`];
		if (!ingredient) continue;

		const item = document.createElement("li");
		const measure = (drink[`strMeasure${index}`] ?? "").trim();
		item.textContent = measure ? `${measure} ${ingredient}` : ingredient;
		ingredients.append(item);
	}

	const instructionsHeading = document.createElement("h4");
	instructionsHeading.textContent = "Method";

	const instructions = document.createElement("p");
	instructions.textContent = drink.strInstructions ?? "No instructions provided.";

	recipe.append(name, type, ingredientsHeading, ingredients, instructionsHeading, instructions);
	layout.append(image, recipe);
	target.replaceChildren(layout);
}

async function loadFilterOptions() {
	try {
		const categoriesData = await fetchJson(apiCategories);
		populateOptions(browseForm.elements.category, categoriesData.drinks, "strCategory");
	} catch (error) {
		showMessage(drinkList, "Could not load filter options. Please refresh and try again.");
		console.error(error);
	}
}

async function loadAllCocktails() {
	showMessage(drinkList, "Loading all cocktails...");
	browseSubmit.disabled = true;

	try {
		const letters = "abcdefghijklmnopqrstuvwxyz";
		const groups = await Promise.all([...letters].map(async (letter) => {
			const data = await fetchJson(`${apiSearchByFirstLetter}${letter}`);
			return data.drinks ?? [];
		}));
		const uniqueCocktails = new Map(groups.flat().map((drink) => [drink.idDrink, drink]));
		allCocktails = [...uniqueCocktails.values()].sort((first, second) =>
			first.strDrink.localeCompare(second.strDrink)
		);
		filteredCocktails = allCocktails;
		allCocktailsLoaded = true;
		browseSubmit.disabled = false;
		const ingredients = getIngredientNames();
		populateOptions(
			browseForm.elements.ingredient,
			ingredients.map((ingredient) => ({ strIngredient: ingredient })),
			"strIngredient"
		);
		if (browseMode === "ingredient") {
			renderIngredientCards(ingredients);
			showMessage(drinkList, "Choose an ingredient to see matching cocktails.");
		} else {
			renderDrinkCards(allCocktails);
		}
	} catch (error) {
		showMessage(drinkList, "Could not load cocktails. Please refresh and try again.");
		console.error(error);
	}
}

function populateOptions(select, options, property) {
	for (const option of options ?? []) {
		const value = option[property];
		if (value) select.add(new Option(value, value));
	}
}

async function browseCocktails(formData) {
	if (!allCocktailsLoaded) {
		showMessage(drinkList, "Loading all cocktails...");
		return;
	}

	drinkDetail.replaceChildren();
	const category = formData.get("category");
	const ingredient = normalizeFilter(formData.get("ingredient"));
	const selectedAlcohol = formData.get("alcohol");
	const alcohol = normalizeFilter(selectedAlcohol);
	setAlcoholTheme(selectedAlcohol);
	if (!category && !ingredient && !alcohol && browseMode === "ingredient") {
		syncIngredientCards();
		showMessage(drinkList, "Choose an ingredient to see matching cocktails.");
		return;
	}
	const matches = allCocktails.filter((drink) => {
		const matchesCategory = !category || drink.strCategory === category;
		const matchesAlcohol = !alcohol || normalizeFilter(drink.strAlcoholic) === alcohol;
		const matchesIngredient = !ingredient || Array.from({ length: 15 }, (_, index) =>
			normalizeFilter(drink[`strIngredient${index + 1}`])
		).includes(ingredient);
		return matchesCategory && matchesAlcohol && matchesIngredient;
	});
	filteredCocktails = matches;
	currentPage = 1;
	syncIngredientCards();
	renderDrinkCards(matches);
}

function normalizeFilter(value) {
	return value?.toLowerCase().replace(/[\s_]+/g, "_") ?? "";
}

function renderDrinkCards(drinks) {
	if (drinks.length === 0) {
		pagination.replaceChildren();
		showMessage(drinkList, "No cocktails match those filters.");
		return;
	}

	const pageCount = Math.ceil(drinks.length / drinksPerPage);
	currentPage = Math.min(Math.max(currentPage, 1), pageCount);
	const startIndex = (currentPage - 1) * drinksPerPage;
	const pageDrinks = drinks.slice(startIndex, startIndex + drinksPerPage);

	const count = document.createElement("p");
	count.className = "results-count";
	count.textContent = `Showing ${startIndex + 1}-${startIndex + pageDrinks.length} of ${drinks.length} cocktails`;
	if (browseMode === "all") {
		drinkList.replaceChildren(count, ...pageDrinks.map(createDrinkCard));
		renderPagination(pageCount);
		return;
	}

	const groups = new Map();
	for (const drink of pageDrinks) {
		const label = getGroupLabel(drink, browseMode);
		if (!groups.has(label)) groups.set(label, []);
		groups.get(label).push(drink);
	}

	const sections = [...groups.entries()]
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([label, groupDrinks]) => {
			const section = document.createElement("details");
			section.className = "drink-group";

			const summary = document.createElement("summary");
			summary.className = "drink-group-summary";

			const heading = document.createElement("span");
			heading.className = "drink-group-name";
			heading.textContent = label;

			const featuredDrink = groupDrinks[Math.floor(Math.random() * groupDrinks.length)];
			const image = document.createElement("img");
			image.src = featuredDrink.strDrinkThumb;
			image.alt = "";

			const example = document.createElement("span");
			example.className = "drink-group-example";
			example.textContent = `Example: ${featuredDrink.strDrink}`;
			summary.append(heading, image, example);

			const grid = document.createElement("div");
			grid.className = "drink-grid drink-group-grid";
			grid.append(...groupDrinks.map(createDrinkCard));
			section.append(summary, grid);
			return section;
		});

	drinkList.replaceChildren(count, ...sections);
	renderPagination(pageCount);
}

function renderPagination(pageCount) {
	if (pageCount <= 1) {
		pagination.replaceChildren();
		return;
	}

	const buttons = [createPageButton("Previous", currentPage - 1, currentPage === 1)];
	for (let page = 1; page <= pageCount; page += 1) {
		buttons.push(createPageButton(String(page), page, false, page === currentPage));
	}
	buttons.push(createPageButton("Next", currentPage + 1, currentPage === pageCount));
	pagination.replaceChildren(...buttons);
}

function createPageButton(label, page, disabled, isCurrent = false) {
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = label;
	button.dataset.page = String(page);
	button.disabled = disabled;
	if (isCurrent) button.setAttribute("aria-current", "page");
	return button;
}

function createDrinkCard(drink) {
	const button = document.createElement("button");
	button.className = "drink-card";
	button.type = "button";
	button.dataset.drinkId = drink.idDrink;
	button.dataset.alcoholType = classifyAlcohol(drink.strAlcoholic);
	button.setAttribute("aria-label", `Show ${drink.strDrink}`);

	const image = document.createElement("img");
	image.src = drink.strDrinkThumb;
	image.alt = "";
	image.loading = "lazy";

	const name = document.createElement("span");
	name.className = "drink-name";
	name.textContent = drink.strDrink;

	const typeLabel = document.createElement("span");
	typeLabel.className = "drink-type-label";
	typeLabel.textContent = drink.strAlcoholic || "Type unknown";
	button.append(image, name, typeLabel);
	return button;
}

function classifyAlcohol(value) {
	const normalized = normalizeFilter(value);
	if (normalized.includes("optional")) return "optional-alcohol";
	if (normalized.includes("non")) return "non-alcoholic";
	if (normalized.includes("alcohol")) return "alcoholic";
	return "unknown";
}

function setAlcoholTheme(value) {
	const type = classifyAlcohol(value);
	document.body.classList.toggle("alcoholic-theme", type === "alcoholic");
	document.body.classList.toggle("non-alcoholic-theme", type === "non-alcoholic");
	document.body.classList.toggle("optional-alcohol-theme", type === "optional-alcohol");
}

function getIngredientNames() {
	const ingredients = new Set();
	for (const drink of allCocktails) {
		for (let index = 1; index <= 15; index += 1) {
			const ingredient = drink[`strIngredient${index}`]?.trim();
			if (ingredient) ingredients.add(ingredient);
		}
	}
	return [...ingredients].sort((first, second) => first.localeCompare(second));
}

function renderIngredientCards(ingredients) {
	const cards = ingredients.map((ingredient) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "ingredient-card";
		button.dataset.ingredient = ingredient;
		button.setAttribute("aria-pressed", String(browseForm.elements.ingredient.value === ingredient));

		const image = document.createElement("img");
		image.src = `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ingredient)}-Medium.png`;
		image.alt = "";
		image.loading = "lazy";
		image.addEventListener("error", () => {
			const fallback = document.createElement("span");
			fallback.className = "ingredient-image-fallback";
			fallback.textContent = ingredient.slice(0, 1).toUpperCase();
			image.replaceWith(fallback);
		}, { once: true });

		const name = document.createElement("span");
		name.textContent = ingredient;
		button.append(image, name);
		return button;
	});
	ingredientList.replaceChildren(...cards);
}

function syncIngredientCards() {
	if (!ingredientList || !browseForm) return;
	const selectedIngredient = browseForm.elements.ingredient.value;
	for (const button of ingredientList.querySelectorAll("button[data-ingredient]")) {
		button.setAttribute("aria-pressed", String(button.dataset.ingredient === selectedIngredient));
	}
}

function getGroupLabel(drink, mode) {
	if (mode === "category") return drink.strCategory || "Uncategorized";
	if (mode === "type") return drink.strAlcoholic || "Unknown type";
	if (browseForm?.elements.ingredient.value) return browseForm.elements.ingredient.value;

	for (let index = 1; index <= 15; index += 1) {
		const ingredient = drink[`strIngredient${index}`]?.trim();
		if (ingredient) return ingredient;
	}
	return "Other ingredients";
}

function getBrowseModeTitle(mode) {
	const titles = {
		all: "All cocktails",
		category: "Cocktails by category",
		ingredient: "Cocktails by main ingredient",
		type: "Cocktails by drink type",
	};
	return titles[mode] ?? titles.all;
}

async function fetchDrinkDetails(id) {
	const data = await fetchJson(`${apiLookup}${id}`);
	return data.drinks?.[0];
}

async function getDrinkDetails(id, target, scrollToDetails = false) {
	showMessage(target, "Loading cocktail details...");
	try {
		const drink = await fetchDrinkDetails(id);
		if (!drink) throw new Error("No drink details were returned.");
		displayDrink(drink, target);
		if (scrollToDetails) target.scrollIntoView({ behavior: "smooth", block: "start" });
	} catch (error) {
		showMessage(target, "Could not load cocktail details. Please try again.");
		console.error(error);
	}
}

function displayDrink(drink, target) {
	if (target === drinkResult || target === drinkDetail) {
		const type = classifyAlcohol(drink.strAlcoholic);
		target.classList.add("daily-cocktail", "daily-cocktail-content");
		target.classList.toggle("daily-non-alcoholic", type === "non-alcoholic");
		target.classList.toggle("daily-alcoholic", type === "alcoholic");
		if (target === drinkResult) setAlcoholTheme(drink.strAlcoholic);
		displayDailyCocktail(drink, target);
		return;
	}

	const heading = document.createElement("h2");
	heading.textContent = drink.strDrink;

	const category = document.createElement("p");
	category.textContent = drink.strAlcoholic;

	const image = document.createElement("img");
	image.src = drink.strDrinkThumb;
	image.alt = drink.strDrink;

	const ingredientsHeading = document.createElement("h3");
	ingredientsHeading.textContent = "Ingredients";

	const ingredients = document.createElement("ul");
	for (let index = 1; index <= 15; index += 1) {
		const ingredient = drink[`strIngredient${index}`];
		if (!ingredient) continue;

		const item = document.createElement("li");
		const measure = (drink[`strMeasure${index}`] ?? "").trim();
		item.textContent = measure ? `${measure} ${ingredient}` : ingredient;
		ingredients.append(item);
	}

	const instructions = document.createElement("p");
	instructions.textContent = drink.strInstructions ?? "No instructions provided.";
	target.replaceChildren(heading, category, image, ingredientsHeading, ingredients, instructions);
}

function showMessage(target, text) {
	const message = document.createElement("p");
	message.className = "status-message";
	message.textContent = text;
	target.replaceChildren(message);
}

