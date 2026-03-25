import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, DollarSign, Users, Clock, ShoppingCart, Utensils, Lightbulb, Coffee, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SAMPLE_PLANS: Record<string, {
  title: string;
  budget: string;
  desc: string;
  tag: string | null;
  servings: string;
  meals: number;
  days: { day: string; meals: { type: string; name: string; cost: string; time: string; ingredients: string[]; calories: number; protein: number; carbs: number; fats: number }[] }[];
  groceryHighlights: string[];
  tips: string[];
}> = {
  "feed-a-family-50": {
    title: "Feed a Family on $50",
    budget: "$50 / week",
    desc: "7 days of balanced meals for a family of 4 on a tight budget. Every recipe is designed to maximize nutrition while minimizing cost.",
    tag: "Most Popular",
    servings: "4 servings",
    meals: 21,
    days: [
      {
        day: "Monday",
        meals: [
          { type: "Breakfast", name: "Oatmeal with Banana & Peanut Butter", cost: "$1.80", time: "10 min", emoji: "🥣", ingredients: ["Oats", "Bananas", "Peanut butter", "Honey"], calories: 380, protein: 12, carbs: 58, fats: 14 },
          { type: "Lunch", name: "Black Bean Quesadillas", cost: "$2.50", time: "15 min", emoji: "🫔", ingredients: ["Tortillas", "Black beans", "Cheese", "Salsa"], calories: 420, protein: 18, carbs: 52, fats: 16 },
          { type: "Dinner", name: "One-Pot Chicken & Rice", cost: "$3.20", time: "35 min", emoji: "🍗", ingredients: ["Chicken thighs", "Rice", "Onion", "Frozen veggies", "Garlic"], calories: 520, protein: 35, carbs: 55, fats: 14 },
        ],
      },
      {
        day: "Tuesday",
        meals: [
          { type: "Breakfast", name: "Scrambled Eggs & Toast", cost: "$1.50", time: "8 min", emoji: "🍳", ingredients: ["Eggs", "Bread", "Butter"], calories: 340, protein: 18, carbs: 30, fats: 16 },
          { type: "Lunch", name: "PB&J with Apple Slices", cost: "$1.20", time: "5 min", emoji: "🥪", ingredients: ["Bread", "Peanut butter", "Jelly", "Apples"], calories: 380, protein: 10, carbs: 55, fats: 14 },
          { type: "Dinner", name: "Pasta with Meat Sauce", cost: "$3.50", time: "25 min", emoji: "🍝", ingredients: ["Pasta", "Ground beef", "Tomato sauce", "Onion", "Garlic"], calories: 540, protein: 28, carbs: 62, fats: 18 },
        ],
      },
      {
        day: "Wednesday",
        meals: [
          { type: "Breakfast", name: "Yogurt Parfait", cost: "$1.60", time: "5 min", emoji: "🥛", ingredients: ["Yogurt", "Granola", "Berries"], calories: 320, protein: 14, carbs: 48, fats: 8 },
          { type: "Lunch", name: "Rice & Bean Bowls", cost: "$1.80", time: "15 min", emoji: "🍛", ingredients: ["Rice", "Pinto beans", "Cheese", "Hot sauce"], calories: 440, protein: 16, carbs: 68, fats: 10 },
          { type: "Dinner", name: "Sheet Pan Sausage & Veggies", cost: "$3.80", time: "30 min", emoji: "🫑", ingredients: ["Sausage links", "Bell peppers", "Potatoes", "Onion", "Olive oil"], calories: 480, protein: 22, carbs: 40, fats: 26 },
        ],
      },
      {
        day: "Thursday",
        meals: [
          { type: "Breakfast", name: "Banana Pancakes", cost: "$1.40", time: "15 min", emoji: "🥞", ingredients: ["Flour", "Eggs", "Milk", "Banana", "Syrup"], calories: 400, protein: 10, carbs: 65, fats: 12 },
          { type: "Lunch", name: "Grilled Cheese & Tomato Soup", cost: "$2.00", time: "15 min", emoji: "🧀", ingredients: ["Bread", "Cheese", "Butter", "Canned tomato soup"], calories: 420, protein: 14, carbs: 48, fats: 20 },
          { type: "Dinner", name: "Chicken Tacos", cost: "$3.40", time: "25 min", emoji: "🌮", ingredients: ["Chicken breast", "Tortillas", "Lettuce", "Salsa", "Cheese"], calories: 500, protein: 32, carbs: 45, fats: 18 },
        ],
      },
      {
        day: "Friday",
        meals: [
          { type: "Breakfast", name: "Cereal with Milk & Fruit", cost: "$1.30", time: "3 min", emoji: "🥣", ingredients: ["Cereal", "Milk", "Banana"], calories: 300, protein: 8, carbs: 55, fats: 6 },
          { type: "Lunch", name: "Tuna Salad Sandwich", cost: "$2.20", time: "10 min", emoji: "🥪", ingredients: ["Canned tuna", "Mayo", "Bread", "Lettuce"], calories: 380, protein: 24, carbs: 32, fats: 16 },
          { type: "Dinner", name: "Slow Cooker Chili", cost: "$3.00", time: "4 hrs", emoji: "🍲", ingredients: ["Ground beef", "Kidney beans", "Tomatoes", "Onion", "Chili powder"], calories: 520, protein: 28, carbs: 48, fats: 20 },
        ],
      },
      {
        day: "Saturday",
        meals: [
          { type: "Breakfast", name: "French Toast", cost: "$1.50", time: "15 min", emoji: "🍞", ingredients: ["Bread", "Eggs", "Milk", "Cinnamon", "Syrup"], calories: 380, protein: 12, carbs: 52, fats: 14 },
          { type: "Lunch", name: "Chicken Salad Wraps", cost: "$2.40", time: "10 min", emoji: "🌯", ingredients: ["Leftover chicken", "Tortillas", "Lettuce", "Ranch"], calories: 400, protein: 26, carbs: 38, fats: 16 },
          { type: "Dinner", name: "Fried Rice with Veggies", cost: "$2.80", time: "20 min", emoji: "🍚", ingredients: ["Rice", "Eggs", "Frozen veggies", "Soy sauce", "Garlic"], calories: 460, protein: 16, carbs: 62, fats: 14 },
        ],
      },
      {
        day: "Sunday",
        meals: [
          { type: "Breakfast", name: "Breakfast Burritos", cost: "$2.00", time: "15 min", emoji: "🌯", ingredients: ["Tortillas", "Eggs", "Cheese", "Salsa", "Beans"], calories: 450, protein: 22, carbs: 48, fats: 18 },
          { type: "Lunch", name: "Leftover Chili & Cornbread", cost: "$1.50", time: "10 min", emoji: "🍲", ingredients: ["Leftover chili", "Cornbread mix"], calories: 480, protein: 24, carbs: 55, fats: 18 },
          { type: "Dinner", name: "Baked Potato Bar", cost: "$2.60", time: "45 min", emoji: "🥔", ingredients: ["Potatoes", "Cheese", "Sour cream", "Broccoli", "Butter"], calories: 500, protein: 14, carbs: 65, fats: 22 },
        ],
      },
    ],
    groceryHighlights: ["Chicken thighs (3 lbs)", "Ground beef (1 lb)", "Rice (2 lbs)", "Eggs (18 ct)", "Bread (2 loaves)", "Bananas (bunch)", "Frozen veggies (2 bags)", "Canned beans (4 cans)", "Pasta (2 boxes)", "Cheese (1 lb block)", "Tortillas (2 packs)", "Potatoes (5 lb bag)"],
    tips: [
      "Buy whole chickens and break them down to save up to 40%",
      "Frozen veggies are just as nutritious and much cheaper",
      "Cook big batches on Sunday for easy leftovers",
      "Store brand staples save $5-$10 per trip",
    ],
  },
  "more-variety-75": {
    title: "More Variety at $75",
    budget: "$75 / week",
    desc: "Nutritious options with flexible recipes and extra variety for families who want more diverse meals.",
    tag: null,
    servings: "4 servings",
    meals: 21,
    days: [
      { day: "Monday", meals: [
        { type: "Breakfast", name: "Veggie Egg Scramble", cost: "$2.50", time: "12 min", emoji: "🍳", ingredients: ["Eggs", "Bell peppers", "Spinach", "Cheese"], calories: 380, protein: 24, carbs: 12, fats: 26 },
        { type: "Lunch", name: "Turkey & Avocado Wraps", cost: "$3.80", time: "10 min", emoji: "🌯", ingredients: ["Deli turkey", "Avocado", "Tortillas", "Lettuce"], calories: 440, protein: 28, carbs: 35, fats: 22 },
        { type: "Dinner", name: "Lemon Herb Salmon", cost: "$5.50", time: "25 min", emoji: "🐟", ingredients: ["Salmon fillets", "Lemon", "Herbs", "Asparagus", "Rice"], calories: 520, protein: 38, carbs: 42, fats: 18 },
      ]},
      { day: "Tuesday", meals: [
        { type: "Breakfast", name: "Smoothie Bowls", cost: "$2.20", time: "8 min", emoji: "🫐", ingredients: ["Frozen berries", "Banana", "Yogurt", "Granola"], calories: 340, protein: 12, carbs: 55, fats: 8 },
        { type: "Lunch", name: "Chicken Caesar Salad", cost: "$3.50", time: "15 min", emoji: "🥗", ingredients: ["Chicken breast", "Romaine", "Parmesan", "Croutons"], calories: 420, protein: 32, carbs: 22, fats: 24 },
        { type: "Dinner", name: "Beef Stir Fry", cost: "$4.80", time: "20 min", emoji: "🥩", ingredients: ["Beef strips", "Broccoli", "Carrots", "Soy sauce", "Rice"], calories: 540, protein: 34, carbs: 52, fats: 20 },
      ]},
      { day: "Wednesday", meals: [
        { type: "Breakfast", name: "Avocado Toast with Egg", cost: "$2.80", time: "10 min", emoji: "🥑", ingredients: ["Bread", "Avocado", "Egg", "Everything seasoning"], calories: 400, protein: 16, carbs: 35, fats: 24 },
        { type: "Lunch", name: "Mediterranean Grain Bowl", cost: "$3.20", time: "15 min", emoji: "🥙", ingredients: ["Quinoa", "Chickpeas", "Cucumber", "Feta", "Olives"], calories: 460, protein: 18, carbs: 58, fats: 18 },
        { type: "Dinner", name: "Chicken Parmesan", cost: "$4.50", time: "35 min", emoji: "🍗", ingredients: ["Chicken breast", "Marinara", "Mozzarella", "Pasta", "Breadcrumbs"], calories: 580, protein: 38, carbs: 55, fats: 22 },
      ]},
      { day: "Thursday", meals: [
        { type: "Breakfast", name: "Protein Pancakes", cost: "$2.00", time: "15 min", emoji: "🥞", ingredients: ["Protein powder", "Oats", "Egg", "Banana"], calories: 380, protein: 28, carbs: 45, fats: 10 },
        { type: "Lunch", name: "Asian Noodle Salad", cost: "$3.00", time: "12 min", emoji: "🍜", ingredients: ["Rice noodles", "Edamame", "Carrots", "Sesame dressing"], calories: 400, protein: 16, carbs: 55, fats: 14 },
        { type: "Dinner", name: "Pork Chops & Sweet Potato", cost: "$5.00", time: "30 min", emoji: "🥩", ingredients: ["Pork chops", "Sweet potatoes", "Green beans", "Butter"], calories: 540, protein: 35, carbs: 48, fats: 22 },
      ]},
      { day: "Friday", meals: [
        { type: "Breakfast", name: "Breakfast Tacos", cost: "$2.40", time: "12 min", emoji: "🌮", ingredients: ["Tortillas", "Eggs", "Chorizo", "Cheese", "Salsa"], calories: 450, protein: 22, carbs: 38, fats: 24 },
        { type: "Lunch", name: "Caprese Sandwich", cost: "$3.50", time: "8 min", emoji: "🥪", ingredients: ["Ciabatta", "Fresh mozzarella", "Tomato", "Basil", "Balsamic"], calories: 420, protein: 20, carbs: 40, fats: 20 },
        { type: "Dinner", name: "Shrimp Tacos", cost: "$5.20", time: "20 min", emoji: "🍤", ingredients: ["Shrimp", "Tortillas", "Cabbage slaw", "Lime crema"], calories: 480, protein: 30, carbs: 42, fats: 18 },
      ]},
      { day: "Saturday", meals: [
        { type: "Breakfast", name: "Eggs Benedict (Simplified)", cost: "$3.00", time: "20 min", emoji: "🍳", ingredients: ["English muffins", "Eggs", "Ham", "Hollandaise mix"], calories: 480, protein: 26, carbs: 35, fats: 26 },
        { type: "Lunch", name: "Thai Peanut Noodles", cost: "$3.20", time: "15 min", emoji: "🍜", ingredients: ["Noodles", "Peanut butter", "Soy sauce", "Veggies", "Lime"], calories: 460, protein: 18, carbs: 55, fats: 20 },
        { type: "Dinner", name: "Homemade Pizza Night", cost: "$4.50", time: "40 min", emoji: "🍕", ingredients: ["Pizza dough", "Sauce", "Mozzarella", "Pepperoni", "Veggies"], calories: 560, protein: 24, carbs: 62, fats: 24 },
      ]},
      { day: "Sunday", meals: [
        { type: "Breakfast", name: "Waffles & Fresh Fruit", cost: "$2.20", time: "15 min", emoji: "🧇", ingredients: ["Waffle mix", "Strawberries", "Whipped cream", "Syrup"], calories: 420, protein: 10, carbs: 65, fats: 14 },
        { type: "Lunch", name: "BLT with Sweet Potato Fries", cost: "$3.50", time: "25 min", emoji: "🥓", ingredients: ["Bacon", "Lettuce", "Tomato", "Bread", "Sweet potato"], calories: 480, protein: 18, carbs: 50, fats: 24 },
        { type: "Dinner", name: "Sunday Roast Chicken", cost: "$5.00", time: "60 min", emoji: "🍗", ingredients: ["Whole chicken", "Potatoes", "Carrots", "Onion", "Herbs"], calories: 560, protein: 42, carbs: 38, fats: 24 },
      ]},
    ],
    groceryHighlights: ["Salmon fillets", "Chicken breasts (3 lbs)", "Shrimp (1 lb)", "Fresh avocados", "Quinoa", "Fresh mozzarella", "Assorted vegetables", "Rice noodles", "Pork chops", "Whole chicken"],
    tips: [
      "Buy salmon frozen in bulk to save up to 30%",
      "Fresh herbs can be grown at home for pennies",
      "Meal prep sauces and dressings on Sunday",
      "Use a slow cooker for hands-off cooking",
    ],
  },
  "college-eats-35": {
    title: "College Eats on $35",
    budget: "$35 / week",
    desc: "Quick, easy meals for dorm life and small kitchens. Minimal equipment needed.",
    tag: "Student Fav",
    servings: "1-2 servings",
    meals: 21,
    days: [
      { day: "Monday", meals: [
        { type: "Breakfast", name: "Overnight Oats", cost: "$0.80", time: "5 min", emoji: "🥣", ingredients: ["Oats", "Milk", "Honey", "Banana"], calories: 320, protein: 10, carbs: 55, fats: 8 },
        { type: "Lunch", name: "Ramen Upgrade Bowl", cost: "$1.50", time: "10 min", emoji: "🍜", ingredients: ["Instant ramen", "Egg", "Green onion", "Sriracha"], calories: 400, protein: 14, carbs: 52, fats: 16 },
        { type: "Dinner", name: "Microwave Burrito Bowl", cost: "$2.00", time: "8 min", emoji: "🌯", ingredients: ["Instant rice", "Canned beans", "Salsa", "Cheese"], calories: 450, protein: 16, carbs: 65, fats: 12 },
      ]},
      { day: "Tuesday", meals: [
        { type: "Breakfast", name: "Toast & Peanut Butter", cost: "$0.60", time: "3 min", emoji: "🍞", ingredients: ["Bread", "Peanut butter", "Honey"], calories: 300, protein: 10, carbs: 38, fats: 14 },
        { type: "Lunch", name: "Grilled Cheese (Hot Plate)", cost: "$1.20", time: "10 min", emoji: "🧀", ingredients: ["Bread", "Cheese", "Butter"], calories: 380, protein: 14, carbs: 35, fats: 22 },
        { type: "Dinner", name: "Pasta Aglio e Olio", cost: "$1.80", time: "15 min", emoji: "🍝", ingredients: ["Spaghetti", "Garlic", "Olive oil", "Red pepper flakes"], calories: 420, protein: 12, carbs: 62, fats: 14 },
      ]},
      { day: "Wednesday", meals: [
        { type: "Breakfast", name: "Banana & Granola Bar", cost: "$0.70", time: "2 min", emoji: "🍌", ingredients: ["Banana", "Granola bar"], calories: 280, protein: 6, carbs: 52, fats: 6 },
        { type: "Lunch", name: "Tuna & Crackers", cost: "$1.60", time: "5 min", emoji: "🐟", ingredients: ["Canned tuna", "Crackers", "Mayo packet"], calories: 340, protein: 22, carbs: 30, fats: 14 },
        { type: "Dinner", name: "Quesadilla with Beans", cost: "$1.50", time: "8 min", emoji: "🫔", ingredients: ["Tortilla", "Cheese", "Refried beans", "Hot sauce"], calories: 400, protein: 16, carbs: 45, fats: 18 },
      ]},
      { day: "Thursday", meals: [
        { type: "Breakfast", name: "Cereal & Milk", cost: "$0.90", time: "2 min", emoji: "🥣", ingredients: ["Cereal", "Milk"], calories: 280, protein: 8, carbs: 48, fats: 6 },
        { type: "Lunch", name: "PB&J Classic", cost: "$0.80", time: "3 min", emoji: "🥪", ingredients: ["Bread", "Peanut butter", "Jelly"], calories: 350, protein: 10, carbs: 48, fats: 14 },
        { type: "Dinner", name: "Egg Fried Rice", cost: "$1.40", time: "12 min", emoji: "🍚", ingredients: ["Rice", "Eggs", "Soy sauce", "Frozen peas"], calories: 420, protein: 14, carbs: 58, fats: 14 },
      ]},
      { day: "Friday", meals: [
        { type: "Breakfast", name: "Yogurt Cup", cost: "$1.00", time: "1 min", emoji: "🥛", ingredients: ["Greek yogurt", "Honey"], calories: 200, protein: 16, carbs: 22, fats: 4 },
        { type: "Lunch", name: "Mac & Cheese (Boxed Upgrade)", cost: "$1.50", time: "12 min", emoji: "🧀", ingredients: ["Mac & cheese box", "Broccoli", "Hot sauce"], calories: 440, protein: 14, carbs: 58, fats: 18 },
        { type: "Dinner", name: "Bean & Cheese Nachos", cost: "$2.00", time: "10 min", emoji: "🧀", ingredients: ["Tortilla chips", "Canned beans", "Cheese", "Salsa", "Sour cream"], calories: 480, protein: 16, carbs: 55, fats: 22 },
      ]},
      { day: "Saturday", meals: [
        { type: "Breakfast", name: "Microwave Egg Sandwich", cost: "$1.00", time: "5 min", emoji: "🍳", ingredients: ["English muffin", "Egg", "Cheese"], calories: 320, protein: 18, carbs: 30, fats: 14 },
        { type: "Lunch", name: "Cup Noodles & Fruit", cost: "$1.30", time: "5 min", emoji: "🍜", ingredients: ["Cup noodles", "Apple"], calories: 360, protein: 8, carbs: 55, fats: 12 },
        { type: "Dinner", name: "Budget Stir Fry", cost: "$2.20", time: "15 min", emoji: "🥘", ingredients: ["Ramen noodles", "Frozen stir fry veggies", "Soy sauce", "Egg"], calories: 440, protein: 16, carbs: 55, fats: 16 },
      ]},
      { day: "Sunday", meals: [
        { type: "Breakfast", name: "Pancake Mix Pancakes", cost: "$0.80", time: "12 min", emoji: "🥞", ingredients: ["Pancake mix", "Water", "Syrup"], calories: 350, protein: 8, carbs: 62, fats: 8 },
        { type: "Lunch", name: "Loaded Baked Potato", cost: "$1.50", time: "10 min", emoji: "🥔", ingredients: ["Potato", "Cheese", "Sour cream", "Butter"], calories: 420, protein: 10, carbs: 55, fats: 18 },
        { type: "Dinner", name: "Chicken Ramen Deluxe", cost: "$2.00", time: "12 min", emoji: "🍜", ingredients: ["Ramen", "Canned chicken", "Corn", "Green onion", "Egg"], calories: 460, protein: 22, carbs: 52, fats: 18 },
      ]},
    ],
    groceryHighlights: ["Instant ramen (12-pack)", "Eggs (dozen)", "Bread", "Peanut butter", "Canned beans (4)", "Cheese block", "Tortillas", "Bananas", "Rice (2 lbs)", "Frozen veggies"],
    tips: [
      "Buy in bulk at dollar stores for staples",
      "Microwave meals can be nutritious with the right add-ins",
      "Keep shelf-stable proteins like tuna and canned chicken on hand",
      "Overnight oats save morning time and money",
    ],
  },
  "snap-friendly-meals": {
    title: "SNAP-Friendly Meals",
    budget: "$45 / week",
    desc: "Optimized for SNAP benefits with maximum nutritional value. Every dollar works harder.",
    tag: "SNAP Eligible",
    servings: "4 servings",
    meals: 21,
    days: [
      { day: "Monday", meals: [
        { type: "Breakfast", name: "Oatmeal with Cinnamon & Apple", cost: "$1.20", time: "8 min", emoji: "🥣", ingredients: ["Oats", "Apple", "Cinnamon", "Milk"], calories: 340, protein: 10, carbs: 58, fats: 8 },
        { type: "Lunch", name: "Lentil Soup", cost: "$1.80", time: "25 min", emoji: "🍲", ingredients: ["Lentils", "Carrots", "Celery", "Onion", "Garlic"], calories: 380, protein: 22, carbs: 55, fats: 4 },
        { type: "Dinner", name: "Baked Chicken Legs & Rice", cost: "$3.00", time: "40 min", emoji: "🍗", ingredients: ["Chicken legs", "Rice", "Frozen broccoli", "Seasoning"], calories: 520, protein: 35, carbs: 50, fats: 16 },
      ]},
      { day: "Tuesday", meals: [
        { type: "Breakfast", name: "Scrambled Eggs & Toast", cost: "$1.20", time: "8 min", emoji: "🍳", ingredients: ["Eggs", "Bread", "Butter"], calories: 340, protein: 18, carbs: 30, fats: 16 },
        { type: "Lunch", name: "Bean & Cheese Burritos", cost: "$1.60", time: "10 min", emoji: "🌯", ingredients: ["Tortillas", "Refried beans", "Cheese"], calories: 420, protein: 16, carbs: 52, fats: 16 },
        { type: "Dinner", name: "Spaghetti with Meat Sauce", cost: "$3.20", time: "25 min", emoji: "🍝", ingredients: ["Spaghetti", "Ground turkey", "Tomato sauce", "Garlic"], calories: 500, protein: 28, carbs: 60, fats: 16 },
      ]},
      { day: "Wednesday", meals: [
        { type: "Breakfast", name: "Banana & Peanut Butter Toast", cost: "$1.00", time: "5 min", emoji: "🍞", ingredients: ["Bread", "Peanut butter", "Banana"], calories: 360, protein: 12, carbs: 48, fats: 14 },
        { type: "Lunch", name: "Chicken Noodle Soup", cost: "$1.80", time: "20 min", emoji: "🍲", ingredients: ["Chicken broth", "Egg noodles", "Carrots", "Celery", "Chicken"], calories: 340, protein: 20, carbs: 38, fats: 10 },
        { type: "Dinner", name: "Red Beans & Rice", cost: "$2.20", time: "30 min", emoji: "🍛", ingredients: ["Red beans", "Rice", "Sausage", "Onion", "Cajun seasoning"], calories: 500, protein: 22, carbs: 65, fats: 14 },
      ]},
      { day: "Thursday", meals: [
        { type: "Breakfast", name: "Cereal & Milk", cost: "$0.90", time: "3 min", emoji: "🥣", ingredients: ["Cereal", "Milk"], calories: 280, protein: 8, carbs: 48, fats: 6 },
        { type: "Lunch", name: "Tuna Salad Sandwich", cost: "$2.00", time: "8 min", emoji: "🥪", ingredients: ["Canned tuna", "Mayo", "Bread", "Lettuce"], calories: 380, protein: 24, carbs: 32, fats: 16 },
        { type: "Dinner", name: "Potato & Veggie Casserole", cost: "$2.80", time: "45 min", emoji: "🥔", ingredients: ["Potatoes", "Frozen mixed veggies", "Cheese", "Cream of mushroom soup"], calories: 460, protein: 14, carbs: 58, fats: 20 },
      ]},
      { day: "Friday", meals: [
        { type: "Breakfast", name: "French Toast", cost: "$1.20", time: "12 min", emoji: "🍞", ingredients: ["Bread", "Eggs", "Milk", "Cinnamon", "Syrup"], calories: 380, protein: 12, carbs: 52, fats: 14 },
        { type: "Lunch", name: "Pinto Bean Tacos", cost: "$1.50", time: "10 min", emoji: "🌮", ingredients: ["Tortillas", "Pinto beans", "Salsa", "Cheese", "Lettuce"], calories: 400, protein: 16, carbs: 52, fats: 14 },
        { type: "Dinner", name: "Chicken Fried Rice", cost: "$2.80", time: "20 min", emoji: "🍚", ingredients: ["Rice", "Chicken", "Eggs", "Frozen peas", "Soy sauce"], calories: 480, protein: 28, carbs: 55, fats: 16 },
      ]},
      { day: "Saturday", meals: [
        { type: "Breakfast", name: "Pancakes & Fruit", cost: "$1.30", time: "15 min", emoji: "🥞", ingredients: ["Pancake mix", "Banana", "Syrup"], calories: 400, protein: 8, carbs: 68, fats: 10 },
        { type: "Lunch", name: "Egg Salad Sandwich", cost: "$1.40", time: "10 min", emoji: "🥪", ingredients: ["Eggs", "Mayo", "Bread", "Mustard"], calories: 380, protein: 18, carbs: 30, fats: 22 },
        { type: "Dinner", name: "Homemade Pizza (Flatbread)", cost: "$3.00", time: "25 min", emoji: "🍕", ingredients: ["Flatbread", "Pizza sauce", "Cheese", "Pepperoni"], calories: 500, protein: 22, carbs: 52, fats: 22 },
      ]},
      { day: "Sunday", meals: [
        { type: "Breakfast", name: "Breakfast Potatoes & Eggs", cost: "$1.50", time: "20 min", emoji: "🥔", ingredients: ["Potatoes", "Eggs", "Onion", "Bell pepper", "Cheese"], calories: 440, protein: 20, carbs: 48, fats: 20 },
        { type: "Lunch", name: "Leftovers Remix Bowl", cost: "$1.00", time: "5 min", emoji: "🍛", ingredients: ["Leftover rice", "Leftover beans", "Leftover veggies", "Hot sauce"], calories: 400, protein: 14, carbs: 60, fats: 10 },
        { type: "Dinner", name: "Slow Cooker Pulled Pork", cost: "$3.50", time: "6 hrs", emoji: "🐷", ingredients: ["Pork shoulder", "BBQ sauce", "Buns", "Coleslaw mix"], calories: 540, protein: 32, carbs: 45, fats: 24 },
      ]},
    ],
    groceryHighlights: ["Chicken legs (5 lbs)", "Ground turkey (1 lb)", "Pork shoulder (2 lbs)", "Eggs (18 ct)", "Rice (5 lbs)", "Dried beans (2 lbs)", "Frozen veggies (3 bags)", "Bread (2 loaves)", "Canned goods (6 cans)", "Potatoes (5 lbs)"],
    tips: [
      "SNAP benefits can be used at most grocery stores and farmers markets",
      "Buy dried beans instead of canned — 3x more food per dollar",
      "Whole chickens are usually the cheapest protein per pound",
      "Plan meals around weekly store sales to stretch your budget further",
    ],
  },
};

const SLUG_MAP: Record<string, string> = {
  "feed-a-family-50": "feed-a-family-50",
  "more-variety-75": "more-variety-75",
  "college-eats-35": "college-eats-35",
  "snap-friendly-meals": "snap-friendly-meals",
};

const MEAL_TYPE_ICONS: Record<string, React.ReactNode> = {
  Breakfast: <Coffee className="w-7 h-7 text-amber-600" />,
  Lunch: <Sun className="w-7 h-7 text-emerald-600" />,
  Dinner: <Moon className="w-7 h-7 text-indigo-600" />,
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  Breakfast: "bg-amber-100 text-amber-800",
  Lunch: "bg-emerald-100 text-emerald-800",
  Dinner: "bg-indigo-100 text-indigo-800",
};

export default function SampleMealPlan() {
  const { slug } = useParams<{ slug: string }>();
  const plan = slug ? SAMPLE_PLANS[slug] : null;

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-foreground">Plan Not Found</h1>
            <Button asChild><Link to="/">Go Home</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalDailyCosts = plan.days.map(d => d.meals.reduce((sum, m) => sum + parseFloat(m.cost.replace("$", "")), 0));
  const weekTotal = totalDailyCosts.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero Banner */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Link>
              {plan.tag && (
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gradient-honey text-primary-foreground mb-4">
                  {plan.tag}
                </span>
              )}
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">{plan.title}</h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">{plan.desc}</p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{plan.budget}</span>
                </div>
                <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{plan.servings}</span>
                </div>
                <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
                  <Utensils className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{plan.meals} meals</span>
                </div>
                <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">7-day plan</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Weekly Plan */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Your Weekly Menu</h2>
            <div className="space-y-6">
              {plan.days.map((day, dayIdx) => (
                <motion.div
                  key={day.day}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: dayIdx * 0.05 }}
                  className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
                >
                  <div className="bg-muted/40 px-5 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-foreground">{day.day}</h3>
                    <span className="text-sm text-primary font-medium">
                      ${totalDailyCosts[dayIdx].toFixed(2)} / day
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                    {day.meals.map((meal, i) => (
                      <div key={i} className="p-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start gap-3 mb-3">
                          {MEAL_TYPE_ICONS[meal.type] || <Utensils className="w-7 h-7 text-muted-foreground" />}
                          <div className="flex-1 min-w-0">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide mb-1 ${MEAL_TYPE_COLORS[meal.type] || "bg-muted text-muted-foreground"}`}>
                              {meal.type}
                            </span>
                            <h4 className="font-semibold text-foreground text-sm leading-tight">{meal.name}</h4>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mb-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{meal.time}</span>
                          <span className="text-primary font-semibold">{meal.cost}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                          <span className="bg-muted/50 px-1.5 py-0.5 rounded">{meal.calories} cal</span>
                          <span className="bg-muted/50 px-1.5 py-0.5 rounded">{meal.protein}g P</span>
                          <span className="bg-muted/50 px-1.5 py-0.5 rounded">{meal.carbs}g C</span>
                          <span className="bg-muted/50 px-1.5 py-0.5 rounded">{meal.fats}g F</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-[11px] text-muted-foreground">{meal.ingredients.join(" · ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Grocery & Tips */}
        <section className="py-12 bg-card">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Grocery Highlights */}
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-background rounded-2xl border border-border p-6 shadow-card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">Grocery List Highlights</h3>
                </div>
                <ul className="space-y-2">
                  {plan.groceryHighlights.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Weekly Total</span>
                    <span className="font-bold text-primary text-lg">${weekTotal.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Budget Tips */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-background rounded-2xl border border-border p-6 shadow-card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">Money-Saving Tips</h3>
                </div>
                <ul className="space-y-3">
                  {plan.tips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to Get Your Personalized Plan?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Sign up to get a custom AI-generated meal plan tailored to your budget, household size, and dietary needs.
              </p>
              <Button size="lg" className="bg-gradient-honey text-primary-foreground hover:opacity-90" asChild>
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
