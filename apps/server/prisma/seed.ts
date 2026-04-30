import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OFFERS: string[] = [
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
