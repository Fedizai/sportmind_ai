import type { LucideIcon } from "lucide-react";
import { Dribbble, Shield, Waves } from "lucide-react";

export type Lang = "en" | "fr";

/** A bilingual string. */
export type Bi = { en: string; fr: string };

export function pick(value: Bi, lang: Lang): string {
    return value[lang] ?? value.en;
}

/** A numeric stat captured per logbook entry. */
export type StatField = {
    key: string;
    label: Bi;
    suffix?: string;
    default?: number;
    /** Up to 4 stats are surfaced on the entry card. */
    showOnCard?: boolean;
};

export type ResultOption = {
    value: string;
    label: Bi;
    tone: "success" | "danger" | "muted";
};

export type ExerciseLevel = "beginner" | "intermediate" | "advanced";

/** A curated, hand-written exercise (no AI). */
export type Exercise = {
    category: string;
    name: Bi;
    /** Sets/reps or time prescription, e.g. "4 × 10 reps" or "3 rounds × 2 min". */
    prescription: Bi;
    level: ExerciseLevel;
    description: Bi;
    /** 2–3 short coaching cues. */
    cues: Bi[];
};

export type ExerciseCategory = { key: string; label: Bi };

/** How a weekly-recap tile derives its value. */
export type RecapKind =
    | "sessions"
    | "count"
    | "wins"
    | { sum: string }
    | { avg: string };

export type RecapTile = { label: Bi; kind: RecapKind; suffix?: string };

export type SportConfig = {
    id: "basketball" | "boxing" | "swimming";
    sportName: Bi;
    icon: LucideIcon;
    /** Firestore collection (must match the server-action allowlist). */
    collection: string;

    /** The free-text headline field of an entry: opponent, or event for swimming. */
    primaryField: { label: Bi; placeholder: Bi };
    /** Optional secondary text field: score / method / finish time. */
    summaryField?: { key: string; label: Bi; placeholder: Bi };
    /** Win/Loss style outcome. Omitted for non-versus sports (swimming). */
    results?: ResultOption[];

    statFields: StatField[];
    /** Exactly five axes for the progress radar. */
    radarSubjects: Bi[];
    exerciseCategories: ExerciseCategory[];
    exercises: Exercise[];

    recap: RecapTile[];
    charts: {
        last5: { key: string; label: Bi };
        monthly: { key: string; label: Bi };
    };

    aiInsight: Bi;
    entryNoun: Bi;
    logTitle: Bi;
    logDesc: Bi;
    logAddLabel: Bi;
    emptyLog: Bi;
};

const WIN_LOSS: ResultOption[] = [
    { value: "W", label: { en: "Win", fr: "Victoire" }, tone: "success" },
    { value: "L", label: { en: "Loss", fr: "Défaite" }, tone: "danger" },
];

export const basketballConfig: SportConfig = {
    id: "basketball",
    sportName: { en: "Basketball", fr: "Basketball" },
    icon: Dribbble,
    collection: "basketball_games",
    primaryField: {
        label: { en: "Opponent", fr: "Adversaire" },
        placeholder: { en: "e.g. City Hoops", fr: "ex. City Hoops" },
    },
    summaryField: {
        key: "summary",
        label: { en: "Final Score", fr: "Score Final" },
        placeholder: { en: "e.g. 88–74", fr: "ex. 88–74" },
    },
    results: WIN_LOSS,
    statFields: [
        { key: "points", label: { en: "Points", fr: "Points" }, default: 0, showOnCard: true },
        { key: "rebounds", label: { en: "Rebounds", fr: "Rebonds" }, default: 0, showOnCard: true },
        { key: "assists", label: { en: "Assists", fr: "Passes D." }, default: 0, showOnCard: true },
        { key: "steals", label: { en: "Steals", fr: "Interceptions" }, default: 0, showOnCard: true },
        { key: "minutes", label: { en: "Minutes", fr: "Minutes" }, default: 24 },
    ],
    radarSubjects: [
        { en: "Shooting", fr: "Tir" },
        { en: "Passing", fr: "Passe" },
        { en: "Defense", fr: "Défense" },
        { en: "Speed", fr: "Vitesse" },
        { en: "Stamina", fr: "Endurance" },
    ],
    exerciseCategories: [
        { key: "shooting", label: { en: "Shooting", fr: "Tir" } },
        { key: "handling", label: { en: "Ball Handling", fr: "Maniement" } },
        { key: "defense", label: { en: "Defense", fr: "Défense" } },
        { key: "finishing", label: { en: "Finishing", fr: "Finition" } },
        { key: "conditioning", label: { en: "Conditioning", fr: "Condition Physique" } },
    ],
    exercises: [
        {
            category: "shooting", level: "beginner",
            name: { en: "Form Shooting", fr: "Tir Technique" },
            prescription: { en: "4 sets × 10 makes", fr: "4 séries × 10 paniers" },
            description: { en: "Start one step from the rim and shoot one-handed, focusing purely on a clean release and soft backspin. Move back a step only after a perfect set.", fr: "Commence à un pas du cercle et tire à une main, en te concentrant sur un lâcher propre et un backspin doux. Recule d'un pas seulement après une série parfaite." },
            cues: [{ en: "Elbow under the ball", fr: "Coude sous le ballon" }, { en: "Snap the wrist, hold the follow-through", fr: "Casse le poignet, tiens le geste" }, { en: "Eyes on the back of the rim", fr: "Yeux sur l'arrière du cercle" }],
        },
        {
            category: "shooting", level: "intermediate",
            name: { en: "Catch-and-Shoot — 5 Spots", fr: "Catch-and-Shoot — 5 Spots" },
            prescription: { en: "5 spots × 5 makes", fr: "5 spots × 5 paniers" },
            description: { en: "Move around five perimeter spots. At each, receive an imaginary pass, set your feet, and rise into the shot in one motion. Make five before moving on.", fr: "Déplace-toi sur cinq spots du périmètre. À chaque spot, reçois une passe imaginaire, cale tes appuis et monte au tir en un seul mouvement. Marque cinq fois avant de continuer." },
            cues: [{ en: "Feet set before the catch", fr: "Appuis posés avant la réception" }, { en: "Same release every time", fr: "Même lâcher à chaque fois" }],
        },
        {
            category: "shooting", level: "intermediate",
            name: { en: "Free-Throw Routine", fr: "Routine Lancers Francs" },
            prescription: { en: "10 sets of 2", fr: "10 séries de 2" },
            description: { en: "Shoot pairs of free throws with your full pre-shot routine before each. Track your make percentage and try to beat it next session.", fr: "Tire des paires de lancers francs avec ta routine complète avant chaque tir. Note ton pourcentage de réussite et essaie de le battre la prochaine fois." },
            cues: [{ en: "Identical routine every rep", fr: "Routine identique à chaque tir" }, { en: "Exhale, then shoot", fr: "Expire, puis tire" }],
        },
        {
            category: "handling", level: "beginner",
            name: { en: "Pound Dribble Series", fr: "Série Dribble Puissant" },
            prescription: { en: "4 × 30s each hand", fr: "4 × 30s chaque main" },
            description: { en: "Dribble hard and low with one hand, pounding the ball below knee height. Keep your head up the entire time. Switch hands each set.", fr: "Dribble fort et bas d'une main, en frappant le ballon sous le genou. Garde la tête haute tout le temps. Change de main à chaque série." },
            cues: [{ en: "Below the knee", fr: "Sous le genou" }, { en: "Head up, eyes forward", fr: "Tête haute, regard devant" }],
        },
        {
            category: "handling", level: "intermediate",
            name: { en: "Two-Ball Dribble", fr: "Dribble à Deux Ballons" },
            prescription: { en: "3 × 45s", fr: "3 × 45s" },
            description: { en: "Dribble two balls at once — first together, then alternating. Builds ambidextrous control and hand strength under fatigue.", fr: "Dribble deux ballons à la fois — d'abord ensemble, puis en alternance. Développe le contrôle des deux mains et la force sous fatigue." },
            cues: [{ en: "Fingertips, not palms", fr: "Bouts des doigts, pas les paumes" }, { en: "Stay low and balanced", fr: "Reste bas et équilibré" }],
        },
        {
            category: "handling", level: "advanced",
            name: { en: "Cone Crossover Weave", fr: "Slalom Crossover" },
            prescription: { en: "5 full-court lengths", fr: "5 longueurs de terrain" },
            description: { en: "Weave through a line of cones, executing a tight crossover at each. Push the pace each length while keeping the ball on a string.", fr: "Slalome entre une ligne de plots en exécutant un crossover serré à chacun. Accélère à chaque longueur en gardant le ballon collé à la main." },
            cues: [{ en: "Change pace at each cone", fr: "Change de rythme à chaque plot" }, { en: "Protect with your off-arm", fr: "Protège avec le bras libre" }],
        },
        {
            category: "defense", level: "beginner",
            name: { en: "Defensive Slide Ladder", fr: "Échelle de Glissements Défensifs" },
            prescription: { en: "4 × 30s", fr: "4 × 30s" },
            description: { en: "In a low stance, slide laterally without crossing your feet. Stay down the whole interval — no standing up between slides.", fr: "En position basse, glisse latéralement sans croiser les pieds. Reste bas tout l'intervalle — ne te relève pas entre les glissements." },
            cues: [{ en: "Don't cross your feet", fr: "Ne croise pas les pieds" }, { en: "Chest up, hips down", fr: "Poitrine haute, hanches basses" }],
        },
        {
            category: "defense", level: "intermediate",
            name: { en: "Closeout & Contest", fr: "Closeout & Contestation" },
            prescription: { en: "3 × 8 reps", fr: "3 × 8 répétitions" },
            description: { en: "Sprint from the paint to the perimeter, break down with choppy steps, and contest with a high hand without fouling.", fr: "Sprinte de la raquette au périmètre, freine en petits pas et conteste main haute sans faire faute." },
            cues: [{ en: "Chop your steps on arrival", fr: "Petits pas à l'arrivée" }, { en: "High hand, stay grounded", fr: "Main haute, reste au sol" }],
        },
        {
            category: "finishing", level: "beginner",
            name: { en: "Mikan Drill", fr: "Exercice Mikan" },
            prescription: { en: "3 × 1 min", fr: "3 × 1 min" },
            description: { en: "Alternate layups on each side of the rim continuously, catching and finishing high off the correct foot. Build soft touch and rhythm.", fr: "Enchaîne des layups de chaque côté du cercle, en attrapant et finissant haut sur le bon pied. Développe le toucher et le rythme." },
            cues: [{ en: "Finish high off the glass", fr: "Finis haut sur la planche" }, { en: "Opposite hand, opposite foot", fr: "Main opposée, pied opposé" }],
        },
        {
            category: "finishing", level: "intermediate",
            name: { en: "Euro-Step Finish", fr: "Finition Euro-Step" },
            prescription: { en: "4 × 6 each side", fr: "4 × 6 chaque côté" },
            description: { en: "Attack the rim, plant and step laterally to avoid a help defender, then finish on the far side. Sell the first direction.", fr: "Attaque le cercle, plante et fais un pas latéral pour éviter l'aide, puis finis du côté opposé. Vends la première direction." },
            cues: [{ en: "Sell the first step", fr: "Vends le premier pas" }, { en: "Protect the ball across your body", fr: "Protège le ballon devant le corps" }],
        },
        {
            category: "conditioning", level: "intermediate",
            name: { en: "Suicide Sprints", fr: "Sprints Navette" },
            prescription: { en: "6 × full court", fr: "6 × terrain complet" },
            description: { en: "Sprint to each line and back — free throw, half court, far free throw, far baseline — touching every line. Rest 45s between reps.", fr: "Sprinte vers chaque ligne et reviens — lancer franc, milieu, lancer franc opposé, ligne de fond — en touchant chaque ligne. Repos 45s entre les répétitions." },
            cues: [{ en: "Touch every line", fr: "Touche chaque ligne" }, { en: "Low, explosive turns", fr: "Demi-tours bas et explosifs" }],
        },
        {
            category: "conditioning", level: "advanced",
            name: { en: "Transition Sprints", fr: "Sprints en Transition" },
            prescription: { en: "8 × baseline to baseline", fr: "8 × ligne de fond à ligne de fond" },
            description: { en: "Sprint the full court finishing with a layup, then jog back. Simulates fast-break load and trains finishing with a high heart rate.", fr: "Sprinte tout le terrain en finissant par un layup, puis reviens en trottinant. Simule la charge de contre-attaque et entraîne la finition à haute fréquence cardiaque." },
            cues: [{ en: "Full speed, controlled finish", fr: "Pleine vitesse, finition contrôlée" }, { en: "Sprint out, jog back", fr: "Sprint aller, trot retour" }],
        },
    ],
    recap: [
        { label: { en: "Sessions", fr: "Séances" }, kind: "sessions" },
        { label: { en: "Games", fr: "Matchs" }, kind: "count" },
        { label: { en: "Wins", fr: "Victoires" }, kind: "wins" },
        { label: { en: "Avg Points", fr: "Pts Moyens" }, kind: { avg: "points" } },
    ],
    charts: {
        last5: { key: "points", label: { en: "Points (last 5 games)", fr: "Points (5 derniers matchs)" } },
        monthly: { key: "assists", label: { en: "Assists per Month", fr: "Passes par Mois" } },
    },
    aiInsight: {
        en: "Your scoring is strong, but turnovers rose in your last two games. Let's tighten ball control under pressure — try the 'Two-Ball Dribble' and 'Pivot & Protect' drills this week.",
        fr: "Ton scoring est solide, mais les pertes de balle ont augmenté sur tes deux derniers matchs. Resserrons le contrôle de balle sous pression — essaie les exercices « Dribble à Deux Ballons » et « Pivot & Protection » cette semaine.",
    },
    entryNoun: { en: "Game", fr: "Match" },
    logTitle: { en: "Game Logbook", fr: "Journal de Matchs" },
    logDesc: { en: "Record your game stats and track your performance trends.", fr: "Enregistrez vos stats de match et suivez vos tendances de performance." },
    logAddLabel: { en: "Log New Game", fr: "Ajouter un Match" },
    emptyLog: { en: "No games logged yet.", fr: "Aucun match enregistré pour le moment." },
};

export const boxingConfig: SportConfig = {
    id: "boxing",
    sportName: { en: "Boxing", fr: "Boxe" },
    icon: Shield,
    collection: "boxing_bouts",
    primaryField: {
        label: { en: "Opponent", fr: "Adversaire" },
        placeholder: { en: "e.g. R. Martinez", fr: "ex. R. Martinez" },
    },
    summaryField: {
        key: "summary",
        label: { en: "Method", fr: "Méthode" },
        placeholder: { en: "e.g. TKO R3 / Decision", fr: "ex. TKO R3 / Décision" },
    },
    results: [
        { value: "W", label: { en: "Win", fr: "Victoire" }, tone: "success" },
        { value: "L", label: { en: "Loss", fr: "Défaite" }, tone: "danger" },
        { value: "D", label: { en: "Draw", fr: "Nul" }, tone: "muted" },
    ],
    statFields: [
        { key: "rounds", label: { en: "Rounds", fr: "Rounds" }, default: 3, showOnCard: true },
        { key: "punchesLanded", label: { en: "Punches Landed", fr: "Coups Portés" }, default: 0, showOnCard: true },
        { key: "accuracy", label: { en: "Accuracy", fr: "Précision" }, suffix: "%", default: 0, showOnCard: true },
        { key: "knockdowns", label: { en: "Knockdowns", fr: "Knockdowns" }, default: 0, showOnCard: true },
    ],
    radarSubjects: [
        { en: "Power", fr: "Puissance" },
        { en: "Speed", fr: "Vitesse" },
        { en: "Defense", fr: "Défense" },
        { en: "Footwork", fr: "Jeu de Jambes" },
        { en: "Stamina", fr: "Endurance" },
    ],
    exerciseCategories: [
        { key: "jab", label: { en: "Jab", fr: "Jab" } },
        { key: "footwork", label: { en: "Footwork", fr: "Jeu de Jambes" } },
        { key: "defense", label: { en: "Defense", fr: "Défense" } },
        { key: "combos", label: { en: "Combinations", fr: "Combinaisons" } },
        { key: "conditioning", label: { en: "Conditioning", fr: "Condition Physique" } },
    ],
    exercises: [
        {
            category: "jab", level: "beginner",
            name: { en: "Mirror Jab Reps", fr: "Jab au Miroir" },
            prescription: { en: "3 rounds × 2 min", fr: "3 rounds × 2 min" },
            description: { en: "Throw jabs in front of a mirror, watching that your guard hand stays high and your chin stays tucked. Snap each jab back fast.", fr: "Envoie des jabs devant un miroir en vérifiant que ta garde reste haute et ton menton rentré. Ramène chaque jab rapidement." },
            cues: [{ en: "Snap it back, don't push", fr: "Claque et ramène, ne pousse pas" }, { en: "Chin down, rear hand up", fr: "Menton baissé, main arrière haute" }],
        },
        {
            category: "jab", level: "intermediate",
            name: { en: "Double Jab — Step In", fr: "Double Jab — Pas en Avant" },
            prescription: { en: "4 rounds × 2 min", fr: "4 rounds × 2 min" },
            description: { en: "Step in behind a double jab to close distance, then reset out. The first jab measures, the second lands. Stay balanced on the step.", fr: "Avance derrière un double jab pour réduire la distance, puis ressors. Le premier jab mesure, le second touche. Reste équilibré sur le pas." },
            cues: [{ en: "First jab measures, second scores", fr: "Premier jab mesure, second marque" }, { en: "Reset out at an angle", fr: "Ressors en angle" }],
        },
        {
            category: "footwork", level: "beginner",
            name: { en: "Ladder In-and-Out", fr: "Échelle Avant-Arrière" },
            prescription: { en: "4 × 30s", fr: "4 × 30s" },
            description: { en: "Quick feet through an agility ladder, staying on the balls of your feet. Keep your hands up in guard the whole time.", fr: "Pieds rapides dans l'échelle d'agilité, en restant sur la pointe des pieds. Garde les mains en garde tout le temps." },
            cues: [{ en: "On the balls of your feet", fr: "Sur la pointe des pieds" }, { en: "Guard stays up", fr: "La garde reste haute" }],
        },
        {
            category: "footwork", level: "intermediate",
            name: { en: "Pivot Circles", fr: "Pivots en Cercle" },
            prescription: { en: "3 rounds × 2 min", fr: "3 rounds × 2 min" },
            description: { en: "Pivot off your lead foot to circle around an imaginary opponent, throwing a jab each time you reset your angle.", fr: "Pivote sur ton pied avant pour tourner autour d'un adversaire imaginaire, en plaçant un jab à chaque nouvel angle." },
            cues: [{ en: "Pivot on the lead foot", fr: "Pivote sur le pied avant" }, { en: "Create a new angle each time", fr: "Crée un nouvel angle à chaque fois" }],
        },
        {
            category: "footwork", level: "advanced",
            name: { en: "Lateral Step Shadow", fr: "Shadow Pas Latéraux" },
            prescription: { en: "4 rounds × 2 min", fr: "4 rounds × 2 min" },
            description: { en: "Shadow-box moving only laterally — never straight back. Cut angles left and right after every combination.", fr: "Shadow-boxing en te déplaçant uniquement latéralement — jamais en ligne droite vers l'arrière. Coupe les angles à gauche et à droite après chaque combinaison." },
            cues: [{ en: "Never run straight back", fr: "Ne recule jamais en ligne droite" }, { en: "Off the line after punching", fr: "Sors de l'axe après avoir frappé" }],
        },
        {
            category: "defense", level: "beginner",
            name: { en: "Slip Rope Drill", fr: "Esquive à la Corde" },
            prescription: { en: "4 rounds × 2 min", fr: "4 rounds × 2 min" },
            description: { en: "Slip side to side under a horizontal rope at head height, bending at the knees and waist — not just the neck. Keep your eyes forward.", fr: "Esquive d'un côté à l'autre sous une corde tendue à hauteur de tête, en pliant les genoux et la taille — pas seulement le cou. Garde les yeux devant." },
            cues: [{ en: "Slip with the legs, not the neck", fr: "Esquive avec les jambes, pas le cou" }, { en: "Eyes stay on target", fr: "Les yeux restent sur la cible" }],
        },
        {
            category: "defense", level: "intermediate",
            name: { en: "Catch & Counter", fr: "Bloque & Contre" },
            prescription: { en: "3 rounds × 2 min", fr: "3 rounds × 2 min" },
            description: { en: "With a partner or coach throwing light jabs, catch on your rear glove and fire an immediate straight counter. Defense and offense as one beat.", fr: "Avec un partenaire ou coach qui envoie des jabs légers, bloque avec le gant arrière et riposte aussitôt d'un direct. Défense et attaque en un seul temps." },
            cues: [{ en: "Catch and counter on one beat", fr: "Bloque et contre en un temps" }, { en: "Don't reach for the catch", fr: "Ne va pas chercher le blocage" }],
        },
        {
            category: "defense", level: "advanced",
            name: { en: "Roll Under Hooks", fr: "Roulis sous les Crochets" },
            prescription: { en: "3 rounds × 2 min", fr: "3 rounds × 2 min" },
            description: { en: "Roll under looping hooks by bending at the knees and rotating your torso, coming up on the other side ready to counter.", fr: "Roule sous les crochets en pliant les genoux et en faisant pivoter le buste, pour ressortir de l'autre côté prêt à contrer." },
            cues: [{ en: "Roll in a U-shape", fr: "Roule en forme de U" }, { en: "Come up in range to counter", fr: "Ressors à portée pour contrer" }],
        },
        {
            category: "combos", level: "beginner",
            name: { en: "1-2 on the Bag", fr: "1-2 au Sac" },
            prescription: { en: "5 rounds × 2 min", fr: "5 rounds × 2 min" },
            description: { en: "Throw the fundamental jab–cross on the heavy bag, rotating your hips into the cross. Reset your guard after every pair.", fr: "Envoie le jab–direct fondamental au sac lourd, en faisant pivoter les hanches sur le direct. Remets la garde après chaque paire." },
            cues: [{ en: "Rotate the hips on the cross", fr: "Pivote les hanches sur le direct" }, { en: "Guard back instantly", fr: "Garde de retour instantanément" }],
        },
        {
            category: "combos", level: "intermediate",
            name: { en: "Body–Head Combo", fr: "Combo Corps–Tête" },
            prescription: { en: "4 rounds × 2 min", fr: "4 rounds × 2 min" },
            description: { en: "Dig a hook to the body, then come straight back up to the head. Bend your knees for the body shot rather than dropping your hands.", fr: "Place un crochet au corps, puis remonte aussitôt à la tête. Plie les genoux pour le coup au corps plutôt que de baisser les mains." },
            cues: [{ en: "Bend the knees for the body", fr: "Plie les genoux pour le corps" }, { en: "Up the centre to the head", fr: "Remonte au centre vers la tête" }],
        },
        {
            category: "conditioning", level: "intermediate",
            name: { en: "Heavy Bag Intervals", fr: "Intervalles Sac Lourd" },
            prescription: { en: "6 × 2 min, 30s rest", fr: "6 × 2 min, 30s repos" },
            description: { en: "Work the bag at a high output for two minutes — punch in bursts, never drift. Builds the engine to maintain volume late in a fight.", fr: "Travaille le sac à haut volume pendant deux minutes — frappe par rafales, ne flotte jamais. Développe le moteur pour tenir le volume en fin de combat." },
            cues: [{ en: "Punch in bursts, then move", fr: "Frappe par rafales, puis bouge" }, { en: "Breathe out on every shot", fr: "Expire sur chaque coup" }],
        },
        {
            category: "conditioning", level: "beginner",
            name: { en: "Jump Rope Rounds", fr: "Rounds Corde à Sauter" },
            prescription: { en: "5 × 3 min", fr: "5 × 3 min" },
            description: { en: "Skip continuously for three-minute rounds to build calf endurance, rhythm, and the light footwork boxing demands.", fr: "Saute à la corde en continu sur des rounds de trois minutes pour développer l'endurance des mollets, le rythme et le jeu de jambes léger qu'exige la boxe." },
            cues: [{ en: "Stay light on the balls of your feet", fr: "Reste léger sur la pointe des pieds" }, { en: "Relaxed shoulders, fast wrists", fr: "Épaules relâchées, poignets rapides" }],
        },
    ],
    recap: [
        { label: { en: "Sessions", fr: "Séances" }, kind: "sessions" },
        { label: { en: "Bouts", fr: "Combats" }, kind: "count" },
        { label: { en: "Wins", fr: "Victoires" }, kind: "wins" },
        { label: { en: "Avg Accuracy", fr: "Précision Moy." }, kind: { avg: "accuracy" }, suffix: "%" },
    ],
    charts: {
        last5: { key: "punchesLanded", label: { en: "Punches Landed (last 5 bouts)", fr: "Coups Portés (5 derniers combats)" } },
        monthly: { key: "rounds", label: { en: "Rounds Boxed per Month", fr: "Rounds Boxés par Mois" } },
    },
    aiInsight: {
        en: "Your output is high, but your guard drops after combinations. Prioritise defensive recovery — drill 'Slip & Return' and shadow-box keeping both hands high through the full round.",
        fr: "Ton volume de coups est élevé, mais ta garde baisse après les combinaisons. Priorise la récupération défensive — travaille « Esquive & Riposte » et fais du shadow-boxing en gardant les deux mains hautes tout le round.",
    },
    entryNoun: { en: "Bout", fr: "Combat" },
    logTitle: { en: "Bout Logbook", fr: "Journal de Combats" },
    logDesc: { en: "Record your bouts and sparring sessions to track your fight stats.", fr: "Enregistrez vos combats et sparrings pour suivre vos statistiques." },
    logAddLabel: { en: "Log New Bout", fr: "Ajouter un Combat" },
    emptyLog: { en: "No bouts logged yet.", fr: "Aucun combat enregistré pour le moment." },
};

export const swimmingConfig: SportConfig = {
    id: "swimming",
    sportName: { en: "Swimming", fr: "Natation" },
    icon: Waves,
    collection: "swimming_sessions",
    primaryField: {
        label: { en: "Event", fr: "Épreuve" },
        placeholder: { en: "e.g. 100m Freestyle", fr: "ex. 100m Nage Libre" },
    },
    summaryField: {
        key: "summary",
        label: { en: "Time", fr: "Temps" },
        placeholder: { en: "e.g. 1:02.4", fr: "ex. 1:02.4" },
    },
    // No win/loss — swimming entries are races / time trials.
    statFields: [
        { key: "distance", label: { en: "Distance", fr: "Distance" }, suffix: "m", default: 100, showOnCard: true },
        { key: "seconds", label: { en: "Time", fr: "Temps" }, suffix: "s", default: 0, showOnCard: true },
        { key: "laps", label: { en: "Laps", fr: "Longueurs" }, default: 0, showOnCard: true },
        { key: "avgHr", label: { en: "Avg HR", fr: "FC Moy." }, default: 0, showOnCard: true },
    ],
    radarSubjects: [
        { en: "Freestyle", fr: "Nage Libre" },
        { en: "Backstroke", fr: "Dos" },
        { en: "Breaststroke", fr: "Brasse" },
        { en: "Butterfly", fr: "Papillon" },
        { en: "Endurance", fr: "Endurance" },
    ],
    exerciseCategories: [
        { key: "technique", label: { en: "Technique", fr: "Technique" } },
        { key: "breathing", label: { en: "Breathing", fr: "Respiration" } },
        { key: "turns", label: { en: "Turns & Walls", fr: "Virages & Murs" } },
        { key: "kick", label: { en: "Kick Power", fr: "Puissance Jambes" } },
        { key: "endurance", label: { en: "Endurance", fr: "Endurance" } },
    ],
    exercises: [
        {
            category: "technique", level: "beginner",
            name: { en: "Catch-Up Drill", fr: "Exercice Rattrapé" },
            prescription: { en: "4 × 50m", fr: "4 × 50m" },
            description: { en: "Swim freestyle but keep one arm extended forward until the other hand 'catches up' to it. Forces a long, patient stroke and a full reach.", fr: "Nage en crawl mais garde un bras tendu devant jusqu'à ce que l'autre main le « rattrape ». Force une nage longue et patiente avec une extension complète." },
            cues: [{ en: "Reach long before you pull", fr: "Allonge avant de tirer" }, { en: "Rotate from the hips", fr: "Roule depuis les hanches" }],
        },
        {
            category: "technique", level: "intermediate",
            name: { en: "Fingertip Drag", fr: "Traînée des Doigts" },
            prescription: { en: "6 × 25m", fr: "6 × 25m" },
            description: { en: "On the recovery, drag your fingertips along the surface of the water. Trains a high elbow and a relaxed arm recovery.", fr: "Pendant le retour, traîne le bout des doigts à la surface de l'eau. Entraîne un coude haut et un retour de bras relâché." },
            cues: [{ en: "High elbow on recovery", fr: "Coude haut au retour" }, { en: "Relax the trailing hand", fr: "Relâche la main qui traîne" }],
        },
        {
            category: "technique", level: "advanced",
            name: { en: "3-3-3 Drill", fr: "Exercice 3-3-3" },
            prescription: { en: "4 × 50m", fr: "4 × 50m" },
            description: { en: "Three strokes left-arm only, three right-arm only, three full stroke. Sharpens single-arm balance and body rotation.", fr: "Trois mouvements bras gauche seul, trois bras droit seul, trois en nage complète. Affine l'équilibre sur un bras et la rotation du corps." },
            cues: [{ en: "Stay balanced on the lead arm", fr: "Reste équilibré sur le bras avant" }, { en: "Steady kick throughout", fr: "Battement régulier tout du long" }],
        },
        {
            category: "breathing", level: "beginner",
            name: { en: "Bilateral Breathing Set", fr: "Respiration Bilatérale" },
            prescription: { en: "6 × 50m", fr: "6 × 50m" },
            description: { en: "Breathe every three strokes so you alternate sides. Builds a symmetrical stroke and comfort breathing to your weaker side.", fr: "Respire tous les trois mouvements pour alterner les côtés. Développe une nage symétrique et l'aisance à respirer du côté faible." },
            cues: [{ en: "Exhale fully underwater", fr: "Expire complètement sous l'eau" }, { en: "One goggle in, one out", fr: "Une lunette dans l'eau, une dehors" }],
        },
        {
            category: "breathing", level: "advanced",
            name: { en: "Hypoxic 5-7-9", fr: "Hypoxie 5-7-9" },
            prescription: { en: "3 × 100m", fr: "3 × 100m" },
            description: { en: "Breathe every 5 strokes on the first lap, every 7 on the next, every 9 on the last. Trains breath control and CO₂ tolerance. Stop if light-headed.", fr: "Respire tous les 5 mouvements à la première longueur, tous les 7 à la suivante, tous les 9 à la dernière. Entraîne le contrôle du souffle et la tolérance au CO₂. Arrête si tu as la tête qui tourne." },
            cues: [{ en: "Long, steady exhale", fr: "Expiration longue et régulière" }, { en: "Stop if dizzy", fr: "Arrête si vertige" }],
        },
        {
            category: "turns", level: "intermediate",
            name: { en: "Flip-Turn Approach", fr: "Approche du Virage Culbute" },
            prescription: { en: "6 × 25m", fr: "6 × 25m" },
            description: { en: "Swim into the wall at full speed and execute a tight flip turn, pushing off in a streamline. Don't glide in — carry your speed into the turn.", fr: "Nage vers le mur à pleine vitesse et exécute une culbute serrée, en poussant en position hydrodynamique. Ne glisse pas — emmène ta vitesse dans le virage." },
            cues: [{ en: "Carry speed into the wall", fr: "Emmène la vitesse au mur" }, { en: "Tight tuck, fast rotation", fr: "Groupé serré, rotation rapide" }],
        },
        {
            category: "turns", level: "advanced",
            name: { en: "Underwater Dolphin Off Wall", fr: "Ondulation sous l'Eau" },
            prescription: { en: "6 × 15m", fr: "6 × 15m" },
            description: { en: "Push off underwater and dolphin-kick in a tight streamline as far as you can before your first stroke. The fastest part of any pool is the wall.", fr: "Pousse sous l'eau et ondule en position hydrodynamique serrée le plus loin possible avant le premier mouvement. La partie la plus rapide du bassin, c'est le mur." },
            cues: [{ en: "Streamline tight, hands stacked", fr: "Gainage serré, mains superposées" }, { en: "Kick from the core", fr: "Ondule depuis le gainage" }],
        },
        {
            category: "kick", level: "beginner",
            name: { en: "Kickboard Sprints", fr: "Sprints avec Planche" },
            prescription: { en: "8 × 25m", fr: "8 × 25m" },
            description: { en: "Hold a kickboard out front and sprint using legs only. Keep the kick compact and continuous from the hips, not the knees.", fr: "Tiens une planche devant toi et sprinte avec les jambes seules. Garde un battement compact et continu depuis les hanches, pas les genoux." },
            cues: [{ en: "Kick from the hips", fr: "Bats des hanches" }, { en: "Pointed toes, small splash", fr: "Pointes tendues, petites éclaboussures" }],
        },
        {
            category: "kick", level: "intermediate",
            name: { en: "Vertical Kicking", fr: "Battement Vertical" },
            prescription: { en: "4 × 30s", fr: "4 × 30s" },
            description: { en: "In deep water, kick vertically with arms crossed to stay afloat. Brutal for leg endurance and teaches a fast, constant tempo.", fr: "En eau profonde, bats verticalement bras croisés pour rester à flot. Redoutable pour l'endurance des jambes et apprend un tempo rapide et constant." },
            cues: [{ en: "Fast, constant tempo", fr: "Tempo rapide et constant" }, { en: "Stay tall in the water", fr: "Reste grand dans l'eau" }],
        },
        {
            category: "endurance", level: "intermediate",
            name: { en: "Negative-Split 200s", fr: "200m en Negative Split" },
            prescription: { en: "4 × 200m", fr: "4 × 200m" },
            description: { en: "Swim each 200 so the second half is faster than the first. Teaches pacing discipline and a strong finish under fatigue.", fr: "Nage chaque 200 de sorte que la seconde moitié soit plus rapide que la première. Apprend la gestion de l'allure et un finish solide sous fatigue." },
            cues: [{ en: "Hold back early, build late", fr: "Retiens-toi tôt, accélère tard" }, { en: "Strongest in the last 50", fr: "Le plus fort sur les 50 derniers" }],
        },
        {
            category: "endurance", level: "advanced",
            name: { en: "Threshold 100s", fr: "100m au Seuil" },
            prescription: { en: "8 × 100m, 15s rest", fr: "8 × 100m, 15s repos" },
            description: { en: "Swim 100s at a hard but sustainable pace with short rest. Builds the aerobic engine that holds race speed across a full distance.", fr: "Nage des 100 à une allure dure mais soutenable avec peu de repos. Développe le moteur aérobie qui maintient la vitesse de course sur toute la distance." },
            cues: [{ en: "Same time every rep", fr: "Même temps à chaque répétition" }, { en: "Controlled, not all-out", fr: "Contrôlé, pas à fond" }],
        },
    ],
    recap: [
        { label: { en: "Sessions", fr: "Séances" }, kind: "sessions" },
        { label: { en: "Races", fr: "Courses" }, kind: "count" },
        { label: { en: "Total Distance", fr: "Distance Totale" }, kind: { sum: "distance" }, suffix: "m" },
        { label: { en: "Total Laps", fr: "Total Longueurs" }, kind: { sum: "laps" } },
    ],
    charts: {
        last5: { key: "seconds", label: { en: "Time in sec (last 5 races)", fr: "Temps en sec (5 dernières courses)" } },
        monthly: { key: "distance", label: { en: "Distance per Month (m)", fr: "Distance par Mois (m)" } },
    },
    aiInsight: {
        en: "Your endurance is improving, but your splits slow in the final third of each race. Build back-half speed — add 'Negative Split' sets and tighten your turns to carry more momentum off the wall.",
        fr: "Ton endurance progresse, mais tes temps de passage ralentissent dans le dernier tiers de chaque course. Développe la vitesse en seconde moitié — ajoute des séries « Negative Split » et soigne tes virages pour garder plus d'élan au mur.",
    },
    entryNoun: { en: "Race", fr: "Course" },
    logTitle: { en: "Race Logbook", fr: "Journal de Courses" },
    logDesc: { en: "Log your races and time trials to track your times and volume.", fr: "Enregistrez vos courses et tests chronométrés pour suivre vos temps et votre volume." },
    logAddLabel: { en: "Log New Race", fr: "Ajouter une Course" },
    emptyLog: { en: "No races logged yet.", fr: "Aucune course enregistrée pour le moment." },
};

export const SPORT_CONFIGS = {
    basketball: basketballConfig,
    boxing: boxingConfig,
    swimming: swimmingConfig,
} as const;
