import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type OfferSeed = { text: string; category: string };

const OFFERS: OfferSeed[] = [
  // ── Richesse & succès ────────────────────────────────────────
  { text: "Tu gagnes 100 millions d'euros", category: "Richesse & succès" },
  { text: "Tu obtiens le job de tes rêves sans effort", category: "Richesse & succès" },
  { text: "Tu gagnes toutes les loteries auxquelles tu participes", category: "Richesse & succès" },
  { text: "Tu vis dans le logement de tes rêves sans payer de loyer", category: "Richesse & succès" },
  { text: "Tu as un assistant IA personnel qui résout tous tes problèmes", category: "Richesse & succès" },
  { text: "Tu connais à l'avance les résultats sportifs de la semaine suivante", category: "Richesse & succès" },
  { text: "Tu reçois 10 000 € par mois sans rien faire", category: "Richesse & succès" },
  { text: "Tu peux dupliquer de la nourriture à l'infini", category: "Richesse & succès" },
  { text: "Tu as une intuition parfaite pour les investissements", category: "Richesse & succès" },
  { text: "Tu peux agrandir n'importe quelle pièce de ta maison à volonté", category: "Richesse & succès" },
  // ── Super-pouvoirs ────────────────────────────────────────────
  { text: "Tu deviens invisible quand tu le souhaites", category: "Super-pouvoirs" },
  { text: "Tu peux téléporter une fois par jour où tu veux", category: "Super-pouvoirs" },
  { text: "Tu peux voler comme un oiseau quand tu le veux", category: "Super-pouvoirs" },
  { text: "Tu peux contrôler la météo dans un rayon de 10 km", category: "Super-pouvoirs" },
  { text: "Tu peux changer d'apparence physique à volonté", category: "Super-pouvoirs" },
  { text: "Tu peux arrêter le temps pendant 30 secondes par jour", category: "Super-pouvoirs" },
  { text: "Tu peux respirer sous l'eau indéfiniment", category: "Super-pouvoirs" },
  { text: "Tu as la force physique de 10 hommes", category: "Super-pouvoirs" },
  { text: "Tu peux te rendre dans n'importe quelle époque passée pour 24 h", category: "Super-pouvoirs" },
  { text: "Tu peux cloner n'importe quel objet une fois par jour", category: "Super-pouvoirs" },
  { text: "Tu peux réduire ta taille à celle d'une souris à volonté", category: "Super-pouvoirs" },
  { text: "Tu peux nager aussi vite qu'un dauphin", category: "Super-pouvoirs" },
  { text: "Tu peux voir dans l'obscurité totale", category: "Super-pouvoirs" },
  { text: "Tu peux léviter à 1 mètre du sol quand tu le souhaites", category: "Super-pouvoirs" },
  { text: "Tu peux te téléporter dans ton lit depuis n'importe où", category: "Super-pouvoirs" },
  { text: "Tu peux générer de l'électricité avec tes mains", category: "Super-pouvoirs" },
  { text: "Tu peux courir à 60 km/h", category: "Super-pouvoirs" },
  { text: "Tu peux faire dormir n'importe qui d'un simple regard", category: "Super-pouvoirs" },
  { text: "Tu peux vivre sous l'eau pendant une heure", category: "Super-pouvoirs" },
  { text: "Tu peux réparer n'importe quel objet cassé en le touchant", category: "Super-pouvoirs" },
  { text: "Tu peux accélérer ou ralentir ta perception du temps", category: "Super-pouvoirs" },
  { text: "Tu peux détecter la présence de quelqu'un dans une pièce sans le voir", category: "Super-pouvoirs" },
  { text: "Tu peux faire revivre une plante morte", category: "Super-pouvoirs" },
  { text: "Tu peux allumer ou éteindre n'importe quelle lumière par la pensée", category: "Super-pouvoirs" },
  { text: "Tu peux faire pousser des plantes en quelques secondes", category: "Super-pouvoirs" },
  { text: "Tu peux changer la couleur de n'importe quel objet par simple toucher", category: "Super-pouvoirs" },
  // ── Esprit & perception ───────────────────────────────────────
  { text: "Tu peux lire dans les pensées des autres", category: "Esprit & perception" },
  { text: "Tu as une mémoire photographique permanente", category: "Esprit & perception" },
  { text: "Tu peux annuler trois décisions passées de ta vie", category: "Esprit & perception" },
  { text: "Tu peux parler aux animaux", category: "Esprit & perception" },
  { text: "Tu peux revivre une journée une seule fois si tu la rates", category: "Esprit & perception" },
  { text: "Tu peux communiquer avec les morts une fois par an", category: "Esprit & perception" },
  { text: "Tu peux retranscrire parfaitement tout ce que tu vois ou entends", category: "Esprit & perception" },
  { text: "Tu peux mémoriser un livre en le touchant", category: "Esprit & perception" },
  { text: "Tu peux contrôler tes rêves chaque nuit", category: "Esprit & perception" },
  { text: "Tu peux te connecter à internet mentalement", category: "Esprit & perception" },
  { text: "Tu peux percevoir les mensonges des autres instantanément", category: "Esprit & perception" },
  { text: "Tu peux déchiffrer n'importe quel code ou cryptage", category: "Esprit & perception" },
  { text: "Tu peux communiquer par télépathie avec une seule personne de ton choix", category: "Esprit & perception" },
  { text: "Tu peux prédire la météo avec une précision absolue", category: "Esprit & perception" },
  { text: "Tu peux voir les auras des gens autour de toi", category: "Esprit & perception" },
  { text: "Tu peux absorber les compétences de quelqu'un en lui serrant la main", category: "Esprit & perception" },
  { text: "Tu peux sentir les émotions des animaux", category: "Esprit & perception" },
  { text: "Tu peux te souvenir de chaque rêve que tu fais", category: "Esprit & perception" },
  // ── Santé & bien-être ─────────────────────────────────────────
  { text: "Tu as une santé parfaite jusqu'à 120 ans", category: "Santé & bien-être" },
  { text: "Tu ne vieillis plus à partir d'aujourd'hui", category: "Santé & bien-être" },
  { text: "Tu es invincible aux maladies", category: "Santé & bien-être" },
  { text: "Tu n'as plus jamais besoin de dormir", category: "Santé & bien-être" },
  { text: "Tu ne ressens jamais la douleur physique", category: "Santé & bien-être" },
  { text: "Tu n'as jamais froid ni jamais chaud", category: "Santé & bien-être" },
  { text: "Tu peux guérir n'importe qui d'une maladie par simple contact", category: "Santé & bien-être" },
  { text: "Tu peux manger tout ce que tu veux sans grossir", category: "Santé & bien-être" },
  { text: "Tu ne t'ennuies jamais, quoi qu'il arrive", category: "Santé & bien-être" },
  { text: "Tu es immunisé contre tout poison ou drogue", category: "Santé & bien-être" },
  { text: "Tu n'as jamais peur de rien", category: "Santé & bien-être" },
  { text: "Tu as une énergie inépuisable toute la journée", category: "Santé & bien-être" },
  { text: "Tu n'as jamais de gueule de bois", category: "Santé & bien-être" },
  { text: "Tu es incapable de procrastiner", category: "Santé & bien-être" },
  { text: "Tu n'as jamais de mal de tête ni de migraine", category: "Santé & bien-être" },
  { text: "Tu n'as jamais froid même par -30°C", category: "Santé & bien-être" },
  // ── Social & influence ────────────────────────────────────────
  { text: "Tu es célèbre et adulé mondialement", category: "Social & influence" },
  { text: "Tu es reconnu comme le meilleur dans ton domaine", category: "Social & influence" },
  { text: "Tu gagnes chaque débat ou négociation que tu mènes", category: "Social & influence" },
  { text: "Tu as une confiance absolue en toi dans toutes les situations", category: "Social & influence" },
  { text: "Tu as un réseau social parfait : tout le monde veut te rencontrer", category: "Social & influence" },
  { text: "Tu peux rendre n'importe quelle conversation intéressante", category: "Social & influence" },
  { text: "Tu as la capacité d'être au bon endroit au bon moment", category: "Social & influence" },
  { text: "Tu peux influencer l'humeur des gens autour de toi", category: "Social & influence" },
  { text: "Tu as un animal de compagnie qui comprend tout ce que tu dis", category: "Social & influence" },
  { text: "Tu es le meilleur orateur que les gens aient jamais entendu", category: "Social & influence" },
  { text: "Tu es insensible aux critiques sans être indifférent", category: "Social & influence" },
  { text: "Tu as une voix qui apaise instantanément les tensions", category: "Social & influence" },
  { text: "Tu peux parler à n'importe quel chef d'État quand tu le veux", category: "Social & influence" },
  { text: "Tu as un instinct infaillible pour juger le caractère des gens", category: "Social & influence" },
  { text: "Tu peux rire de n'importe quelle situation sans te forcer", category: "Social & influence" },
  // ── Talent & savoir ───────────────────────────────────────────
  { text: "Tu maîtrises instantanément n'importe quelle langue", category: "Talent & savoir" },
  { text: "Tu obtiens un diplôme prestige de n'importe quelle université", category: "Talent & savoir" },
  { text: "Tu peux voyager gratuitement partout dans le monde à vie", category: "Talent & savoir" },
  { text: "Tu as accès à tous les livres, films et musiques du monde gratuitement", category: "Talent & savoir" },
  { text: "Tu as le talent d'un musicien de génie", category: "Talent & savoir" },
  { text: "Tu as accès à toutes les formations en ligne gratuitement à vie", category: "Talent & savoir" },
  { text: "Tu peux inventer une nouvelle langue que tout le monde comprend intuitivement", category: "Talent & savoir" },
  { text: "Tu as le sens du style d'un grand designer", category: "Talent & savoir" },
  { text: "Tu peux apprendre à conduire / piloter n'importe quel véhicule en 10 minutes", category: "Talent & savoir" },
  { text: "Tu as le talent d'un chef étoilé", category: "Talent & savoir" },
  { text: "Tu as accès à une bibliothèque secrète de connaissances interdites", category: "Talent & savoir" },
  { text: "Tu peux faire apparaître n'importe quel livre que tu veux", category: "Talent & savoir" },
  // ── Vie quotidienne ───────────────────────────────────────────
  { text: "Tu sais toujours exactement où sont tes affaires", category: "Vie quotidienne" },
  { text: "Tu ne te perds jamais, tu as un sens de l'orientation parfait", category: "Vie quotidienne" },
  { text: "Tu as un double qui fait les tâches ennuyeuses à ta place 2 h par jour", category: "Vie quotidienne" },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "(non définie)";
  const masked = dbUrl.replace(/:([^:@]+)@/, ":***@");
  console.log(`DATABASE_URL utilisée : ${masked}`);
  console.log(`Suppression des offres existantes…`);
  const { count: deleted } = await prisma.offer.deleteMany();
  console.log(`→ ${deleted} offre(s) supprimée(s)`);
  console.log(`Insertion de ${OFFERS.length} offres…`);
  for (let i = 0; i < OFFERS.length; i++) {
    await prisma.offer.create({
      data: { order: i + 1, text: OFFERS[i]!.text, category: OFFERS[i]!.category },
    });
  }
  console.log(`✓ Seed terminé : ${OFFERS.length} offres insérées.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
