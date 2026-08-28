# Base de données alimentaire locale

Ce dossier accueille `food-db.json`, généré depuis le dataset Kaggle
« Global Food & Nutrition Database 2026 ».

## Générer le fichier

1. Télécharger le dataset :
   https://www.kaggle.com/datasets/ahsanneural/global-food-and-nutrition-database-2026
2. Dézipper, puis depuis `studio/` :

   node scripts/build-food-db.mjs ~/Downloads/comprehensive_foods_usda.csv ~/Downloads/foods_health_scores_allergens.csv

3. `data/food-db.json` est créé. Commiter le fichier pour qu'il parte en production.

## Comportement

La recherche d'aliments essaie, dans l'ordre : **base locale → FatSecret → USDA**.
Si `food-db.json` est absent, la base locale est simplement ignorée et les APIs
prennent le relais — rien ne casse.

## Licences (attribution requise)

- USDA FoodData Central — domaine public
- Open Food Facts — Open Database License (ODbL), attribution obligatoire
