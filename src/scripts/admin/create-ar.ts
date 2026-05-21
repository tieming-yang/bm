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
        titleZh: "亞倫",
        modelPath: "/characters/aaron/v0/aaron-lowpoly.glb",
      },
      {
        modelId: "sXam8DvAiIUIrchsXNUO",
        title: "Abel",
        titleZh: "亞伯",
        modelPath: "/characters/abel/v0/abel-lowpoly.glb",
      },
      {
        modelId: "Gj2IupfWjSFnySVL0Ygu",
        title: "Abraham",
        titleZh: "亞伯拉罕",
        modelPath: "/characters/abraham/v0/abraham-lowpoly.glb",
        videoPath: "/characters/abraham/v0/abraham-rb.mov",
        audioPath: "/characters/abraham/v0/abraham.en.mp3",
        audioPathZh: "/characters/abraham/v0/abraham.zh.mp3",
      },
      {
        modelId: "THFVqiaQrF2tiPPEfFF0",
        title: "Adam",
        titleZh: "亞當",
        modelPath: "/characters/adam/v0/adam-lowpoly.glb",
        videoPath: "/characters/adam/v0/adam-rb.mov",
        audioPath: "/characters/adam/v0/audio.en.mp3",
        audioPathZh: "/characters/adam/v0/audio.zh.mp3",
      },
      {
        modelId: "SiII9PXajmWLYuV1AmiJ",
        title: "Cain",
        titleZh: "該隱",
        modelPath: "/characters/cain/v0/cain-lowpoly.glb",
      },
      {
        modelId: "5Ln4bhkj6LwhtoFjjgOx",
        title: "David",
        titleZh: "大衛",
        modelPath: "/characters/david/v0/david-lowpoly.glb",
      },
      {
        modelId: "0utxRJDBB39ccjgxAfzE",
        title: "Deborah",
        titleZh: "底波拉",
        modelPath: "/characters/deborah/v0/deborah-lowpoly.glb",
      },
      {
        modelId: "JNpufFxqOjLu10kzAJJy",
        title: "Esau",
        titleZh: "以掃",
        modelPath: "/characters/esau/v0/esau-lowpoly.glb",
      },
      {
        modelId: "2UicS2Q0WXkAID8HKUWA",
        title: "Eve",
        titleZh: "夏娃",
        modelPath: "/characters/eve/v0/eve-lowpoly.glb",
        videoPath: "/characters/eve/v0/eve-rb.mov",
        audioPath: "/characters/eve/v0/eve.en.mp3",
        audioPathZh: "/characters/eve/v0/eve.zh.mp3",
      },
      {
        modelId: "uaDcfzfIBBMdRZEV57PG",
        title: "Gideon",
        titleZh: "基甸",
        modelPath: "/characters/gideon/v0/gideon-lowpoly.glb",
      },
      {
        modelId: "vS2JxRdtUf7ejYSoucft",
        title: "Jacob",
        titleZh: "雅各",
        modelPath: "/characters/jacob/v0/jacob-lowpoly.glb",
      },
      {
        modelId: "ah5LbBua0C8tF4h6RIBZ",
        title: "Joseph",
        titleZh: "約瑟",
        modelPath: "/characters/joseph/v0/joseph-lowpoly.glb",
      },
      {
        modelId: "V811kpJMRvnPVykwBCrV",
        title: "Joshua",
        titleZh: "約書亞",
        modelPath: "/characters/joshua/v0/joshua-lowpoly.glb",
      },
      {
        modelId: "laUuop2Lj0xkbazUdmY5",
        title: "King David",
        titleZh: "大衛王",
        modelPath: "/characters/king-favid/v0/king-favid-lowpoly.glb",
      },
      {
        modelId: "zcTZmQG5rV1edM0ApeFa",
        title: "King Saul",
        titleZh: "掃羅王",
        modelPath: "/characters/king-saul/v0/king-saul-lowpoly.glb",
      },
      {
        modelId: "PHlZuzcNWI4hYUuhckog",
        title: "Miriam",
        titleZh: "米利暗",
        modelPath: "/characters/miriam/v0/miriam-lowpoly.glb",
      },
      {
        modelId: "0Khh2h52K97QIk3mMEvf",
        title: "Moses",
        titleZh: "摩西",
        modelPath: "/characters/moses/v0/moses-lowpoly.glb",
      },
      {
        modelId: "D7zPBO90PHz7taMZb07W",
        title: "Noah",
        titleZh: "挪亞",
        modelPath: "/characters/noah/v0/noah-lowpoly.glb",
      },
      {
        modelId: "321cPSQq8OcMKxa7UY64",
        title: "Pharaoh",
        titleZh: "法老",
        modelPath: "/characters/pharaoh/v0/pharaoh-lowpoly.glb",
      },
      {
        modelId: "ZGADkoNR7adHcY8zqQEW",
        title: "Rebekah",
        titleZh: "利百加",
        modelPath: "/characters/rebekah/v0/rebekah-lowpoly.glb",
      },
      {
        modelId: "mDtUYHf4udaWdwKEIFD0",
        title: "Samson",
        titleZh: "參孫",
        modelPath: "/characters/samson/v0/samson-lowpoly.glb",
      },
      {
        modelId: "5Qbb7RUxHA1e1eWCWOZV",
        title: "Samuel",
        titleZh: "撒母耳",
        modelPath: "/characters/samuel/v0/samuel-lowpoly.glb",
      },
      {
        modelId: "SbNSRYI9xhPmYJ1wytjM",
        title: "Sarah",
        titleZh: "撒拉",
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
