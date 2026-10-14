// Tabla curada: nombre de ejercicio (es/en) -> nombre EXACTO en exercises.json.
// Se evalua en orden (lo especifico primero). Si nada casa, se usa la busqueda aproximada.
// Todos los destinos existen en el dataset (verificado al crear la tabla).

const ALIASES = [
  // ── Pecho
  [/(press|banca) inclinad\w* con mancuerna|press inclinado con mancuerna|press inclinado mancuerna|incline dumbbell (bench )?press|dumbbell incline (bench )?press/, 'dumbbell incline bench press'],
  [/press (de )?banca inclinad|press inclinado con barra|incline (barbell )?bench press|barbell incline/, 'barbell incline bench press'],
  [/press inclinado/, 'barbell incline bench press'],
  [/press declinado|decline (bench )?press/, 'barbell decline bench press'],
  [/press (de )?banca con mancuerna|press con mancuernas en banco|dumbbell bench press|press de pecho con mancuerna/, 'dumbbell bench press'],
  [/press (de )?banca cerrad|close.grip bench/, 'barbell close-grip bench press'],
  [/press (de )?banca|bench press/, 'barbell bench press'],
  [/press (de pecho )?en maquina|chest press|press de pecho/, 'lever chest press'],
  [/aperturas? inclinad|incline fly/, 'dumbbell incline fly'],
  [/cruce de poleas|aperturas? (en|con) polea|crossover|cable fly|cable standing fly/, 'cable standing fly'],
  [/contractor|pec ?deck|aperturas? en maquina|machine fly/, 'lever seated fly'],
  [/aperturas?|dumbbell fly|chest fly/, 'dumbbell fly'],
  [/flexiones? diamante|diamond push/, 'diamond push-up'],
  [/flexiones?|push.?ups?|lagartijas?/, 'push-up'],
  [/fondos? (en|de) banco|bench dips?/, 'bench dip (knees bent)'],
  [/fondos? (de|para) triceps|triceps? dips?/, 'triceps dip'],
  [/fondos?|dips?\b/, 'chest dip'],
  // ── Hombros
  [/press arnold|arnold press/, 'dumbbell arnold press'],
  [/press (militar|de hombros?) con mancuerna|press de hombros? sentado|dumbbell (shoulder|overhead) press|seated dumbbell press/, 'dumbbell seated shoulder press'],
  [/press (de hombros?|militar) (en )?maquina|machine shoulder press/, 'lever shoulder press'],
  [/press militar|press de hombros?|military press|overhead press|shoulder press/, 'barbell seated overhead press'],
  [/elevaciones? laterales? (en|con) polea|cable lateral raise/, 'cable lateral raise'],
  [/elevaciones? laterales?|lateral raises?/, 'dumbbell lateral raise'],
  [/elevaciones? frontales?|front raises?/, 'dumbbell front raise'],
  [/face.?pulls?|tiron a la cara/, 'cable standing rear delt row (with rope)'],
  [/pajaros?|reverse fly|rear delt (fly|raise)|vuelos? posteriores?/, 'dumbbell reverse fly'],
  [/remo al menton|upright row/, 'dumbbell upright row'],
  [/encogimientos?|shrugs?/, 'dumbbell shrug'],
  // ── Espalda
  [/dominadas? (supinas|con agarre supino)|chin.?ups?/, 'chin-up'],
  [/dominadas?|pull.?ups?/, 'pull-up'],
  [/jalon (al pecho|frontal|en polea)?|lat pulldown|pulldown/, 'cable bar lateral pulldown'],
  [/remo (sentado|en polea|con polea|en cable|con cable|en maquina)|remo.*sentado|seated (cable )?row|cable row/, 'cable seated row'],
  [/remo con mancuerna|remo a una mano|one.arm (dumbbell )?row|dumbbell row/, 'dumbbell one arm bent-over row'],
  [/remo en t|t.?bar row/, 'lever t bar row'],
  [/remo con barra|remo inclinado|bent.over row|barbell row/, 'barbell bent over row'],
  [/remo/, 'barbell bent over row'],
  [/pull.?over/, 'dumbbell pullover'],
  [/pulldown con brazos rectos|straight.arm pulldown/, 'cable straight arm pulldown'],
  [/hiperextensiones?|hyperextensions?|extension lumbar/, 'hyperextension'],
  [/buenos dias|good mornings?/, 'barbell good morning'],
  // ── Piernas
  [/peso muerto (rumano )?con mancuerna|dumbbell (romanian )?deadlift/, 'dumbbell romanian deadlift'],
  [/peso muerto rumano|romanian deadlift|rdl\b/, 'barbell romanian deadlift'],
  [/peso muerto sumo|sumo deadlift/, 'barbell sumo deadlift'],
  [/peso muerto|deadlift/, 'barbell deadlift'],
  [/sentadilla goblet|goblet squat/, 'dumbbell goblet squat'],
  [/sentadilla bulgara|bulgarian split squat|split squat/, 'dumbbell single leg split squat'],
  [/sentadilla hack|hack squat/, 'sled hack squat'],
  [/sentadilla frontal|front squat/, 'barbell front squat'],
  [/sentadilla isometrica|wall sit|sentadilla en pared/, 'march sit (wall)'],
  [/sentadilla con salto|jump squat/, 'jump squat'],
  [/sentadilla|squat/, 'barbell full squat'],
  [/prensa( de piernas)?|leg press/, 'sled 45в° leg press'],
  [/extension(es)? de (cuadriceps|piernas?)|leg extensions?/, 'lever leg extension'],
  [/curl femoral sentado|seated leg curl/, 'lever seated leg curl'],
  [/curl femoral|curl de isquio|leg curl|hamstring curl/, 'lever lying leg curl'],
  [/zancadas? (caminando|andando)|walking lunges?/, 'walking lunge'],
  [/zancadas?|estocadas?|lunges?/, 'dumbbell lunge'],
  [/subidas? al (banco|cajon)|step.?ups?/, 'dumbbell step-up'],
  [/hip thrust|empuje de cadera/, 'barbell glute bridge'],
  [/puente de gluteos?|glute bridge/, 'low glute bridge on floor'],
  [/patada de gluteos?|glute kickback/, 'cable kickback'],
  [/abduccion|abductor|hip abduction/, 'lever seated hip abduction'],
  [/gemelos? sentado|seated calf/, 'lever seated calf raise'],
  [/gemelos?|pantorrillas?|calf raises?/, 'dumbbell standing calf raise'],
  // ── Brazos
  [/curl (de biceps )?martillo|hammer curl/, 'dumbbell hammer curl'],
  [/curl concentrado|concentration curl/, 'dumbbell concentration curl'],
  [/curl (en )?predicador|curl scott|preacher curl/, 'barbell preacher curl'],
  [/curl (de biceps )?(en|con) polea|cable curl/, 'cable curl'],
  [/curl (de biceps )?con barra|barbell curl/, 'barbell curl'],
  [/curl (de biceps)?|biceps? curl/, 'dumbbell biceps curl'],
  [/press frances|rompecraneos|skull ?crusher/, 'barbell lying triceps extension skull crusher'],
  [/extension(es)? de triceps (con cuerda|en polea alta con cuerda)|rope pushdown/, 'cable pushdown (with rope attachment)'],
  [/extension(es)? de triceps (por encima|sobre la cabeza)|overhead triceps? extension/, 'dumbbell seated triceps extension'],
  [/patada de triceps|triceps? kickback/, 'dumbbell kickback'],
  [/extension(es)? de triceps|triceps? (pushdown|extension)|pushdown/, 'cable pushdown'],
  // ── Core
  [/plancha lateral|side plank/, 'bodyweight incline side plank'],
  [/plancha|plank/, 'weighted front plank'],
  [/rueda abdominal|ab wheel|rollout/, 'wheel rollerout'],
  [/elevacion(es)? de piernas colgad|hanging leg raise/, 'hanging leg raise'],
  [/elevacion(es)? de piernas|leg raises?/, 'seated leg raise'],
  [/giros? rusos?|russian twist/, 'russian twist'],
  [/crunch (en|con) polea|cable crunch/, 'cable kneeling crunch'],
  [/abdominales? (completos?|sit.?up)|sit.?ups?/, '3/4 sit-up'],
  [/crunch|abdominales?/, 'crunch floor'],
  [/escaladores?|mountain climbers?/, 'mountain climber'],
  [/bicho muerto|dead ?bug/, 'dead bug'],
  // ── Cardio / funcional
  [/burpees?/, 'burpee'],
  [/swing (con|de) kettlebell|kettlebell swing/, 'kettlebell swing'],
  [/saltos? de tijera|jumping jacks?/, 'jack jump (male)'],
  [/comba|saltar la cuerda|jump rope/, 'jump rope'],
  [/cinta|caminar inclinado|treadmill|incline walk/, 'walking on incline treadmill'],
  [/bici(cleta)? (estatica|de aire)|air bike|assault bike/, 'air bike'],
  [/bici(cleta)?|cycling|bike/, 'stationary bike run v. 3'],
  [/eliptica|elliptical/, 'walk elliptical cross trainer'],
  [/correr|carrera|trote|running|jog/, 'run'],
];

function normalize(s = '') {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Devuelve el nombre exacto del dataset para un ejercicio, o null si no hay alias. */
export function resolveAlias(name, nameEn) {
  const candidates = [normalize(name), normalize(nameEn)].filter(Boolean);
  for (const text of candidates) {
    for (const [re, target] of ALIASES) {
      if (re.test(text)) return target;
    }
  }
  return null;
}

export { ALIASES };
