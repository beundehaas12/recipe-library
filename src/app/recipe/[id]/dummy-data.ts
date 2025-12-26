export const DUMMY_RECIPE = {
    title: "Rustic Roasted Tomato Basil Soup",
    subtitle: "A comforting classic, elevated with roasted garlic and fresh herbs.",
    story: "This soup brings the warmth of the Tuscan countryside straight to your kitchen. Inspired by a late-summer harvest in Siena, the key is roasting the tomatoes until they're caramelized and bursting with sweetness. It's not just soup; it's a hug in a bowl, perfect for chilly evenings or a light, sophisticated lunch.",
    author: {
        name: "Elena Fisher",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop",
        handle: "@elenacooks",
        verified: true
    },
    image_url: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?q=80&w=2600&auto=format&fit=crop", // Tomato soup - verified working
    stats: {
        prep_time: "15 min",
        cook_time: "45 min",
        total_time: "1 h",
        calories: "320 kcal",
        servings: 4,
        difficulty: "Easy"
    },
    nutrition: [
        { label: "Protein", value: "12g" },
        { label: "Carbs", value: "15g" },
        { label: "Fat", value: "8g" },
        { label: "Fiber", value: "6g" }
    ],
    tags: ["Vegetarian", "Gluten Free", "Low Carb", "Comfort Food"],
    ingredients: [
        { item: "Roma Tomatoes", amount: "2", unit: "kg", notes: "Halved lengthwise" },
        { item: "Garlic", amount: "1", unit: "head", notes: "Top sliced off" },
        { item: "Fresh Basil", amount: "1", unit: "cup", notes: "Packed leaves, plus more for garnish" },
        { item: "Vegetable Broth", amount: "500", unit: "ml" },
        { item: "Olive Oil", amount: "3", unit: "tbsp" },
        { item: "Red Onion", amount: "1", unit: "large", notes: "Quartered" },
        { item: "Balsamic Vinegar", amount: "1", unit: "tbsp" },
        { item: "Chili Flakes", amount: "1", unit: "tsp", notes: "Optional for heat" }
    ],
    steps: [
        {
            title: "Roast the Vegetables",
            duration: "45 min",
            text: "Preheat oven to 400°F (200°C). Place tomatoes, onion, and garlic head on a baking sheet. Drizzle generously with olive oil, salt, and pepper. Roast for 40-45 minutes until tomatoes are charred and soft."
        },
        {
            title: "Blend the Base",
            duration: "5 min",
            text: "Squeeze the roasted garlic out of its skins. Transfer all roasted vegetables and juices into a blender. Add fresh basil."
        },
        {
            title: "Simmer & Season",
            duration: "10 min",
            text: "Pour the mixture into a pot. Add vegetable broth and bring to a simmer. Stir in balsamic vinegar. Season with more salt/pepper if needed."
        },
        {
            title: "Serve",
            duration: "2 min",
            text: "Ladle into bowls. Top with a swirl of heavy cream or olive oil, fresh basil, and crusty bread on the side."
        }
    ],
    gallery: [
        "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=2070&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=2072&auto=format&fit=crop", // Replaced broken link
        "https://images.unsplash.com/photo-1579631542720-3a87824fff86?q=80&w=2070&auto=format&fit=crop"
    ]
};
