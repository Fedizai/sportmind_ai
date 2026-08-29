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
    { id: 'ex82', name: 'Barbell High Pull', bodyPartId: 'traps', equipment: 'Barbell', gifUrl: '/exercises/ex82.svg' },

    // ---------------------------------------------------------------------
    // Real photographic demonstrations, from the exerciseDB sample dataset.
    // Everything above is a generated stick-figure SVG (scripts/gen-exercise-
    // images.mjs); these 30 are actual GIFs, hosted in Firebase Storage —
    // see scripts/upload-exercise-gifs.mjs. Ids are prefixed 'edb-' so they
    // never collide with the ex1..ex82 placeholder ids above.
    // ---------------------------------------------------------------------

    // -- chest (exerciseDB demo GIFs) --
    { id: 'edb-3TZduzM', name: 'Barbell Incline Bench Press', bodyPartId: 'chest', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F3TZduzM.gif?alt=media&token=c31bd612-5e07-422e-b5b2-4af90d914bb7' },
    { id: 'edb-5v7KYld', name: 'Smith Incline Bench Press', bodyPartId: 'chest', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F5v7KYld.gif?alt=media&token=5f8f8374-eeb7-4e50-823c-920f3f945ec3' },
    { id: 'edb-7saC5zz', name: 'Cable Decline Fly', bodyPartId: 'chest', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F7saC5zz.gif?alt=media&token=6a604396-1d1c-48af-bdf3-9758068184da' },

    // -- shoulders (exerciseDB demo GIFs) --
    { id: 'edb-3eGE2JC', name: 'Dumbbell Front Raise', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F3eGE2JC.gif?alt=media&token=047cb8f4-2e64-40c9-a5f8-52eb490a97b9' },
    { id: 'edb-6cKQC5E', name: 'Dumbbell One Arm Upright Row', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6cKQC5E.gif?alt=media&token=b0f81533-fe9f-465e-b639-226c0e05f9f6' },

    // -- biceps (exerciseDB demo GIFs) --
    { id: 'edb-3XFdb1Z', name: 'Cable Squatting Curl', bodyPartId: 'biceps', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F3XFdb1Z.gif?alt=media&token=c5fcdbea-1b50-4e47-9ca5-c2c645941080' },
    { id: 'edb-4dF3maG', name: 'Dumbbell One Arm Hammer Preacher Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F4dF3maG.gif?alt=media&token=e423783c-2670-43f5-9a7b-30656e25e976' },
    { id: 'edb-4dUn2iv', name: 'Barbell Standing Close Grip Curl', bodyPartId: 'biceps', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F4dUn2iv.gif?alt=media&token=b43d73d1-8126-411a-ade8-1242f3f0b253' },
    { id: 'edb-6sMAmNv', name: 'Dumbbell Reverse Spider Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6sMAmNv.gif?alt=media&token=2f1a59fd-cd7d-4532-aeac-8506ae3f53b3' },
    { id: 'edb-7inpWch', name: 'Dumbbell Standing Concentration Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F7inpWch.gif?alt=media&token=b0df9259-0d9d-45d3-9a9c-72f798acaeef' },
    { id: 'edb-8oYqOt9', name: 'Cable Seated Curl', bodyPartId: 'biceps', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F8oYqOt9.gif?alt=media&token=900bfbda-8620-4465-945d-8cc3333c092b' },

    // -- back (exerciseDB demo GIFs) --
    { id: 'edb-7F1DVzn', name: 'Lever Front Pulldown', bodyPartId: 'back', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F7F1DVzn.gif?alt=media&token=0aff4b54-da55-47b0-8e3d-07c82e455b92' },
    { id: 'edb-7I6LNUG', name: 'Lever Seated Row', bodyPartId: 'back', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F7I6LNUG.gif?alt=media&token=a4117132-91e2-44b1-b647-25dfd8cdab85' },
    { id: 'edb-8urJS9b', name: 'Weighted Hyperextension (on Stability Ball)', bodyPartId: 'back', equipment: 'Weight Plate', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F8urJS9b.gif?alt=media&token=1c6ca9d4-c534-48fc-8cb1-6723f573d326' },

    // -- triceps (exerciseDB demo GIFs) --
    { id: 'edb-05Cf2v8', name: 'Impossible Dips', bodyPartId: 'triceps', equipment: 'Bodyweight', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F05Cf2v8.gif?alt=media&token=a270e413-e99c-40ae-8827-84e48faaabae' },
    { id: 'edb-5uFK1xr', name: 'Barbell Seated Overhead Triceps Extension', bodyPartId: 'triceps', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F5uFK1xr.gif?alt=media&token=a8f6715e-16eb-44e8-a466-671079fb1109' },
    { id: 'edb-6MfS53i', name: 'Dumbbell Lying Single Extension', bodyPartId: 'triceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6MfS53i.gif?alt=media&token=3d21a050-4741-4bb8-bd75-22f0be7b0db5' },
    { id: 'edb-8eqjhOl', name: 'Dumbbell Palms in Incline Bench Press', bodyPartId: 'triceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F8eqjhOl.gif?alt=media&token=39804ebd-8994-407b-bf68-8fd363580dd4' },

    // -- abs (exerciseDB demo GIFs) --
    { id: 'edb-6bOA1Oi', name: 'Weighted Side Bend (on Stability Ball)', bodyPartId: 'abs', equipment: 'Weight Plate', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6bOA1Oi.gif?alt=media&token=32511175-b8a3-49c7-a094-1cd3e4d6b20f' },
    { id: 'edb-8K0w2yA', name: 'Assisted Hanging Knee Raise With Throw Down', bodyPartId: 'abs', equipment: 'Assisted Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F8K0w2yA.gif?alt=media&token=f18a9ddf-b50f-4f96-8ba9-b19422800e8f' },
    { id: 'edb-8xUv4J7', name: 'Cable Seated Crunch', bodyPartId: 'abs', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F8xUv4J7.gif?alt=media&token=793de681-39ff-473f-b691-b2650bba464e' },

    // -- forearms (exerciseDB demo GIFs) --
    { id: 'edb-3tAXPQ6', name: 'Dumbbell Over Bench Revers Wrist Curl', bodyPartId: 'forearms', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F3tAXPQ6.gif?alt=media&token=3691c2d9-2aa8-4af6-b04e-9603fb938798' },
    { id: 'edb-6kSxYnw', name: 'Barbell Wrist Curl v. 2', bodyPartId: 'forearms', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6kSxYnw.gif?alt=media&token=9350c5d5-60b7-4147-a597-f3835a3cdafe' },

    // -- glutes (exerciseDB demo GIFs) --
    { id: 'edb-2Qh2J1e', name: 'Sled 45° Leg Press (side pov)', bodyPartId: 'glutes', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F2Qh2J1e.gif?alt=media&token=7f5ba84a-2c53-43fd-9ee9-0d951b28a054' },
    { id: 'edb-5bpPTHv', name: 'Kettlebell Pistol Squat', bodyPartId: 'glutes', equipment: 'Kettlebell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F5bpPTHv.gif?alt=media&token=95cfb4ac-989c-4817-bc00-d45abdd976b6' },
    { id: 'edb-6sYyrRX', name: 'Bent Knee Lying Twist (male)', bodyPartId: 'glutes', equipment: 'Bodyweight', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6sYyrRX.gif?alt=media&token=b5400bb7-318d-49ca-a792-a52cbae93d7b' },
    { id: 'edb-7zdxRTl', name: 'Smith Leg Press', bodyPartId: 'glutes', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F7zdxRTl.gif?alt=media&token=f1552806-c578-4573-9d74-21f8ab7fcd5d' },

    // -- hamstrings (exerciseDB demo GIFs) --
    { id: 'edb-2ORFMoR', name: 'Hack Calf Raise', bodyPartId: 'hamstrings', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F2ORFMoR.gif?alt=media&token=97324e20-c740-421d-ac5f-62f5b72b1597' },
    { id: 'edb-6HiHHe0', name: 'Barbell Standing Rocking Leg Calf Raise', bodyPartId: 'hamstrings', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F6HiHHe0.gif?alt=media&token=a945b81e-0d32-4e5f-9cef-690861dbaf13' },
    { id: 'edb-8ozhUIZ', name: 'Barbell Standing Calf Raise', bodyPartId: 'hamstrings', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F8ozhUIZ.gif?alt=media&token=0fcbf745-015c-4d07-894e-0efbe10f05db' },
  ];
  