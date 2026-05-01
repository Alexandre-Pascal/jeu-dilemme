import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OFFERS: string[] = [
  // --- Lot 1 (offres originales) ---
  "Tu gagnes 100 millions d'euros",
  "Tu deviens invisible quand tu le souhaites",
  "Tu as une santé parfaite jusqu'à 120 ans",
  "Tu peux voyager gratuitement partout dans le monde à vie",
  "Tu maîtrises instantanément n'importe quelle langue",
  "Tu es célèbre et adulé mondialement",
  "Tu obtiens le job de tes rêves sans effort",
  "Tu peux lire dans les pensées des autres",
  "Tu ne vieillis plus à partir d'aujourd'hui",
  "Tu gagnes toutes les loteries auxquelles tu participes",
  "Tu as une mémoire photographique permanente",
  "Tu peux annuler trois décisions passées de ta vie",
  "Tu vis dans le logement de tes rêves sans payer de loyer",
  "Tu peux parler aux animaux",
  "Tu es invincible aux maladies",
  "Tu obtiens un diplôme prestige de n'importe quelle université",
  "Tu as un assistant IA personnel qui résout tous tes problèmes",
  "Tu peux revivre une journée une seule fois si tu la rates",
  "Tu es reconnu comme le meilleur dans ton domaine",
  "Tu peux téléporter une fois par jour où tu veux",
  // --- Lot 2 ---
  "Tu peux voler comme un oiseau quand tu le veux",
  "Tu n'as plus jamais besoin de dormir",
  "Tu peux contrôler la météo dans un rayon de 10 km",
  "Tu as accès à tous les livres, films et musiques du monde gratuitement",
  "Tu peux changer d'apparence physique à volonté",
  "Tu ne ressens jamais la douleur physique",
  "Tu peux arrêter le temps pendant 30 secondes par jour",
  "Tu peux communiquer avec les morts une fois par an",
  "Tu gagnes chaque débat ou négociation que tu mènes",
  "Tu peux manger tout ce que tu veux sans grossir",
  "Tu as le talent d'un musicien de génie",
  "Tu peux respirer sous l'eau indéfiniment",
  "Tu as la force physique de 10 hommes",
  "Tu peux te rendre dans n'importe quelle époque passée pour 24 h",
  "Tu n'as jamais froid ni jamais chaud",
  "Tu peux guérir n'importe qui d'une maladie par simple contact",
  "Tu connais à l'avance les résultats sportifs de la semaine suivante",
  "Tu peux cloner n'importe quel objet une fois par jour",
  "Tu as une confiance absolue en toi dans toutes les situations",
  "Tu peux retranscrire parfaitement tout ce que tu vois ou entends",
  // --- Lot 3 ---
  "Tu peux réduire ta taille à celle d'une souris à volonté",
  "Tu as accès à toutes les formations en ligne gratuitement à vie",
  "Tu ne t'ennuies jamais, quoi qu'il arrive",
  "Tu peux inventer une nouvelle langue que tout le monde comprend intuitivement",
  "Tu peux nager aussi vite qu'un dauphin",
  "Tu reçois 10 000 € par mois sans rien faire",
  "Tu peux mémoriser un livre en le touchant",
  "Tu n'as jamais peur de rien",
  "Tu peux contrôler tes rêves chaque nuit",
  "Tu es immunisé contre tout poison ou drogue",
  "Tu peux voir dans l'obscurité totale",
  "Tu as le sens du style d'un grand designer",
  "Tu peux faire pousser des plantes en quelques secondes",
  "Tu as un réseau social parfait : tout le monde veut te rencontrer",
  "Tu peux léviter à 1 mètre du sol quand tu le souhaites",
  "Tu peux rendre n'importe quelle conversation intéressante",
  "Tu as une énergie inépuisable toute la journée",
  "Tu peux apprendre à conduire / piloter n'importe quel véhicule en 10 minutes",
  "Tu peux te téléporter dans ton lit depuis n'importe où",
  "Tu sais toujours exactement où sont tes affaires",
  // --- Lot 4 ---
  "Tu peux générer de l'électricité avec tes mains",
  "Tu as la capacité d'être au bon endroit au bon moment",
  "Tu peux influencer l'humeur des gens autour de toi",
  "Tu as un animal de compagnie qui comprend tout ce que tu dis",
  "Tu ne te perds jamais, tu as un sens de l'orientation parfait",
  "Tu peux dupliquer de la nourriture à l'infini",
  "Tu as le talent d'un chef étoilé",
  "Tu peux courir à 60 km/h",
  "Tu peux déchiffrer n'importe quel code ou cryptage",
  "Tu n'as jamais de gueule de bois",
  "Tu peux agrandir n'importe quelle pièce de ta maison à volonté",
  "Tu peux te connecter à internet mentalement",
  "Tu es le meilleur orateur que les gens aient jamais entendu",
  "Tu peux percevoir les mensonges des autres instantanément",
  "Tu peux faire dormir n'importe qui d'un simple regard",
  "Tu es insensible aux critiques sans être indifférent",
  "Tu peux vivre sous l'eau pendant une heure",
  "Tu as accès à une bibliothèque secrète de connaissances interdites",
  "Tu peux réparer n'importe quel objet cassé en le touchant",
  "Tu as une intuition parfaite pour les investissements",
  // --- Lot 5 ---
  "Tu peux communiquer par télépathie avec une seule personne de ton choix",
  "Tu peux prédire la météo avec une précision absolue",
  "Tu es incapable de procrastiner",
  "Tu peux voir les auras des gens autour de toi",
  "Tu as une voix qui apaise instantanément les tensions",
  "Tu peux parler à n'importe quel chef d'État quand tu le veux",
  "Tu peux accélérer ou ralentir ta perception du temps",
  "Tu n'as jamais de mal de tête ni de migraine",
  "Tu peux détecter la présence de quelqu'un dans une pièce sans le voir",
  "Tu peux absorber les compétences de quelqu'un en lui serrant la main",
  "Tu peux faire revivre une plante morte",
  "Tu as un instinct infaillible pour juger le caractère des gens",
  "Tu peux allumer ou éteindre n'importe quelle lumière par la pensée",
  "Tu peux rire de n'importe quelle situation sans te forcer",
  "Tu as un double qui fait les tâches ennuyeuses à ta place 2 h par jour",
  "Tu peux sentir les émotions des animaux",
  "Tu n'as jamais froid même par -30°C",
  "Tu peux faire apparaître n'importe quel livre que tu veux",
  "Tu peux te souvenir de chaque rêve que tu fais",
  "Tu peux changer la couleur de n'importe quel objet par simple toucher",
];

async function main() {
  await prisma.offer.deleteMany();
  for (let i = 0; i < OFFERS.length; i++) {
    await prisma.offer.create({
      data: { order: i + 1, text: OFFERS[i] },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
