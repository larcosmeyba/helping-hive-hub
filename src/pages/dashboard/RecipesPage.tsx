import { useState } from "react";
import { BookOpen, Search, DollarSign, Clock, Users, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORIES = ["All", "Budget Friendly", "Quick Meals", "Slow Cooker", "Pantry Staples", "High Protein", "Vegetarian", "Family Favorites", "Holiday", "Special Occasions"];

interface Recipe {
  title: string;
  category: string;
  cost: number;
  time: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image: string;
  ingredients: string[];
  instructions: string[];
}

const RECIPES: Recipe[] = [
  { title: "One-Pot Chicken & Rice", category: "Budget Friendly", cost: 8.50, time: 35, servings: 4, calories: 520, protein: 35, carbs: 55, fats: 14, image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop", ingredients: ["4 chicken thighs", "2 cups rice", "1 can diced tomatoes", "Onion", "Garlic", "Chicken broth", "Paprika, cumin"], instructions: ["Season chicken with paprika and cumin", "Sear in pot until golden (5 min/side)", "Remove chicken, sauté onion and garlic", "Add rice, tomatoes, broth", "Nestle chicken on top, cover, cook 20 min"] },
  { title: "Budget Beef Tacos", category: "Budget Friendly", cost: 9.20, time: 25, servings: 4, calories: 530, protein: 28, carbs: 42, fats: 26, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", ingredients: ["1 lb ground beef", "Taco seasoning", "Tortillas", "Lettuce", "Tomatoes", "Cheese", "Sour cream"], instructions: ["Brown beef in skillet", "Add taco seasoning and water", "Simmer 5 minutes", "Warm tortillas", "Assemble tacos with toppings"] },
  { title: "Pasta Primavera", category: "Budget Friendly", cost: 7.50, time: 20, servings: 4, calories: 480, protein: 16, carbs: 62, fats: 18, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", ingredients: ["1 lb penne", "Zucchini", "Bell peppers", "Cherry tomatoes", "Garlic", "Olive oil", "Parmesan"], instructions: ["Cook pasta al dente", "Sauté vegetables in olive oil", "Add garlic, cook 1 min", "Toss with pasta", "Top with parmesan"] },
  { title: "Salmon & Roasted Veggies", category: "High Protein", cost: 14.00, time: 30, servings: 4, calories: 480, protein: 38, carbs: 22, fats: 26, image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop", ingredients: ["4 salmon fillets", "Broccoli", "Sweet potatoes", "Olive oil", "Lemon", "Garlic", "Herbs"], instructions: ["Preheat oven to 400°F", "Cube sweet potatoes, toss with oil", "Roast 15 min, add broccoli", "Season salmon, add to pan", "Roast 12-15 min more"] },
  { title: "Shrimp Stir Fry", category: "Quick Meals", cost: 13.50, time: 20, servings: 4, calories: 420, protein: 30, carbs: 38, fats: 16, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop", ingredients: ["1 lb shrimp", "Rice", "Broccoli", "Snap peas", "Soy sauce", "Sesame oil", "Ginger", "Garlic"], instructions: ["Cook rice", "Heat sesame oil in wok", "Cook shrimp 2 min/side, remove", "Stir-fry vegetables", "Return shrimp, add soy sauce"] },
  { title: "15-Minute Fried Rice", category: "Quick Meals", cost: 6.00, time: 15, servings: 4, calories: 500, protein: 20, carbs: 62, fats: 18, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", ingredients: ["3 cups cooked rice", "2 eggs", "Frozen peas & carrots", "Soy sauce", "Sesame oil", "Green onions"], instructions: ["Heat oil in large skillet", "Scramble eggs, set aside", "Add rice, cook until slightly crispy", "Add vegetables, soy sauce", "Return eggs, toss together"] },
  { title: "Sheet Pan Fajitas", category: "Quick Meals", cost: 10.00, time: 25, servings: 4, calories: 460, protein: 28, carbs: 35, fats: 22, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", ingredients: ["Chicken breast", "Bell peppers (3 colors)", "Onion", "Fajita seasoning", "Tortillas", "Lime"], instructions: ["Preheat oven to 425°F", "Slice chicken and vegetables", "Toss with seasoning and oil", "Spread on sheet pan", "Roast 20 min, serve in tortillas"] },
  { title: "Slow Cooker Chili", category: "Slow Cooker", cost: 9.00, time: 240, servings: 6, calories: 520, protein: 28, carbs: 48, fats: 20, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", ingredients: ["1 lb ground beef", "Kidney beans", "Black beans", "Diced tomatoes", "Onion", "Chili powder", "Cumin"], instructions: ["Brown beef and onion", "Add all ingredients to slow cooker", "Cook on low 6-8 hours", "Stir and adjust seasoning", "Serve with toppings"] },
  { title: "Pot Roast", category: "Slow Cooker", cost: 12.00, time: 300, servings: 6, calories: 580, protein: 42, carbs: 30, fats: 28, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", ingredients: ["3 lb chuck roast", "Potatoes", "Carrots", "Onion", "Beef broth", "Garlic", "Thyme"], instructions: ["Season and sear roast on all sides", "Place in slow cooker", "Add vegetables and broth", "Cook on low 8 hours", "Shred meat and serve with veggies"] },
  { title: "Pantry Pasta e Fagioli", category: "Pantry Staples", cost: 4.50, time: 20, servings: 4, calories: 450, protein: 18, carbs: 60, fats: 14, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", ingredients: ["Ditalini pasta", "Cannellini beans", "Diced tomatoes (canned)", "Carrots", "Celery", "Italian seasoning"], instructions: ["Sauté carrots and celery", "Add tomatoes and beans", "Add broth and pasta", "Simmer until pasta is cooked", "Season and serve with bread"] },
  { title: "Bean & Rice Bowls", category: "Pantry Staples", cost: 3.80, time: 15, servings: 4, calories: 420, protein: 18, carbs: 65, fats: 8, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop", ingredients: ["Rice", "Black beans", "Corn", "Salsa", "Cumin", "Lime", "Cilantro"], instructions: ["Cook rice", "Heat beans with cumin", "Combine in bowls", "Top with corn, salsa, cilantro", "Squeeze lime over top"] },
  { title: "Egg Fried Rice", category: "Pantry Staples", cost: 3.00, time: 12, servings: 2, calories: 380, protein: 14, carbs: 52, fats: 12, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", ingredients: ["Cooked rice", "Eggs", "Soy sauce", "Frozen peas", "Sesame oil"], instructions: ["Heat oil in pan", "Scramble eggs", "Add rice and peas", "Season with soy sauce", "Toss together"] },
  { title: "Chicken Caesar Salad", category: "High Protein", cost: 8.00, time: 20, servings: 2, calories: 450, protein: 38, carbs: 18, fats: 26, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop", ingredients: ["Chicken breast", "Romaine lettuce", "Parmesan", "Croutons", "Caesar dressing", "Lemon"], instructions: ["Season and grill chicken", "Chop romaine", "Slice chicken", "Toss salad with dressing", "Top with parmesan and croutons"] },
  { title: "Turkey Meatballs", category: "High Protein", cost: 9.50, time: 30, servings: 4, calories: 380, protein: 32, carbs: 22, fats: 18, image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop", ingredients: ["Ground turkey", "Breadcrumbs", "Egg", "Garlic", "Italian seasoning", "Marinara sauce", "Spaghetti"], instructions: ["Mix turkey, breadcrumbs, egg, seasonings", "Form into meatballs", "Bake at 400°F for 20 min", "Heat marinara sauce", "Serve over spaghetti"] },
  { title: "Chickpea Curry", category: "Vegetarian", cost: 5.50, time: 25, servings: 4, calories: 400, protein: 14, carbs: 55, fats: 14, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", ingredients: ["Chickpeas (2 cans)", "Coconut milk", "Onion", "Garlic", "Ginger", "Curry powder", "Rice"], instructions: ["Sauté onion, garlic, ginger", "Add curry powder, cook 1 min", "Add chickpeas and coconut milk", "Simmer 15 minutes", "Serve over rice"] },
  { title: "Veggie Stuffed Peppers", category: "Vegetarian", cost: 6.50, time: 40, servings: 4, calories: 350, protein: 12, carbs: 48, fats: 12, image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop", ingredients: ["Bell peppers", "Rice", "Black beans", "Corn", "Salsa", "Cheese", "Cumin"], instructions: ["Cook rice", "Mix rice with beans, corn, salsa, cumin", "Hollow out peppers", "Fill peppers with mixture", "Top with cheese, bake 25 min at 375°F"] },
  { title: "Lentil Soup", category: "Vegetarian", cost: 4.00, time: 35, servings: 6, calories: 320, protein: 18, carbs: 48, fats: 4, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", ingredients: ["Lentils", "Carrots", "Celery", "Onion", "Garlic", "Cumin", "Vegetable broth"], instructions: ["Sauté onion, carrots, celery", "Add garlic and cumin", "Add lentils and broth", "Simmer 25-30 minutes", "Season to taste"] },
  { title: "BBQ Chicken Pizza", category: "Family Favorites", cost: 8.00, time: 25, servings: 4, calories: 480, protein: 28, carbs: 52, fats: 18, image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop", ingredients: ["Pizza dough", "BBQ sauce", "Chicken breast", "Red onion", "Mozzarella", "Cilantro"], instructions: ["Preheat oven to 450°F", "Roll out dough", "Spread BBQ sauce", "Top with cooked chicken, onion, cheese", "Bake 12-15 minutes"] },
  { title: "Mac & Cheese", category: "Family Favorites", cost: 5.50, time: 25, servings: 6, calories: 520, protein: 20, carbs: 55, fats: 24, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", ingredients: ["Elbow macaroni", "Butter", "Flour", "Milk", "Sharp cheddar", "Salt", "Pepper"], instructions: ["Cook pasta", "Make roux with butter and flour", "Add milk, whisk until thick", "Add cheese, stir until melted", "Combine with pasta"] },
  { title: "Sloppy Joes", category: "Family Favorites", cost: 7.00, time: 20, servings: 4, calories: 450, protein: 26, carbs: 40, fats: 20, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", ingredients: ["Ground beef", "Onion", "Ketchup", "Mustard", "Brown sugar", "Worcestershire", "Hamburger buns"], instructions: ["Brown beef and onion", "Add ketchup, mustard, sugar, worcestershire", "Simmer 10 minutes", "Spoon onto buns"] },
  { title: "Chicken Noodle Soup", category: "Family Favorites", cost: 6.00, time: 30, servings: 6, calories: 350, protein: 28, carbs: 35, fats: 10, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", ingredients: ["Chicken breast", "Egg noodles", "Carrots", "Celery", "Onion", "Chicken broth", "Thyme"], instructions: ["Simmer chicken in broth", "Remove and shred chicken", "Add vegetables to broth", "Cook 10 min, add noodles", "Return chicken, cook 8 min more"] },
  { title: "Holiday Ham Glaze", category: "Holiday", cost: 18.00, time: 120, servings: 8, calories: 380, protein: 32, carbs: 22, fats: 18, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", ingredients: ["Half ham", "Brown sugar", "Honey", "Dijon mustard", "Cloves", "Pineapple rings"], instructions: ["Score ham in diamond pattern", "Mix glaze ingredients", "Brush ham generously", "Bake at 325°F", "Baste every 30 min, cook 2 hours"] },
  { title: "Roasted Turkey Breast", category: "Holiday", cost: 15.00, time: 90, servings: 6, calories: 320, protein: 42, carbs: 8, fats: 14, image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop", ingredients: ["Turkey breast", "Butter", "Sage", "Rosemary", "Thyme", "Garlic", "Lemon"], instructions: ["Pat turkey dry", "Mix herb butter", "Rub under and over skin", "Roast at 350°F", "Cook until 165°F internal, ~90 min"] },
  { title: "Banana Oat Smoothie", category: "Quick Meals", cost: 2.00, time: 5, servings: 1, calories: 320, protein: 10, carbs: 55, fats: 8, image: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&h=300&fit=crop", ingredients: ["Banana", "Oats", "Milk", "Honey", "Cinnamon"], instructions: ["Add all ingredients to blender", "Blend until smooth", "Pour and enjoy"] },
  { title: "Tuna Salad Sandwich", category: "Quick Meals", cost: 4.00, time: 10, servings: 2, calories: 400, protein: 28, carbs: 35, fats: 16, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop", ingredients: ["Canned tuna", "Mayonnaise", "Celery", "Bread", "Lettuce", "Tomato"], instructions: ["Drain tuna", "Mix with mayo and diced celery", "Toast bread", "Layer tuna salad, lettuce, tomato"] },
  { title: "Budget Birthday Cake", category: "Special Occasions", cost: 8.00, time: 60, servings: 12, calories: 320, protein: 4, carbs: 48, fats: 14, image: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400&h=300&fit=crop", ingredients: ["Flour", "Sugar", "Eggs", "Butter", "Milk", "Vanilla", "Baking powder", "Cocoa powder", "Powdered sugar"], instructions: ["Mix dry ingredients", "Cream butter and sugar", "Add eggs and vanilla", "Alternate flour and milk", "Bake at 350°F for 30 min", "Cool and frost with buttercream"] },
  { title: "Party Pulled Pork Sliders", category: "Special Occasions", cost: 12.00, time: 300, servings: 12, calories: 380, protein: 26, carbs: 32, fats: 16, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", ingredients: ["Pork shoulder", "BBQ sauce", "Slider buns", "Coleslaw mix", "Apple cider vinegar", "Brown sugar", "Paprika"], instructions: ["Season pork with spices", "Slow cook 8 hours on low", "Shred and mix with BBQ sauce", "Toast slider buns", "Assemble with coleslaw"] },
  { title: "Celebration Pasta Bake", category: "Special Occasions", cost: 10.00, time: 45, servings: 8, calories: 450, protein: 22, carbs: 52, fats: 18, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", ingredients: ["Penne pasta", "Ground beef", "Ricotta", "Mozzarella", "Marinara sauce", "Italian seasoning", "Garlic"], instructions: ["Cook pasta", "Brown beef with garlic and seasoning", "Layer pasta, meat sauce, ricotta, mozzarella", "Bake at 375°F for 25 min", "Let rest 10 min before serving"] },
  { title: "Budget Party Nachos", category: "Special Occasions", cost: 7.00, time: 15, servings: 8, calories: 420, protein: 16, carbs: 45, fats: 20, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", ingredients: ["Tortilla chips", "Ground beef", "Canned beans", "Cheese", "Jalapeños", "Sour cream", "Salsa", "Tomatoes"], instructions: ["Brown beef with taco seasoning", "Layer chips on sheet pan", "Top with beef, beans, cheese", "Broil 3-5 minutes until cheese melts", "Add fresh toppings and serve"] },
];

export default function RecipesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filtered = RECIPES.filter((r) => {
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Recipe Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{RECIPES.length} budget-friendly recipes for your household</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipes..." className="pl-9" />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((recipe) => (
          <button
            key={recipe.title}
            onClick={() => setSelectedRecipe(recipe)}
            className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-elevated transition-shadow cursor-pointer group text-left"
          >
            <div className="h-40 overflow-hidden">
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <Badge variant="secondary" className="text-xs mb-2">{recipe.category}</Badge>
              <h3 className="font-display font-semibold text-foreground mb-2">{recipe.title}</h3>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${recipe.cost.toFixed(2)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.time < 60 ? `${recipe.time}m` : `${Math.floor(recipe.time / 60)}h`}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                <span>{recipe.calories} cal</span>
                <span>{recipe.protein}g P</span>
                <span>{recipe.carbs}g C</span>
                <span>{recipe.fats}g F</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <div className="relative -mx-6 -mt-6 mb-4">
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              </div>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedRecipe.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {selectedRecipe.calories} cal
                  </span>
                  <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {selectedRecipe.time < 60 ? `${selectedRecipe.time}m` : `${Math.floor(selectedRecipe.time / 60)}h`}
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> ${selectedRecipe.cost.toFixed(2)}
                  </span>
                  <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3" /> {selectedRecipe.servings} servings
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedRecipe.protein}g</p>
                    <p className="text-muted-foreground">Protein</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedRecipe.carbs}g</p>
                    <p className="text-muted-foreground">Carbs</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedRecipe.fats}g</p>
                    <p className="text-muted-foreground">Fats</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    {selectedRecipe.instructions.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-3">
                        <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
