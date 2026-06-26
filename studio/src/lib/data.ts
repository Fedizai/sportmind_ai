export const bodyParts = [
    { id: 'chest', name: 'Chest' },
    { id: 'shoulders', name: 'Shoulders' },
    { id: 'biceps', name: 'Biceps' },
    { id: 'back', name: 'Back' }, 
    { id: 'triceps', name: 'Triceps' },
    { id: 'abs', name: 'Abs & obliques' },
    { id: 'quads', name: 'Quads' },
    { id: 'forearms', name: 'Forearms' },
    { id: 'glutes', name: 'Glutes' },
    { id: 'hamstrings', name: 'Hamstrings & calves' },
    { id: 'traps', name: 'Traps' }
];

export const exercises = [
    // Chest
    { id: 'ex1', name: 'Barbell Bench Press', bodyPartId: 'chest', equipment: 'Barbell', gifUrl: '/exercises/ex1.svg' },
    { id: 'ex2', name: 'Dumbbell Bench Press', bodyPartId: 'chest', equipment: 'Dumbbell', gifUrl: '/exercises/ex2.svg' },
    { id: 'ex3', name: 'Incline Bench Press', bodyPartId: 'chest', equipment: 'Barbell', gifUrl: '/exercises/ex3.svg' },
    { id: 'ex4', name: 'Decline Bench Press', bodyPartId: 'chest', equipment: 'Barbell', gifUrl: '/exercises/ex4.svg' },
    { id: 'ex5', name: 'Push-Ups', bodyPartId: 'chest', equipment: 'Bodyweight', gifUrl: '/exercises/ex5.svg' },
    { id: 'ex6', name: 'Chest Fly', bodyPartId: 'chest', equipment: 'Dumbbell or Machine', gifUrl: '/exercises/ex6.svg' },
    { id: 'ex7', name: 'Cable Crossover', bodyPartId: 'chest', equipment: 'Cable', gifUrl: '/exercises/ex7.svg' },
    { id: 'ex8', name: 'Chest Dips', bodyPartId: 'chest', equipment: 'Bodyweight', gifUrl: '/exercises/ex8.svg' },
  
    // Shoulders
    { id: 'ex9', name: 'Overhead Press', bodyPartId: 'shoulders', equipment: 'Barbell or Dumbbell', gifUrl: '/exercises/ex9.svg' },
    { id: 'ex10', name: 'Arnold Press', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: '/exercises/ex10.svg' },
    { id: 'ex11', name: 'Lateral Raise', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: '/exercises/ex11.svg' },
    { id: 'ex12', name: 'Front Raise', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: '/exercises/ex12.svg' },
    { id: 'ex13', name: 'Rear Delt Fly', bodyPartId: 'shoulders', equipment: 'Dumbbell or Machine', gifUrl: '/exercises/ex13.svg' },
    { id: 'ex14', name: 'Upright Row', bodyPartId: 'shoulders', equipment: 'Barbell', gifUrl: '/exercises/ex14.svg' },
    { id: 'ex15', name: 'Face Pull', bodyPartId: 'shoulders', equipment: 'Cable', gifUrl: '/exercises/ex15.svg' },
  
    // Biceps
    { id: 'ex16', name: 'Barbell Curl', bodyPartId: 'biceps', equipment: 'Barbell', gifUrl: '/exercises/ex16.svg' },
    { id: 'ex17', name: 'Dumbbell Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: '/exercises/ex17.svg' },
    { id: 'ex18', name: 'Hammer Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: '/exercises/ex18.svg' },
    { id: 'ex19', name: 'Concentration Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: '/exercises/ex19.svg' },
    { id: 'ex20', name: 'Preacher Curl', bodyPartId: 'biceps', equipment: 'Machine', gifUrl: '/exercises/ex20.svg' },
    { id: 'ex21', name: 'Cable Curl', bodyPartId: 'biceps', equipment: 'Cable', gifUrl: '/exercises/ex21.svg' },
    { id: 'ex22', name: 'Zottman Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: '/exercises/ex22.svg' },
  
    // Back
    { id: 'ex23', name: 'Pull-Ups', bodyPartId: 'back', equipment: 'Bodyweight', gifUrl: '/exercises/ex23.svg' },
    { id: 'ex24', name: 'Lat Pulldown', bodyPartId: 'back', equipment: 'Machine', gifUrl: '/exercises/ex24.svg' },
    { id: 'ex25', name: 'Deadlift', bodyPartId: 'back', equipment: 'Barbell', gifUrl: '/exercises/ex25.svg' },
    { id: 'ex26', name: 'Bent-Over Row', bodyPartId: 'back', equipment: 'Barbell', gifUrl: '/exercises/ex26.svg' },
    { id: 'ex27', name: 'T-Bar Row', bodyPartId: 'back', equipment: 'Barbell or Machine', gifUrl: '/exercises/ex27.svg' },
    { id: 'ex28', name: 'Seated Cable Row', bodyPartId: 'back', equipment: 'Cable', gifUrl: '/exercises/ex28.svg' },
    { id: 'ex29', name: 'Inverted Row', bodyPartId: 'back', equipment: 'Bodyweight', gifUrl: '/exercises/ex29.svg' },
    { id: 'ex30', name: 'Single-Arm Dumbbell Row', bodyPartId: 'back', equipment: 'Dumbbell', gifUrl: '/exercises/ex30.svg' },
  
    // Triceps
    { id: 'ex31', name: 'Triceps Dips', bodyPartId: 'triceps', equipment: 'Bodyweight', gifUrl: '/exercises/ex31.svg' },
    { id: 'ex32', name: 'Skull Crushers', bodyPartId: 'triceps', equipment: 'Barbell or EZ Bar', gifUrl: '/exercises/ex32.svg' },
    { id: 'ex33', name: 'Close-Grip Bench Press', bodyPartId: 'triceps', equipment: 'Barbell', gifUrl: '/exercises/ex33.svg' },
    { id: 'ex34', name: 'Triceps Pushdown', bodyPartId: 'triceps', equipment: 'Cable', gifUrl: '/exercises/ex34.svg' },
    { id: 'ex35', name: 'Overhead Triceps Extension', bodyPartId: 'triceps', equipment: 'Dumbbell', gifUrl: '/exercises/ex35.svg' },
    { id: 'ex36', name: 'Triceps Kickbacks', bodyPartId: 'triceps', equipment: 'Dumbbell', gifUrl: '/exercises/ex36.svg' },
    { id: 'ex37', name: 'Diamond Push-Ups', bodyPartId: 'triceps', equipment: 'Bodyweight', gifUrl: '/exercises/ex37.svg' },
  
    // Abs
    { id: 'ex38', name: 'Crunches', bodyPartId: 'abs', equipment: 'Bodyweight', gifUrl: '/exercises/ex38.svg' },
    { id: 'ex39', name: 'Plank', bodyPartId: 'abs', equipment: 'Bodyweight', gifUrl: '/exercises/ex39.svg' },
    { id: 'ex40', name: 'Leg Raises', bodyPartId: 'abs', equipment: 'Bodyweight', gifUrl: '/exercises/ex40.svg' },
    { id: 'ex41', name: 'Bicycle Crunch', bodyPartId: 'abs', equipment: 'Bodyweight', gifUrl: '/exercises/ex41.svg' },
    { id: 'ex42', name: 'Russian Twists', bodyPartId: 'abs', equipment: 'Bodyweight or Weight Plate', gifUrl: '/exercises/ex42.svg' },
    { id: 'ex43', name: 'Hanging Leg Raises', bodyPartId: 'abs', equipment: 'Bodyweight', gifUrl: '/exercises/ex43.svg' },
    { id: 'ex44', name: 'V-Ups', bodyPartId: 'abs', equipment: 'Bodyweight', gifUrl: '/exercises/ex44.svg' },
    { id: 'ex45', name: 'Ab Wheel Rollout', bodyPartId: 'abs', equipment: 'Ab Wheel', gifUrl: '/exercises/ex45.svg' },
  
    // Quads
    { id: 'ex46', name: 'Squats', bodyPartId: 'quads', equipment: 'Barbell or Bodyweight', gifUrl: '/exercises/ex46.svg' },
    { id: 'ex47', name: 'Leg Press', bodyPartId: 'quads', equipment: 'Machine', gifUrl: '/exercises/ex47.svg' },
    { id: 'ex48', name: 'Walking Lunges', bodyPartId: 'quads', equipment: 'Dumbbell', gifUrl: '/exercises/ex48.svg' },
    { id: 'ex49', name: 'Bulgarian Split Squat', bodyPartId: 'quads', equipment: 'Dumbbell', gifUrl: '/exercises/ex49.svg' },
    { id: 'ex50', name: 'Step-Ups', bodyPartId: 'quads', equipment: 'Dumbbell', gifUrl: '/exercises/ex50.svg' },
    { id: 'ex51', name: 'Leg Extension', bodyPartId: 'quads', equipment: 'Machine', gifUrl: '/exercises/ex51.svg' },
    { id: 'ex52', name: 'Front Squat', bodyPartId: 'quads', equipment: 'Barbell', gifUrl: '/exercises/ex52.svg' },
    { id: 'ex53', name: 'Sissy Squat', bodyPartId: 'quads', equipment: 'Bodyweight or Machine', gifUrl: '/exercises/ex53.svg' },
  
    // Forearms
    { id: 'ex54', name: 'Wrist Curls', bodyPartId: 'forearms', equipment: 'Dumbbell', gifUrl: '/exercises/ex54.svg' },
    { id: 'ex55', name: 'Reverse Wrist Curls', bodyPartId: 'forearms', equipment: 'Dumbbell', gifUrl: '/exercises/ex55.svg' },
    { id: 'ex56', name: 'Hammer Curl', bodyPartId: 'forearms', equipment: 'Dumbbell', gifUrl: '/exercises/ex56.svg' },
    { id: 'ex57', name: 'Zottman Curl', bodyPartId: 'forearms', equipment: 'Dumbbell', gifUrl: '/exercises/ex57.svg' },
    { id: 'ex58', name: "Farmer's Walk", bodyPartId: 'forearms', equipment: 'Dumbbell or Trap Bar', gifUrl: '/exercises/ex58.svg' },
    { id: 'ex59', name: 'Reverse Curl', bodyPartId: 'forearms', equipment: 'Barbell', gifUrl: '/exercises/ex59.svg' },
    { id: 'ex60', name: 'Towel Pull-Ups', bodyPartId: 'forearms', equipment: 'Bodyweight', gifUrl: '/exercises/ex60.svg' },
  
    // Glutes
    { id: 'ex61', name: 'Hip Thrusts', bodyPartId: 'glutes', equipment: 'Barbell', gifUrl: '/exercises/ex61.svg' },
    { id: 'ex62', name: 'Glute Bridges', bodyPartId: 'glutes', equipment: 'Bodyweight or Barbell', gifUrl: '/exercises/ex62.svg' },
    { id: 'ex63', name: 'Sumo Deadlift', bodyPartId: 'glutes', equipment: 'Barbell', gifUrl: '/exercises/ex63.svg' },
    { id: 'ex64', name: 'Bulgarian Split Squat', bodyPartId: 'glutes', equipment: 'Dumbbell', gifUrl: '/exercises/ex64.svg' },
    { id: 'ex65', name: 'Cable Kickbacks', bodyPartId: 'glutes', equipment: 'Cable', gifUrl: '/exercises/ex65.svg' },
    { id: 'ex66', name: 'Step-Ups', bodyPartId: 'glutes', equipment: 'Dumbbell', gifUrl: '/exercises/ex66.svg' },
    { id: 'ex67', name: 'Kettlebell Swings', bodyPartId: 'glutes', equipment: 'Kettlebell', gifUrl: '/exercises/ex67.svg' },
    { id: 'ex68', name: 'Frog Pumps', bodyPartId: 'glutes', equipment: 'Bodyweight', gifUrl: '/exercises/ex68.svg' },
  
    // Hamstrings
    { id: 'ex69', name: 'Romanian Deadlifts', bodyPartId: 'hamstrings', equipment: 'Barbell or Dumbbell', gifUrl: '/exercises/ex69.svg' },
    { id: 'ex70', name: 'Lying Leg Curl', bodyPartId: 'hamstrings', equipment: 'Machine', gifUrl: '/exercises/ex70.svg' },
    { id: 'ex71', name: 'Seated Leg Curl', bodyPartId: 'hamstrings', equipment: 'Machine', gifUrl: '/exercises/ex71.svg' },
    { id: 'ex72', name: 'Good Mornings', bodyPartId: 'hamstrings', equipment: 'Barbell', gifUrl: '/exercises/ex72.svg' },
    { id: 'ex73', name: 'Glute-Ham Raise', bodyPartId: 'hamstrings', equipment: 'Bodyweight or GHD Machine', gifUrl: '/exercises/ex73.svg' },
    { id: 'ex74', name: 'Kettlebell Swings', bodyPartId: 'hamstrings', equipment: 'Kettlebell', gifUrl: '/exercises/ex74.svg' },
    { id: 'ex75', name: 'Nordic Curl', bodyPartId: 'hamstrings', equipment: 'Bodyweight', gifUrl: '/exercises/ex75.svg' },
  
    // Traps
    { id: 'ex76', name: 'Barbell Shrugs', bodyPartId: 'traps', equipment: 'Barbell', gifUrl: '/exercises/ex76.svg' },
    { id: 'ex77', name: 'Dumbbell Shrugs', bodyPartId: 'traps', equipment: 'Dumbbell', gifUrl: '/exercises/ex77.svg' },
    { id: 'ex78', name: 'Upright Rows', bodyPartId: 'traps', equipment: 'Barbell', gifUrl: '/exercises/ex78.svg' },
    { id: 'ex79', name: 'Face Pulls', bodyPartId: 'traps', equipment: 'Cable', gifUrl: '/exercises/ex79.svg' },
    { id: 'ex80', name: 'Rack Pulls', bodyPartId: 'traps', equipment: 'Barbell', gifUrl: '/exercises/ex80.svg' },
    { id: 'ex81', name: 'Farmer’s Carry', bodyPartId: 'traps', equipment: 'Dumbbell or Trap Bar', gifUrl: '/exercises/ex81.svg' },
    { id: 'ex82', name: 'Barbell High Pull', bodyPartId: 'traps', equipment: 'Barbell', gifUrl: '/exercises/ex82.svg' }
  ];
  