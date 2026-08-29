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

/**
 * The 30 exerciseDB entries carry three extra sizes beyond `gifUrl` (their
 * detail-panel default): a list thumbnail, a high-DPI upgrade, and a
 * full-screen zoom source. An explicit interface, not inference from the
 * array literal, is what lets those stay optional without TypeScript
 * widening every element to a giant union — the ex1..ex82 placeholders
 * simply don't have them.
 */
export interface Exercise {
    id: string;
    name: string;
    bodyPartId: string;
    equipment: string;
    gifUrl: string;
    /** 180x180 — exercise list row icon. */
    thumbUrl?: string;
    /** 720x720 — swapped in once loaded, for a crisper steady-state image. */
    hqUrl?: string;
    /** 1080x1080 — the full-screen zoom view, loaded only on request. */
    xlUrl?: string;
}

export const exercises: Exercise[] = [
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
    { id: 'edb-3TZduzM', name: 'Barbell Incline Bench Press', bodyPartId: 'chest', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F3TZduzM.gif?alt=media&token=a430a060-e660-4a9a-a03b-43f6a693d06a', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F3TZduzM.gif?alt=media&token=092be860-9ee8-4af8-b1bd-c715dace78b6', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F3TZduzM.gif?alt=media&token=87650407-8efb-49f8-a6bf-96b2d235917d', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F3TZduzM.gif?alt=media&token=ceeb7f42-5dc4-4079-a22b-ed7cda0827f8' },
    { id: 'edb-5v7KYld', name: 'Smith Incline Bench Press', bodyPartId: 'chest', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F5v7KYld.gif?alt=media&token=18cb8fa3-99a0-45a6-ad7f-94efba28be7f', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F5v7KYld.gif?alt=media&token=8122efaa-a3fb-4a9b-a629-d84f286c5b64', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F5v7KYld.gif?alt=media&token=27802408-38ac-4f4c-ad13-0927341acb84', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F5v7KYld.gif?alt=media&token=e29a656b-2689-4b59-8b13-653e7d796b68' },
    { id: 'edb-7saC5zz', name: 'Cable Decline Fly', bodyPartId: 'chest', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F7saC5zz.gif?alt=media&token=63fbc1f6-12c1-4eba-aa8f-85b4ae6cd136', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F7saC5zz.gif?alt=media&token=ee7343a8-4d8d-4fbf-867b-d8a4ba6c56ee', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F7saC5zz.gif?alt=media&token=fb497000-56e5-4718-b030-5704806936a9', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F7saC5zz.gif?alt=media&token=b9dd3a72-e0e5-46b7-9a2c-60254c976198' },

    // -- shoulders (exerciseDB demo GIFs) --
    { id: 'edb-3eGE2JC', name: 'Dumbbell Front Raise', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F3eGE2JC.gif?alt=media&token=f68eec3c-222c-4225-96e8-06f1e7776eb7', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F3eGE2JC.gif?alt=media&token=414b8638-fde4-4603-b474-ba447df90103', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F3eGE2JC.gif?alt=media&token=d01e2a25-1235-4aec-a881-b02f17fc9315', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F3eGE2JC.gif?alt=media&token=d246dcf3-bfaf-415d-b6fd-2d80ff09392f' },
    { id: 'edb-6cKQC5E', name: 'Dumbbell One Arm Upright Row', bodyPartId: 'shoulders', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6cKQC5E.gif?alt=media&token=5ee40c0b-ce10-4305-a718-e5f74b8660fb', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6cKQC5E.gif?alt=media&token=053476cb-ad96-4980-a9a3-b4f8b5c29241', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6cKQC5E.gif?alt=media&token=d246c1c0-94ce-4eb5-ae85-1ec520a90700', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6cKQC5E.gif?alt=media&token=186e487e-a129-4041-9803-1329dc43cf1f' },

    // -- biceps (exerciseDB demo GIFs) --
    { id: 'edb-3XFdb1Z', name: 'Cable Squatting Curl', bodyPartId: 'biceps', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F3XFdb1Z.gif?alt=media&token=150cf1ba-b212-41dc-867f-e43f7ba1b8ac', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F3XFdb1Z.gif?alt=media&token=107416df-1226-4341-b822-094ec4d236a2', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F3XFdb1Z.gif?alt=media&token=073fe1e2-937d-438b-a35b-5fdb84107c1e', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F3XFdb1Z.gif?alt=media&token=ceeeab1c-44fa-49d9-aa94-85d174643283' },
    { id: 'edb-4dF3maG', name: 'Dumbbell One Arm Hammer Preacher Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F4dF3maG.gif?alt=media&token=f38567b5-e981-4ee3-913a-c5dd110625da', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F4dF3maG.gif?alt=media&token=e098da86-c56d-4d08-b03e-c81746c6be55', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F4dF3maG.gif?alt=media&token=2e5f8959-aa77-425d-9629-0b9a5ad41af8', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F4dF3maG.gif?alt=media&token=156cfeaa-58d1-446b-a9c0-eb5f453fa108' },
    { id: 'edb-4dUn2iv', name: 'Barbell Standing Close Grip Curl', bodyPartId: 'biceps', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F4dUn2iv.gif?alt=media&token=3f90e982-fa8d-4325-a6a1-cde325bef591', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F4dUn2iv.gif?alt=media&token=1dc1d4d1-8a72-4469-8bee-4aaf5035b996', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F4dUn2iv.gif?alt=media&token=479f297e-b6bc-4d92-a288-02fdf46bb918', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F4dUn2iv.gif?alt=media&token=01e44720-5312-4dd2-9725-0f93e529e5b3' },
    { id: 'edb-6sMAmNv', name: 'Dumbbell Reverse Spider Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6sMAmNv.gif?alt=media&token=c4d86020-ad32-4e59-ba25-25e8cd855c4f', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6sMAmNv.gif?alt=media&token=e43d9ad4-f80f-49af-a093-57a2f686dca5', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6sMAmNv.gif?alt=media&token=d44665a1-b1d1-4182-b12b-a439aa43e95f', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6sMAmNv.gif?alt=media&token=9be57688-bae9-4afd-846d-11e706e1bdd2' },
    { id: 'edb-7inpWch', name: 'Dumbbell Standing Concentration Curl', bodyPartId: 'biceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F7inpWch.gif?alt=media&token=c9f53659-64da-4f6d-a7f4-645d74beef01', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F7inpWch.gif?alt=media&token=16d36e3b-12a0-45a9-b20b-16435efcd612', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F7inpWch.gif?alt=media&token=818b1853-975d-4b4a-87d1-1fb5ba00ad66', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F7inpWch.gif?alt=media&token=f8101c8f-2733-4c7e-9db6-73bab4989d7f' },
    { id: 'edb-8oYqOt9', name: 'Cable Seated Curl', bodyPartId: 'biceps', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F8oYqOt9.gif?alt=media&token=0366668f-acf1-4aad-b44a-7a39210b9105', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F8oYqOt9.gif?alt=media&token=bba9e25c-faf4-497a-a036-55570a1790e7', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F8oYqOt9.gif?alt=media&token=f306bd11-f497-4c9e-b6e1-d59727fe7718', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F8oYqOt9.gif?alt=media&token=47545d9f-b530-4bc1-af5d-13b1cd03bb0b' },

    // -- back (exerciseDB demo GIFs) --
    { id: 'edb-7F1DVzn', name: 'Lever Front Pulldown', bodyPartId: 'back', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F7F1DVzn.gif?alt=media&token=0d7ba98c-dba6-4df4-a6fb-7a26232ba66d', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F7F1DVzn.gif?alt=media&token=168ad85f-2590-42d9-9247-31b400c59411', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F7F1DVzn.gif?alt=media&token=8dca03be-6af7-4895-a6a2-8473051e7f36', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F7F1DVzn.gif?alt=media&token=1533d5ef-6b7a-498f-a616-ce67476f5f7a' },
    { id: 'edb-7I6LNUG', name: 'Lever Seated Row', bodyPartId: 'back', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F7I6LNUG.gif?alt=media&token=619914e6-a5f2-42e0-a424-8aed10d74b24', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F7I6LNUG.gif?alt=media&token=d8e133f5-43c7-4a5a-b201-308728aa16fc', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F7I6LNUG.gif?alt=media&token=cc0b721e-f95c-4e2c-90a0-c6ce1ee8ec35', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F7I6LNUG.gif?alt=media&token=2a5bb6c6-63e9-4386-b16a-c0ad2ff4d8fd' },
    { id: 'edb-8urJS9b', name: 'Weighted Hyperextension (on Stability Ball)', bodyPartId: 'back', equipment: 'Weight Plate', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F8urJS9b.gif?alt=media&token=5b2e23af-3652-408d-94ee-5618515e0c2e', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F8urJS9b.gif?alt=media&token=fa30154d-cdc5-43a8-b9a9-65c2e8b09a62', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F8urJS9b.gif?alt=media&token=363c88f3-3b07-4af4-9a66-20cf18f5acb8', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F8urJS9b.gif?alt=media&token=0ee620ab-7b43-4ee8-8562-21ea0b91519f' },

    // -- triceps (exerciseDB demo GIFs) --
    { id: 'edb-05Cf2v8', name: 'Impossible Dips', bodyPartId: 'triceps', equipment: 'Bodyweight', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F05Cf2v8.gif?alt=media&token=2e633c62-11d2-4eb6-a18b-f9cc0e8f7c08', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F05Cf2v8.gif?alt=media&token=36679198-d5bc-4228-981d-7d80655592cf', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F05Cf2v8.gif?alt=media&token=ca8a04ed-5357-4624-b88b-7a47601e2689', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F05Cf2v8.gif?alt=media&token=63ff0738-8a1b-4302-9421-e6933d63b220' },
    { id: 'edb-5uFK1xr', name: 'Barbell Seated Overhead Triceps Extension', bodyPartId: 'triceps', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F5uFK1xr.gif?alt=media&token=bf7a8868-96de-4a26-9181-1571978dcd0b', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F5uFK1xr.gif?alt=media&token=0cc026d8-5438-4a80-b50b-9d65412a03a9', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F5uFK1xr.gif?alt=media&token=1ff4ced9-7297-46da-ba93-9b1438788d79', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F5uFK1xr.gif?alt=media&token=9aea83a4-f2fe-4e93-b002-d385da1fc396' },
    { id: 'edb-6MfS53i', name: 'Dumbbell Lying Single Extension', bodyPartId: 'triceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6MfS53i.gif?alt=media&token=32a7a1e2-cf83-4146-8cf0-3970a94a002d', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6MfS53i.gif?alt=media&token=c812a4ff-2f71-481e-b114-414f8928d524', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6MfS53i.gif?alt=media&token=aad019d2-344a-4717-a7e6-5d76c62044da', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6MfS53i.gif?alt=media&token=574c10a5-dbc7-4e49-94cd-9609cffb3588' },
    { id: 'edb-8eqjhOl', name: 'Dumbbell Palms in Incline Bench Press', bodyPartId: 'triceps', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F8eqjhOl.gif?alt=media&token=873a5c38-3a30-4377-9f99-6007c5406767', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F8eqjhOl.gif?alt=media&token=a1271e7c-5b25-4686-862c-1a4cdf809259', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F8eqjhOl.gif?alt=media&token=0963fbe4-307b-43a4-8779-ef182183e241', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F8eqjhOl.gif?alt=media&token=810d0197-9afe-4655-9f30-5ecf98b8a0b0' },

    // -- abs (exerciseDB demo GIFs) --
    { id: 'edb-6bOA1Oi', name: 'Weighted Side Bend (on Stability Ball)', bodyPartId: 'abs', equipment: 'Weight Plate', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6bOA1Oi.gif?alt=media&token=7446e2f0-bb22-43c7-a7ad-4611fd73c675', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6bOA1Oi.gif?alt=media&token=8eec6deb-7d62-4735-ac8a-1e44aff89339', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6bOA1Oi.gif?alt=media&token=a9d7948d-6b26-4845-ac32-073fe1e25238', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6bOA1Oi.gif?alt=media&token=968e3abc-e37d-42ea-943a-b1d22d09253f' },
    { id: 'edb-8K0w2yA', name: 'Assisted Hanging Knee Raise With Throw Down', bodyPartId: 'abs', equipment: 'Assisted Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F8K0w2yA.gif?alt=media&token=26956a6b-2465-413b-becb-10a3834d9d25', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F8K0w2yA.gif?alt=media&token=84350ce4-a76c-4159-8aad-993c18dad268', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F8K0w2yA.gif?alt=media&token=a4ab66e3-02d2-415b-a096-005bd9a44320', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F8K0w2yA.gif?alt=media&token=a6e14d80-638e-4a79-967d-f51789c9aeaa' },
    { id: 'edb-8xUv4J7', name: 'Cable Seated Crunch', bodyPartId: 'abs', equipment: 'Cable', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F8xUv4J7.gif?alt=media&token=8f40778e-5f8d-4d1c-8541-9089c025d99f', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F8xUv4J7.gif?alt=media&token=844669ac-d0cc-4269-b364-47f5cec8880d', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F8xUv4J7.gif?alt=media&token=610879ed-666b-4038-9eee-88fc40766f57', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F8xUv4J7.gif?alt=media&token=b91ff160-c374-4651-8150-9120a2e1abbd' },

    // -- forearms (exerciseDB demo GIFs) --
    { id: 'edb-3tAXPQ6', name: 'Dumbbell Over Bench Revers Wrist Curl', bodyPartId: 'forearms', equipment: 'Dumbbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F3tAXPQ6.gif?alt=media&token=676903e6-1da3-4b05-8ac6-15154e7b139b', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F3tAXPQ6.gif?alt=media&token=5964f31a-4f54-4568-92be-2bd6ce8e57c6', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F3tAXPQ6.gif?alt=media&token=82b692e3-c311-45e9-9cd3-891ce126e5cb', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F3tAXPQ6.gif?alt=media&token=7b0df2a5-d650-4dc8-9700-27f8b031cbf2' },
    { id: 'edb-6kSxYnw', name: 'Barbell Wrist Curl v. 2', bodyPartId: 'forearms', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6kSxYnw.gif?alt=media&token=235501de-0e2b-4130-9ff7-2d060a21e6e4', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6kSxYnw.gif?alt=media&token=944f6db2-544b-4e7a-b9ec-188b47c162c6', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6kSxYnw.gif?alt=media&token=81c70f16-0cce-4846-a3df-909cc48227ee', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6kSxYnw.gif?alt=media&token=4d16613a-c367-48d8-88ec-9e2535338321' },

    // -- glutes (exerciseDB demo GIFs) --
    { id: 'edb-2Qh2J1e', name: 'Sled 45° Leg Press (side pov)', bodyPartId: 'glutes', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F2Qh2J1e.gif?alt=media&token=d90154b8-2ac4-4070-93cb-94133c83dad8', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F2Qh2J1e.gif?alt=media&token=e0e8e56c-07b1-45b9-8b79-a2895dbcac1d', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F2Qh2J1e.gif?alt=media&token=3e1fe3d2-1464-4966-875a-4728248bfa93', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F2Qh2J1e.gif?alt=media&token=c50c76d4-277c-4432-9495-48b7affd9c62' },
    { id: 'edb-5bpPTHv', name: 'Kettlebell Pistol Squat', bodyPartId: 'glutes', equipment: 'Kettlebell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F5bpPTHv.gif?alt=media&token=f40f3a87-936b-4b61-baef-ea8c991e6404', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F5bpPTHv.gif?alt=media&token=55af61a9-38b2-4c5b-baf3-1f4f244d5ef2', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F5bpPTHv.gif?alt=media&token=5e3b8a58-7e37-44b4-b2cc-67dcfb00dd3d', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F5bpPTHv.gif?alt=media&token=e7ade8c3-3c43-44a9-b655-13d2388ee7df' },
    { id: 'edb-6sYyrRX', name: 'Bent Knee Lying Twist (male)', bodyPartId: 'glutes', equipment: 'Bodyweight', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6sYyrRX.gif?alt=media&token=8fccaa45-dfcd-4d41-a1f4-da5a287bd570', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6sYyrRX.gif?alt=media&token=4042ae5b-25d6-47fb-9aa8-3b69c886f7d8', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6sYyrRX.gif?alt=media&token=61496a51-b4dd-4d4a-b0a4-a8c867b77696', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6sYyrRX.gif?alt=media&token=806315c1-51a4-4a6b-be9e-cf9af8118830' },
    { id: 'edb-7zdxRTl', name: 'Smith Leg Press', bodyPartId: 'glutes', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F7zdxRTl.gif?alt=media&token=1e0e9f4c-77c3-41ae-850b-590e0ac0e5eb', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F7zdxRTl.gif?alt=media&token=c6ca22b5-89cd-4fb3-aad5-d2c97fab46e1', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F7zdxRTl.gif?alt=media&token=baf5240a-69cc-4e5c-bb35-775a50ff1350', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F7zdxRTl.gif?alt=media&token=050bf4d4-ef17-48c2-88c4-bba3d9381030' },

    // -- hamstrings (exerciseDB demo GIFs) --
    { id: 'edb-2ORFMoR', name: 'Hack Calf Raise', bodyPartId: 'hamstrings', equipment: 'Machine', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F2ORFMoR.gif?alt=media&token=53d451c4-98b0-4803-b6ea-1d16bb397277', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F2ORFMoR.gif?alt=media&token=7072e400-a530-41c5-85d6-de0f34b54cca', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F2ORFMoR.gif?alt=media&token=b739bea9-9af6-42db-9210-1f12ff003f1f', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F2ORFMoR.gif?alt=media&token=b6af0943-cb40-42c8-89ae-07a6374879d9' },
    { id: 'edb-6HiHHe0', name: 'Barbell Standing Rocking Leg Calf Raise', bodyPartId: 'hamstrings', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F6HiHHe0.gif?alt=media&token=4efd41c9-5c18-4deb-abcc-f97acc617371', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F6HiHHe0.gif?alt=media&token=e69413bb-cde6-46a5-a533-4b29a8bba32f', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F6HiHHe0.gif?alt=media&token=f635c72a-78bc-4f0b-b616-6be7cc420618', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F6HiHHe0.gif?alt=media&token=e8e415a7-5d42-4806-84a4-82d9bd5e01fb' },
    { id: 'edb-8ozhUIZ', name: 'Barbell Standing Calf Raise', bodyPartId: 'hamstrings', equipment: 'Barbell', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F360x360%2F8ozhUIZ.gif?alt=media&token=51c2616b-072e-443a-8d50-62dd84e75732', thumbUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F180x180%2F8ozhUIZ.gif?alt=media&token=f7c2419f-b6bf-4c72-81ce-3e92ee49836e', hqUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F720x720%2F8ozhUIZ.gif?alt=media&token=859ef8d5-98dd-42c1-b8c6-ef04002b43f4', xlUrl: 'https://firebasestorage.googleapis.com/v0/b/sportmind-ai-lo721.firebasestorage.app/o/exerciseMedia%2F1080x1080%2F8ozhUIZ.gif?alt=media&token=ecc78a65-fbc2-4763-ae66-26fa9630ec78' },
  ];
  