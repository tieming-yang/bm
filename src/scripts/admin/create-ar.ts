import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";
import { type ARWrite, ARWriteScheme } from "../../app/(works)/ar/data.ts";

dotenv.config({ path: ".env.local" });

const title = "collection-00";
const input = {
  collectionPath: "ar",
  data: {
    title,
    description: "First 23 characters, no grouping yet, just for testing and demo purpose.",
    targetsPath: `/targets/${title}/v0/targets.mind`,
    version: "0",
    items: [
      {
        modelId: "L9aSQBdZzrscKzkSfZad",
        title: "Aaron",
        modelPath: "/characters/aaron/v0/aaron-lowpoly.glb",
      },
      {
        modelId: "sXam8DvAiIUIrchsXNUO",
        title: "Abel",
        modelPath: "/characters/abel/v0/abel-lowpoly.glb",
      },
      {
        modelId: "Gj2IupfWjSFnySVL0Ygu",
        title: "Abraham",
        modelPath: "/characters/abraham/v0/abraham-lowpoly.glb",
      },
      {
        modelId: "THFVqiaQrF2tiPPEfFF0",
        title: "Adam",
        modelPath: "/characters/adam/v0/adam-lowpoly.glb",
      },
      {
        modelId: "SiII9PXajmWLYuV1AmiJ",
        title: "Cain",
        modelPath: "/characters/cain/v0/cain-lowpoly.glb",
      },
      {
        modelId: "5Ln4bhkj6LwhtoFjjgOx",
        title: "David",
        modelPath: "/characters/david/v0/david-lowpoly.glb",
      },
      {
        modelId: "0utxRJDBB39ccjgxAfzE",
        title: "Deborah",
        modelPath: "/characters/deborah/v0/deborah-lowpoly.glb",
      },
      {
        modelId: "JNpufFxqOjLu10kzAJJy",
        title: "Esau",
        modelPath: "/characters/esau/v0/esau-lowpoly.glb",
      },
      {
        modelId: "2UicS2Q0WXkAID8HKUWA",
        title: "Eve",
        modelPath: "/characters/eve/v0/eve-lowpoly.glb",
      },
      {
        modelId: "uaDcfzfIBBMdRZEV57PG",
        title: "Gideon",
        modelPath: "/characters/gideon/v0/gideon-lowpoly.glb",
      },
      {
        modelId: "vS2JxRdtUf7ejYSoucft",
        title: "Jacob",
        modelPath: "/characters/jacob/v0/jacob-lowpoly.glb",
      },
      {
        modelId: "ah5LbBua0C8tF4h6RIBZ",
        title: "Joseph",
        modelPath: "/characters/joseph/v0/joseph-lowpoly.glb",
      },
      {
        modelId: "V811kpJMRvnPVykwBCrV",
        title: "Joshua",
        modelPath: "/characters/joshua/v0/joshua-lowpoly.glb",
      },
      {
        modelId: "laUuop2Lj0xkbazUdmY5",
        title: "King-favid",
        modelPath: "/characters/king-favid/v0/king-favid-lowpoly.glb",
      },
      {
        modelId: "zcTZmQG5rV1edM0ApeFa",
        title: "King-saul",
        modelPath: "/characters/king-saul/v0/king-saul-lowpoly.glb",
      },
      {
        modelId: "PHlZuzcNWI4hYUuhckog",
        title: "Miriam",
        modelPath: "/characters/miriam/v0/miriam-lowpoly.glb",
      },
      {
        modelId: "0Khh2h52K97QIk3mMEvf",
        title: "Moses",
        modelPath: "/characters/moses/v0/moses-lowpoly.glb",
      },
      {
        modelId: "D7zPBO90PHz7taMZb07W",
        title: "Noah",
        modelPath: "/characters/noah/v0/noah-lowpoly.glb",
      },
      {
        modelId: "321cPSQq8OcMKxa7UY64",
        title: "Pharaoh",
        modelPath: "/characters/pharaoh/v0/pharaoh-lowpoly.glb",
      },
      {
        modelId: "ZGADkoNR7adHcY8zqQEW",
        title: "Rebekah",
        modelPath: "/characters/rebekah/v0/rebekah-lowpoly.glb",
      },
      {
        modelId: "mDtUYHf4udaWdwKEIFD0",
        title: "Samson",
        modelPath: "/characters/samson/v0/samson-lowpoly.glb",
      },
      {
        modelId: "5Qbb7RUxHA1e1eWCWOZV",
        title: "Samuel",
        modelPath: "/characters/samuel/v0/samuel-lowpoly.glb",
      },
      {
        modelId: "SbNSRYI9xhPmYJ1wytjM",
        title: "Sarah",
        modelPath: "/characters/sarah/v0/sarah-lowpoly.glb",
      },
    ],
  } satisfies ARWrite,
};

async function main() {
  const { default: firebaseAdmin } = await import("../../lib/firebase/firebase-admin.ts");

  const document = {
    ...ARWriteScheme.parse(input.data),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await firebaseAdmin.db.collection(input.collectionPath).doc().set(document, { merge: true });

  console.log(`Uploaded AR document: ${input.collectionPath}, ${title}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
