## Phase 1: Splash Screen + App Icon
- Enlarge logo ~50%, increase text size, remove subtitle
- Add "Welcome Back, [Name]" for returning users
- Subtle fade transition
- Update app icon: black honeycomb on cream background, 1024x1024

## Phase 2: iOS Permissions & Camera Fix
- Add NSPhotoLibraryAddUsageDescription to Info.plist injection in CI
- Verify camera/gallery works on Pantry and Fridge Chef
- Update pantry header text to "Scan Your Fridge & Pantry"

## Phase 3: Home Screen & Cards
- Reduce meal card height ~30%, fix alignment/padding
- Remove Fridge Chef section from Today page
- Replace Extra Recipes with visual recipe category tiles (from DB)
- Add budget stats widgets (Weekly Budget, Est. Spend, Savings)
- Add Smart Grocery Score, Pantry Utilization, Food Waste Prevented

## Phase 4: Navigation & Layout
- Simplify header: logo left, profile icon right, remove bell
- Add floating notification bell (bottom-left, conditional)
- Update footer: remove Settings tab, solid black icons, brand-color active state
- Recipe detail: large floating close button
- Meal Plan: weekly cost display, remove price from cards, fix regenerate button
- Grocery: fallback images, best-price highlight, Wrong Price modal
- Fridge Chef: simplified "How This Works" text
- Remove standalone recipe library (categories → recipes flow)

## Notes
- Recipe categories pulled from existing `recipes` table `category` column
- Settings accessible only through Profile page
- All changes respect iOS safe areas
